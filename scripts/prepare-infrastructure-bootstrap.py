"""Discover existing project ARNs and save bootstrap parameters outside the repo.

This reads resource identifiers only; it never retrieves secret values or creates
roles. Review the generated parameters before deploying deployment-roles.yaml.
"""

import argparse
import json
import os
from pathlib import Path
import runpy
import subprocess

helpers = runpy.run_path(str(Path(__file__).with_name("deploy-infrastructure.py")))
aws = helpers["aws"]


def resource_arn(resource, partition, account, region):
    """Map supported stack resource identifiers to their IAM resource ARNs."""
    value = resource["PhysicalResourceId"]
    kind = resource["ResourceType"]
    if kind in {"AWS::S3::BucketPolicy", "AWS::SNS::TopicPolicy",
                "AWS::Route53::RecordSet", "AWS::Route53::RecordSetGroup"}:
        return None
    if value.startswith("arn:"):
        return value
    suffixes = {
        "AWS::S3::Bucket": f"s3:::{value}",
        "AWS::IAM::Role": f"iam::{account}:role/{value}",
        "AWS::CloudFront::Distribution": f"cloudfront::{account}:distribution/{value}",
        "AWS::CloudFront::OriginAccessControl": f"cloudfront::{account}:origin-access-control/{value}",
        "AWS::CloudFront::ResponseHeadersPolicy": f"cloudfront::{account}:response-headers-policy/{value}",
        "AWS::KMS::Key": f"kms:{region}:{account}:key/{value}",
        "AWS::CloudWatch::Alarm": f"cloudwatch:{region}:{account}:alarm:{value}",
        "AWS::Route53::HostedZone": f"route53:::hostedzone/{value.removeprefix('/hostedzone/')}",
    }
    if kind not in suffixes:
        raise ValueError(f"Review the ARN mapping for {kind}")
    return f"arn:{partition}:{suffixes[kind]}"


def main():
    """Collect exact stack and resource scopes without guessing account IDs."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=["staging", "production"], required=True)
    parser.add_argument("--repository", required=True, help="OWNER/REPOSITORY for GitHub OIDC discovery")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(helpers["ROOT"]):
        raise ValueError("Write account-specific parameters outside the repository")
    identity = aws("sts", "get-caller-identity")
    partition = identity["Arn"].split(":")[1]
    account = identity["Account"]
    oidc = json.loads(subprocess.check_output(
        ["gh", "api", f"repos/{args.repository}/actions/oidc/customization/sub"], text=True))
    if not oidc.get("use_default"):
        raise ValueError("Custom OIDC subjects require explicit trust review")
    prefix = oidc.get("sub_claim_prefix", "repo:" + args.repository)
    stacks = []
    resources = set()
    for item in helpers["deployment_config"](args.environment):
        stack = helpers["checked_stack"](item["stack"])
        stacks.append(stack["StackId"])
        for parameter in stack.get("Parameters", []):
            if parameter["ParameterKey"] == "StagingAuthSecretArn" and parameter.get("ParameterValue"):
                resources.add(parameter["ParameterValue"])
        response = aws("cloudformation", "list-stack-resources", stack_name=stack["StackId"])
        for resource in response["StackResourceSummaries"]:
            arn = resource_arn(resource, partition, account, os.environ["AWS_REGION"])
            if arn:
                resources.add(arn)
    values = {"Environment": args.environment, "GitHubOidcSubjectPrefix": prefix,
              "OidcProviderArn": f"arn:{partition}:iam::{account}:oidc-provider/token.actions.githubusercontent.com",
              "StackArns": ",".join(stacks), "ResourceArns": ",".join(sorted(resources))}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps([{"ParameterKey": key, "ParameterValue": value}
                                      for key, value in values.items()], indent=2) + "\n")
    args.output.chmod(0o600)
    print(f"Prepared {len(stacks)} stack scopes and {len(resources)} resource scopes in {args.output}")


if __name__ == "__main__":
    main()
