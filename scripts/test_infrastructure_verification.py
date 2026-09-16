"""Test monitoring notification verification before publishing stack outputs."""

import copy
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import traceback
import unittest
from unittest.mock import call, mock_open, patch

spec = importlib.util.spec_from_file_location(
    "verification", Path(__file__).with_name("verify-infrastructure.py"))
verification = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verification)

TOPIC = "arn:aws:sns:us-east-1:123456789012:monitoring"
OTHER_TOPIC = "arn:aws:sns:us-east-1:123456789012:unrelated"
SUBSCRIPTION = TOPIC + ":00000000-0000-0000-0000-000000000001"
STACK = "example-monitoring"
RECIPIENT = "private-recipient@example.invalid"
ALARM_NAMES = {
    "ProductionRequests": STACK + "-production-requests",
    "StagingRequests": STACK + "-staging-requests",
    "Production4xx": STACK + "-production-4xx",
    "Staging4xx": STACK + "-staging-4xx",
    "Production5xx": STACK + "-production-5xx",
    "Staging5xx": STACK + "-staging-5xx"}
POLICY = {
    "AlarmName": [STACK + "-production-4xx", STACK + "-production-5xx"],
    "$or": [{"NewStateValue": ["ALARM"]},
            {"NewStateValue": ["OK"], "OldStateValue": ["ALARM"]}]}


