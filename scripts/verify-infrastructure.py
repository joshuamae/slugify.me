"""Verify deployed hosting and monitoring, then use fresh stack outputs to publish."""

import json
import os
from pathlib import Path
import runpy

helpers = runpy.run_path(str(Path(__file__).with_name("deploy-infrastructure.py")))
aws = helpers["aws"]
wait_for = helpers["wait_for"]


def canonical_policy(value):
    """Compare JSON filter structure without depending on object or list order."""
    if isinstance(value, dict):
        value = {key: canonical_policy(item) for key, item in value.items()}
    elif isinstance(value, list):
        value = sorted(canonical_policy(item) for item in value)
    return json.dumps(value, sort_keys=True)


def verify_monitoring(stack_name, stack):
    """Keep alarm history while limiting email to production errors and recovery."""
    topic = next((item["OutputValue"] for item in stack.get("Outputs", [])
                  if item["OutputKey"] == "AlarmTopicArn"), None)
    if not topic:
        raise ValueError("Monitoring stack must expose AlarmTopicArn")
    expected_alarms = {
        environment.title() + metric: f"{stack_name}-{environment}-{suffix}"
        for environment in ("production", "staging")
        for metric, suffix in (("Requests", "requests"), ("4xx", "4xx"), ("5xx", "5xx"))}
    resources = aws("cloudformation", "list-stack-resources", stack_name=stack_name)[
        "StackResourceSummaries"]
    alarm_resources = [item for item in resources
                       if item["ResourceType"] == "AWS::CloudWatch::Alarm"]
    if len(alarm_resources) != 6 or {
            item.get("LogicalResourceId"): item.get("PhysicalResourceId")
            for item in alarm_resources} != expected_alarms:
        raise ValueError("Expected six monitoring alarm identities from the configured stack")
    alarm_names = list(expected_alarms.values())
    alarms = aws("cloudwatch", "describe-alarms", alarm_names=alarm_names)["MetricAlarms"]
    if len(alarms) != 6 or {alarm.get("AlarmName") for alarm in alarms} != set(alarm_names) \
            or any(not alarm.get("ActionsEnabled")
                   or topic not in alarm.get("AlarmActions", [])
                   or topic not in alarm.get("OKActions", []) for alarm in alarms):
        raise ValueError("Expected six enabled monitoring alarms notifying AlarmTopicArn")
    subscriptions = [item for item in resources
                     if item.get("LogicalResourceId") == "AlarmEmailSubscription"
                     and item["ResourceType"] == "AWS::SNS::Subscription"]
    subscription_arn = subscriptions[0].get("PhysicalResourceId", "") if len(subscriptions) == 1 else ""
    if not subscription_arn.startswith(topic + ":") or not subscription_arn[len(topic) + 1:]:
        raise ValueError("Expected a confirmed AlarmEmailSubscription on AlarmTopicArn")
    try:
        attributes = aws("sns", "get-subscription-attributes", subscription_arn=subscription_arn)[
            "Attributes"]
    except (RuntimeError, KeyError):
        # CLI diagnostics can contain subscription details; never print the recipient.
        raise ValueError("Unable to verify AlarmEmailSubscription attributes") from None
    if attributes.get("SubscriptionArn") != subscription_arn \
            or attributes.get("TopicArn") != topic or attributes.get("Protocol") != "email" \
            or attributes.get("PendingConfirmation") != "false":
        raise ValueError("Expected a confirmed email AlarmEmailSubscription on AlarmTopicArn")
    expected_policy = {
        "AlarmName": [expected_alarms["Production4xx"], expected_alarms["Production5xx"]],
        "$or": [{"NewStateValue": ["ALARM"]},
                {"NewStateValue": ["OK"], "OldStateValue": ["ALARM"]}]}
    try:
        policy = json.loads(attributes.get("FilterPolicy", ""))
    except (json.JSONDecodeError, TypeError):
        raise ValueError("AlarmEmailSubscription must have the production error and recovery filter") from None
    if attributes.get("FilterPolicyScope") != "MessageBody" \
            or canonical_policy(policy) != canonical_policy(expected_policy):
        raise ValueError("AlarmEmailSubscription must have the production error and recovery filter")


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
        verify_monitoring(monitoring["stack"], monitoring_stack)
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
