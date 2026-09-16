"""Test deployment gates without AWS credentials or resource changes."""

import copy
import importlib.util
import io
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "deployment", Path(__file__).with_name("deploy-infrastructure.py"))
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


def stack(updated="before", status="UPDATE_COMPLETE"):
    """Build a stable stack revision with a parameter that must remain private."""
    return {"StackId": "stack-id", "CreationTime": "created", "LastUpdatedTime": updated,
            "StackStatus": status, "Parameters": [{"ParameterKey": "AlertEmail",
                                                       "ParameterValue": "private@example.invalid"}]}


def change(action="Modify", replacement="False"):
    """Build a CloudFormation resource change using API field names."""
    return {"ResourceChange": {"Action": action, "Replacement": replacement,
                               "LogicalResourceId": "Distribution",
                               "ResourceType": "AWS::CloudFront::Distribution", "Scope": ["Properties"]}}


class InfrastructureDeploymentTests(unittest.TestCase):
    """Exercise parameter preservation, approval binding and failed deployments."""

    def test_preserves_parameters_without_copying_values(self):
        """Keep existing values even when the template changes their defaults."""
        result = deployment.previous_parameters(
            [{"ParameterKey": "AlertEmail", "DefaultValue": "new@example.invalid"},
             {"ParameterKey": "NewOptional", "DefaultValue": "safe"}], stack()["Parameters"])
        self.assertEqual(result, [{"ParameterKey": "AlertEmail", "UsePreviousValue": True}])

    def test_rejects_new_required_parameters(self):
        """Require deliberate initialization instead of guessing parameter values."""
        with self.assertRaisesRegex(ValueError, "New required parameter"):
            deployment.previous_parameters([{"ParameterKey": "NewRequired"}], [])

    def test_rejects_removal_and_conditional_replacement(self):
        """Keep deletion and replacement out of automated release promotion."""
        for entry in [change("Remove"), change(replacement="True"),
                      change(replacement="Conditional"), change("Import")]:
            with self.subTest(entry=entry), self.assertRaises(ValueError):
                deployment.inspect_changes([entry])
        self.assertEqual(len(deployment.inspect_changes([change()])), 1)

    def test_rejects_unstable_stacks_and_inherited_service_roles(self):
        """Do not overlap updates or use a more privileged inherited role."""
        for value in [stack(status="UPDATE_IN_PROGRESS"), {**stack(), "RoleARN": "other-role"}]:
            with patch.object(deployment, "read_stack", return_value=value), self.assertRaises(ValueError):
                deployment.checked_stack("site")

    def test_iam_policy_changes_require_administrator_review(self):
        """Allow IAM tag maintenance without allowing privilege escalation."""
        entry = change()
        entry["ResourceChange"]["ResourceType"] = "AWS::IAM::Role"
        entry["ResourceChange"]["Details"] = [{"Target": {"Attribute": "Properties", "Name": "Policies"}}]
        with self.assertRaisesRegex(ValueError, "administrator review"):
            deployment.inspect_changes([entry])
        entry["ResourceChange"]["Details"][0]["Target"]["Name"] = "Tags"
        self.assertEqual(len(deployment.inspect_changes([entry])), 1)

    def saved_plan(self):
        """Build a plan using this checkout's real template checksum."""
        config = deployment.deployment_config("staging")[0]
        return {"version": 1, "environment": "staging", "commit": "a" * 40,
                "run": "1-1", "region": "us-east-1", "stacks": [{**config,
                    "stackVersion": deployment.stack_version(stack()), "changeSet": "plan-id",
                    "templateSha256": deployment.digest((deployment.ROOT / config["template"]).read_bytes()),
                    "noOp": False, "changes": deployment.inspect_changes([change()])}]}

    def test_rejects_cross_run_or_modified_plans(self):
        """Bind approval to the exact commit, run, region, environment and template."""
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}):
            good = self.saved_plan()
            deployment.validate_plan(good, "staging", "a" * 40, "1-1")
            for key in ["version", "environment", "commit", "run", "region"]:
                bad = {**good, key: "different"}
                with self.subTest(key=key), self.assertRaises(ValueError):
                    deployment.validate_plan(bad, "staging", "a" * 40, "1-1")
            bad = copy.deepcopy(good)
            bad["stacks"][0]["templateSha256"] = "different"
            with self.assertRaisesRegex(ValueError, "Template differs"):
                deployment.validate_plan(bad, "staging", "a" * 40, "1-1")

    def test_stale_stack_stops_before_execution(self):
        """Detect changes made while production approval was pending."""
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(deployment, "checked_stack", return_value=stack("after")), \
                patch.object(deployment, "aws") as api:
            with self.assertRaisesRegex(ValueError, "changed after planning"):
                deployment.apply(self.saved_plan(), "staging", "a" * 40, "1-1")
            api.assert_not_called()

    def test_rejects_plans_whose_stack_list_differs(self):
        """Reject approval covering a different set of stacks."""
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}):
            saved = self.saved_plan()
            saved["stacks"] = []
            with self.assertRaisesRegex(ValueError, "Plan stack list differs"):
                deployment.validate_plan(saved, "staging", "a" * 40, "1-1")

    def test_rejects_changes_that_differ_from_the_plan(self):
        """Never execute live changes that the reviewer did not approve."""
        response = {"StackId": "stack-id", "Status": "CREATE_COMPLETE",
                    "ExecutionStatus": "AVAILABLE", "Changes": [change("Add")]}
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(deployment, "checked_stack", return_value=stack()), \
                patch.object(deployment, "aws", return_value=response) as api:
            with self.assertRaisesRegex(ValueError, "differ from the reviewed plan"):
                deployment.apply(self.saved_plan(), "staging", "a" * 40, "1-1")
            self.assertEqual([call.args[1] for call in api.call_args_list], ["describe-change-set"])

    def test_validation_blocks_failures_but_reports_and_allows_warnings(self):
        """A warning may accompany a usable change set; a FAIL finding stops it."""
        response = {"Status": "CREATE_COMPLETE", "ExecutionStatus": "AVAILABLE",
                    "Changes": [change()]}
        for modes in [[], ["WARN"], ["FAIL"], ["WARN", "FAIL"]]:
            events = [{"EventType": "VALIDATION_ERROR", "ValidationFailureMode": mode,
                       "ValidationStatusReason": f"{mode} finding"} for mode in modes]
            events.append({"EventType": "RESOURCE_STATUS", "ValidationFailureMode": "FAIL"})
            with self.subTest(modes=modes), \
                    patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                    patch.object(deployment, "checked_stack", return_value=stack()), \
                    patch.object(deployment, "wait_for", return_value=response), \
                    patch.object(deployment, "aws", side_effect=[
                        {}, {"Id": "plan-id"}, {"OperationEvents": events}]), \
                    patch("sys.stdout", new_callable=io.StringIO) as output:
                if "FAIL" in modes:
                    with self.assertRaisesRegex(ValueError, "validation findings"):
                        deployment.plan("staging", "a" * 40, "1-1")
                else:
                    saved = deployment.plan("staging", "a" * 40, "1-1")
                    self.assertFalse(saved["stacks"][0]["noOp"])
                    self.assertEqual(saved["stacks"][0]["changeSet"], "plan-id")
                for mode in modes:
                    self.assertIn(f"{mode} finding", output.getvalue())

    def test_no_op_does_not_execute(self):
        """Treat only CloudFormation's explicit no-change failure as a no-op."""
        saved = self.saved_plan()
        saved["stacks"][0]["noOp"] = True
        response = {"StackId": "stack-id", "Status": "FAILED",
                    "StatusReason": "The submitted information didn't contain changes."}
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(deployment, "checked_stack", return_value=stack()), \
                patch.object(deployment, "aws", return_value=response) as api:
            deployment.apply(saved, "staging", "a" * 40, "1-1")
            self.assertEqual([call.args[1] for call in api.call_args_list],
                             ["describe-change-set", "delete-change-set"])
            response["StatusReason"] = "Access denied"
            with self.assertRaisesRegex(ValueError, "No-op plan"):
                deployment.apply(saved, "staging", "a" * 40, "1-1")

    def test_rollback_completion_is_a_failed_deployment(self):
        """Never publish the new website after CloudFormation rolls back."""
        response = {"StackId": "stack-id", "Status": "CREATE_COMPLETE",
                    "ExecutionStatus": "AVAILABLE", "Changes": [change()]}
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(deployment, "checked_stack", return_value=stack()), \
                patch.object(deployment, "aws", return_value=response), \
                patch.object(deployment, "wait_for", return_value=stack("after", "UPDATE_ROLLBACK_COMPLETE")):
            with self.assertRaisesRegex(ValueError, "publishing stopped"):
                deployment.apply(self.saved_plan(), "staging", "a" * 40, "1-1")

    def test_success_waits_for_new_stack_revision(self):
        """Ignore an eventually consistent pre-update success status."""
        response = {"StackId": "stack-id", "Status": "CREATE_COMPLETE",
                    "ExecutionStatus": "AVAILABLE", "Changes": [change()]}
        def wait(fetch, finished, timeout):
            self.assertFalse(finished(stack()))
            self.assertFalse(finished(stack("after", "UPDATE_IN_PROGRESS")))
            self.assertTrue(finished(stack("after")))
            return stack("after")
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(deployment, "checked_stack", return_value=stack()), \
                patch.object(deployment, "aws", return_value=response), \
                patch.object(deployment, "wait_for", side_effect=wait):
            deployment.apply(self.saved_plan(), "staging", "a" * 40, "1-1")


if __name__ == "__main__":
    unittest.main()