class InfrastructureVerificationTests(unittest.TestCase):
    """Require all alarm actions and a confirmed email subscription with focused routing."""

    def resources(self):
        """Build the physical identities returned by CloudFormation."""
        return [{"ResourceType": "AWS::CloudWatch::Alarm", "LogicalResourceId": logical_id,
                 "PhysicalResourceId": name} for logical_id, name in ALARM_NAMES.items()] + [
            {"ResourceType": "AWS::SNS::Subscription", "LogicalResourceId": "AlarmEmailSubscription",
             "PhysicalResourceId": SUBSCRIPTION}]

    def attributes(self):
        """Build confirmed SNS attributes, including a private endpoint."""
        return {"SubscriptionArn": SUBSCRIPTION, "TopicArn": TOPIC, "Protocol": "email",
                "PendingConfirmation": "false", "Endpoint": RECIPIENT,
                "FilterPolicyScope": "MessageBody", "FilterPolicy": json.dumps(POLICY)}

    def verify(self, alarms=None, topic=TOPIC, environment="production", resources=None,
               attributes=None, subscription_error=None):
        """Run verification with AWS reads mocked and capture exported settings."""
        hosting = {"Parameters": [{"ParameterKey": "Environment", "ParameterValue": environment}],
                   "Outputs": [{"OutputKey": key, "OutputValue": value} for key, value in {
                       "BucketName": "example-bucket", "DistributionId": "distribution-id",
                       "SiteUrl": "https://example.invalid", "DeployRoleArn": "publisher-role"}.items()]}
        monitoring = {"Outputs": [] if topic is None else [
            {"OutputKey": "AlarmTopicArn", "OutputValue": topic}]}
        distribution = {"Status": "Deployed", "DistributionConfig": {
            "Enabled": True, "Origins": {"Items": [{"OriginAccessControlId": "control-id"}]}}}
        deployments = [{"template": "infra/site.yaml", "stack": "example-hosting"},
                       {"template": "infra/monitoring.yaml", "stack": STACK}]
        stacks = iter([hosting, monitoring])

        def response(service, operation, **options):
            if (service, operation) == ("cloudformation", "list-stack-resources"):
                return {"StackResourceSummaries": self.resources() if resources is None else resources}
            if (service, operation) == ("cloudwatch", "describe-alarms"):
                return {"MetricAlarms": self.alarms() if alarms is None else alarms}
            if (service, operation) == ("sns", "get-subscription-attributes"):
                if subscription_error:
                    raise subscription_error
                return {"Attributes": self.attributes() if attributes is None else attributes}
            self.fail(f"Unexpected AWS read: {service} {operation}")

        self.export = mock_open()
        self.output = io.StringIO()
        with patch.dict(os.environ, {"SITE_ENVIRONMENT": environment, "GITHUB_ENV": "github-env"}), \
                patch.dict(verification.helpers, {
                    "checked_stack": lambda name: next(stacks),
                    "deployment_config": lambda name: deployments}), \
                patch.object(verification, "wait_for", return_value=distribution), \
                patch.object(verification, "aws", side_effect=response) as api, \
                patch("builtins.open", self.export), \
                contextlib.redirect_stdout(self.output), contextlib.redirect_stderr(self.output):
            self.api = api
            verification.main()
        if environment == "staging":
            api.assert_not_called()
        else:
            self.assertEqual(api.call_count, 3)
            self.assertEqual(api.call_args_list[0],
                             call("cloudformation", "list-stack-resources", stack_name=STACK))
            self.assertEqual(api.call_args_list[1].args, ("cloudwatch", "describe-alarms"))
            self.assertCountEqual(api.call_args_list[1].kwargs["alarm_names"], ALARM_NAMES.values())
            self.assertEqual(api.call_args_list[2],
                             call("sns", "get-subscription-attributes", subscription_arn=SUBSCRIPTION))

    def alarms(self):
        """Build six enabled alarms with the correct notification destination."""
        return [{"AlarmName": name, "ActionsEnabled": True,
                 "AlarmActions": [TOPIC], "OKActions": [TOPIC]} for name in ALARM_NAMES.values()]

    def test_expected_topic_allows_publishing_with_additional_actions(self):
        """Additional actions are valid when the expected topic is present too."""
        alarms = self.alarms()
        for alarm in alarms:
            alarm["AlarmActions"].append(OTHER_TOPIC)
            alarm["OKActions"].append(OTHER_TOPIC)
        self.verify(alarms)
        self.export().write.assert_any_call("S3_BUCKET=example-bucket\n")
        self.assertNotIn(RECIPIENT, self.output.getvalue())

    def test_filter_and_resource_order_does_not_change_routing(self):
        """SNS and CloudFormation can serialize equivalent settings in a different order."""
        attributes = self.attributes()
        policy = copy.deepcopy(POLICY)
        policy["AlarmName"].reverse()
        policy["$or"].reverse()
        attributes["FilterPolicy"] = json.dumps(policy, sort_keys=True)
        self.verify(attributes=attributes, resources=list(reversed(self.resources())),
                    alarms=list(reversed(self.alarms())))

    def test_removed_broadened_or_incomplete_filter_stops_publishing(self):
        """Reject staging, traffic, startup OK, incorrect states, and missing incident/recovery routes."""
        policies = [None, {}, [], "invalid policy", {"AlarmName": POLICY["AlarmName"]}]
        for extra_name in [STACK + "-staging-4xx", STACK + "-production-requests",
                           "other-stack-production-5xx", {"prefix": STACK}]:
            policy = copy.deepcopy(POLICY)
            policy["AlarmName"].append(extra_name)
            policies.append(policy)
        policy = copy.deepcopy(POLICY)
        policy["$or"][1].pop("OldStateValue")
        policies.append(policy)
        for route in [0, 1]:
            policy = copy.deepcopy(POLICY)
            policy["$or"].pop(route)
            policies.append(policy)
        for field in ["NewStateValue", "OldStateValue"]:
            policy = copy.deepcopy(POLICY)
            policy["$or"][1][field].append("INSUFFICIENT_DATA")
            policies.append(policy)
        policy = copy.deepcopy(POLICY)
        policy["AlarmName"].pop()
        policies.append(policy)
        policy = copy.deepcopy(POLICY)
        policy["$or"][0]["NewStateValue"] = ["OK"]
        policies.append(policy)
        for policy in policies:
            with self.subTest(policy=policy):
                attributes = self.attributes()
                attributes["FilterPolicy"] = json.dumps(policy)
                with self.assertRaisesRegex(ValueError, "production error and recovery filter"):
                    self.verify(attributes=attributes)
                self.export.assert_not_called()

    def test_missing_malformed_or_wrong_scope_filter_stops_publishing(self):
        """An attribute filter or unparsable body filter cannot prove the intended email routing."""
        for field, value in [("FilterPolicy", None), ("FilterPolicy", "{"), ("FilterPolicy", ""),
                             ("FilterPolicyScope", None), ("FilterPolicyScope", "MessageAttributes")]:
            with self.subTest(field=field, value=value):
                attributes = self.attributes()
                if value is None:
                    attributes.pop(field)
                else:
                    attributes[field] = value
                with self.assertRaisesRegex(ValueError, "production error and recovery filter"):
                    self.verify(attributes=attributes)
                self.export.assert_not_called()

    def test_missing_pending_or_wrong_subscription_resource_stops_publishing(self):
        """Resolve the expected subscription before requesting private SNS attributes."""
        variants = [self.resources()[:-1]]
        for field, value in [("LogicalResourceId", "OtherSubscription"),
                             ("PhysicalResourceId", "PendingConfirmation"),
                             ("PhysicalResourceId", OTHER_TOPIC + ":subscription"),
                             ("PhysicalResourceId", TOPIC + ":"),
                             ("ResourceType", "AWS::SNS::Topic")]:
            resources = self.resources()
            resources[-1][field] = value
            variants.append(resources)
        variants.append(self.resources() + [self.resources()[-1]])
        for resources in variants:
            with self.subTest(resources=resources), self.assertRaisesRegex(ValueError, "confirmed"):
                self.verify(resources=resources)
            self.export.assert_not_called()
            self.assertEqual(self.api.call_count, 2)

    def test_wrong_or_unconfirmed_subscription_attributes_stop_publishing(self):
        """Require the exact SNS subscription, topic and email protocol to be confirmed."""
        for field, value in [("PendingConfirmation", "true"), ("PendingConfirmation", None),
                             ("Protocol", "email-json"), ("TopicArn", OTHER_TOPIC),
                             ("SubscriptionArn", "PendingConfirmation")]:
            with self.subTest(field=field, value=value):
                attributes = self.attributes()
                if value is None:
                    attributes.pop(field)
                else:
                    attributes[field] = value
                with self.assertRaisesRegex(ValueError, "confirmed email"):
                    self.verify(attributes=attributes)
                self.export.assert_not_called()
                self.assertNotIn(RECIPIENT, self.output.getvalue())

    def test_subscription_api_failure_stops_publishing_without_exposing_recipient(self):
        """Do not export settings or leak private subscription details in failure tracebacks."""
        error = RuntimeError(f"AccessDenied: private endpoint {RECIPIENT}")
        try:
            self.verify(subscription_error=error)
        except ValueError as failure:
            self.assertIn("Unable to verify AlarmEmailSubscription", str(failure))
            self.assertNotIn(RECIPIENT, "".join(traceback.format_exception(failure)))
        else:
            self.fail("The unavailable subscription must stop publishing")
        self.export.assert_not_called()
        self.assertNotIn(RECIPIENT, self.output.getvalue())

    def test_wrong_missing_or_empty_action_lists_stop_publishing(self):
        """An unrelated notification action must not pass as operator alerting."""
        for field in ["AlarmActions", "OKActions"]:
            for actions in [[OTHER_TOPIC], [], None]:
                with self.subTest(field=field, actions=actions):
                    alarms = self.alarms()
                    if actions is None:
                        del alarms[-1][field]
                    else:
                        alarms[-1][field] = actions
                    with self.assertRaisesRegex(ValueError, "notifying AlarmTopicArn"):
                        self.verify(alarms)
                    self.export.assert_not_called()

    def test_disabled_wrong_identity_or_wrong_number_of_alarms_stops_publishing(self):
        """Preserve the count and enablement gates and require every expected alarm name."""
        disabled = self.alarms()
        disabled[-1]["ActionsEnabled"] = False
        renamed = self.alarms()
        renamed[-1]["AlarmName"] = "unrelated-alarm"
        duplicate = self.alarms()
        duplicate[-1] = copy.deepcopy(duplicate[0])
        for alarms in [disabled, renamed, duplicate, self.alarms()[:5],
                       self.alarms() + [copy.deepcopy(disabled[0])]]:
            with self.subTest(alarms=alarms), self.assertRaisesRegex(ValueError, "six enabled"):
                self.verify(alarms)
            self.export.assert_not_called()

    def test_wrong_stack_resource_alarm_identities_stop_publishing(self):
        """Do not substitute another alarm or accept a partial stack resource response."""
        variants = [self.resources()[1:], self.resources() + [self.resources()[0]]]
        for field, value in [("LogicalResourceId", "UnrelatedAlarm"),
                             ("PhysicalResourceId", "other-stack-production-4xx")]:
            resources = self.resources()
            resources[0][field] = value
            variants.append(resources)
        for resources in variants:
            with self.subTest(resources=resources), self.assertRaisesRegex(ValueError, "alarm identities"):
                self.verify(resources=resources)
            self.export.assert_not_called()
            self.assertEqual(self.api.call_count, 1)

    def test_missing_topic_output_stops_publishing(self):
        """Fail closed when the expected monitoring destination cannot be determined."""
        for topic in [None, ""]:
            with self.subTest(topic=topic), self.assertRaisesRegex(ValueError, "must expose AlarmTopicArn"):
                self.verify(self.alarms(), topic=topic)
            self.export.assert_not_called()

    def test_staging_does_not_require_production_monitoring(self):
        """Staging exports hosting settings without querying production alarms."""
        self.verify([], environment="staging")
        self.export().write.assert_any_call("CLOUDFRONT_DISTRIBUTION_ID=distribution-id\n")


if __name__ == "__main__":
    unittest.main()
