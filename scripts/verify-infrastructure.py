"""Verify deployed hosting and monitoring, then use fresh stack outputs to publish."""

import json
import os
from pathlib import Path
import runpy

helpers = runpy.run_path(str(Path(__file__).with_name("deploy-infrastructure.py")))
aws = helpers["aws"]
wait_for = helpers["wait_for"]


def main():
    """Require stable infrastructure and an enabled, private-origin distribution."""
    environment = os.environ["SITE_ENVIRONMENT"]
    deployments = helpers["deployment_config"](environment)
    site = next(item for item in deployments if item["template"] == "infra/site.yaml")
    stack = helpers["checked_stack"](site["stack"])
    parameters = {item["ParameterKey"]: item.get("ParameterValue")
                  for item in stack["Parameters"]}
    if parameters.get("Environment") != environment:
        raise ValueError("Hosting stack environment does not match this deployment")
    outputs = {item["OutputKey"]: item["OutputValue"] for item in stack["Outputs"]}
    distribution = wait_for(
        lambda: aws("cloudfront", "get-distribution", id=outputs["DistributionId"])["Distribution"],
        lambda value: value["Status"] == "Deployed")
    config = distribution["DistributionConfig"]
    if not config["Enabled"] or any(not origin.get("OriginAccessControlId")
                                    for origin in config["Origins"]["Items"]):
        raise ValueError("Distribution must be enabled with authenticated origin access")
    if environment == "production":
        monitoring = next(item for item in deployments if item["template"] == "infra/monitoring.yaml")
        monitoring_stack = helpers["checked_stack"](monitoring["stack"])
        topic = next((item["OutputValue"] for item in monitoring_stack.get("Outputs", [])
                      if item["OutputKey"] == "AlarmTopicArn"), None)
        if not topic:
            raise ValueError("Monitoring stack must expose AlarmTopicArn")
        resources = aws("cloudformation", "list-stack-resources", stack_name=monitoring["stack"])
        alarm_names = [item["PhysicalResourceId"] for item in resources["StackResourceSummaries"]
                       if item["ResourceType"] == "AWS::CloudWatch::Alarm"]
        alarms = aws("cloudwatch", "describe-alarms", alarm_names=alarm_names)["MetricAlarms"]
        if len(alarms) != 6 or any(not alarm["ActionsEnabled"]
                                   or topic not in alarm.get("AlarmActions", [])
                                   or topic not in alarm.get("OKActions", []) for alarm in alarms):
            raise ValueError("Expected six enabled monitoring alarms notifying AlarmTopicArn")
    settings = {"S3_BUCKET": outputs["BucketName"],
                "CLOUDFRONT_DISTRIBUTION_ID": outputs["DistributionId"],
                "SITE_URL": outputs["SiteUrl"], "SITE_PUBLISH_ROLE_ARN": outputs["DeployRoleArn"]}
    if any("\n" in value or "\r" in value for value in settings.values()):
        raise ValueError("Invalid stack output")
    with open(os.environ["GITHUB_ENV"], "a") as stream:
        for key, value in settings.items():
            stream.write(f"{key}={value}\n")
    print(json.dumps({"environment": environment, "distributionStatus": distribution["Status"]}))


if __name__ == "__main__":
    main()
