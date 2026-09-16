"""Test monitoring notification verification before publishing stack outputs."""

import copy
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import mock_open, patch

spec = importlib.util.spec_from_file_location(
    "verification", Path(__file__).with_name("verify-infrastructure.py"))
verification = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verification)

TOPIC = "arn:aws:sns:us-east-1:123456789012:monitoring"
OTHER_TOPIC = "arn:aws:sns:us-east-1:123456789012:unrelated"


class InfrastructureVerificationTests(unittest.TestCase):
    """Require all six enabled alarms to notify the configured topic in both states."""

    def verify(self, alarms, topic=TOPIC, environment="production"):
        """Run verification with AWS reads mocked and capture exported settings."""
        hosting = {"Parameters": [{"ParameterKey": "Environment", "ParameterValue": environment}],
                   "Outputs": [{"OutputKey": key, "OutputValue": value} for key, value in {
                       "BucketName": "example-bucket", "DistributionId": "distribution-id",
                       "SiteUrl": "https://example.invalid", "DeployRoleArn": "publisher-role"}.items()]}
        monitoring = {"Outputs": [] if topic is None else [
            {"OutputKey": "AlarmTopicArn", "OutputValue": topic}]}
        distribution = {"Status": "Deployed", "DistributionConfig": {
            "Enabled": True, "Origins": {"Items": [{"OriginAccessControlId": "control-id"}]}}}
        resources = {"StackResourceSummaries": [
            {"ResourceType": "AWS::CloudWatch::Alarm", "PhysicalResourceId": f"alarm-{index}"}
            for index in range(6)]}
        stacks = iter([hosting, monitoring])
        self.export = mock_open()
        with patch.dict(os.environ, {"SITE_ENVIRONMENT": environment, "GITHUB_ENV": "github-env"}), \
                patch.dict(verification.helpers, {"checked_stack": lambda name: next(stacks)}), \
                patch.object(verification, "wait_for", return_value=distribution), \
                patch.object(verification, "aws", side_effect=[resources, {"MetricAlarms": alarms}]) as api, \
                patch("builtins.open", self.export):
            verification.main()
            if environment == "staging":
                api.assert_not_called()
            else:
                self.assertEqual(api.call_args.kwargs["alarm_names"],
                                 [f"alarm-{index}" for index in range(6)])

    def alarms(self):
        """Build six enabled alarms with the correct notification destination."""
        return [{"ActionsEnabled": True, "AlarmActions": [TOPIC], "OKActions": [TOPIC]}
                for _ in range(6)]

    def test_expected_topic_allows_publishing_with_additional_actions(self):
        """Additional actions are valid when the expected topic is present too."""
        alarms = self.alarms()
        for alarm in alarms:
            alarm["AlarmActions"].append(OTHER_TOPIC)
            alarm["OKActions"].append(OTHER_TOPIC)
        self.verify(alarms)
        self.export().write.assert_any_call("S3_BUCKET=example-bucket\n")

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

    def test_disabled_or_wrong_number_of_alarms_stops_publishing(self):
        """Destination verification preserves the existing count and enablement gates."""
        disabled = self.alarms()
        disabled[-1]["ActionsEnabled"] = False
        for alarms in [disabled, self.alarms()[:5], self.alarms() + [copy.deepcopy(disabled[0])]]:
            with self.subTest(alarms=alarms), self.assertRaisesRegex(ValueError, "six enabled"):
                self.verify(alarms)
            self.export.assert_not_called()

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
