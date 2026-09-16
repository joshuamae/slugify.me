"""Test premerge provenance, inert template handling, and non-executing AWS plans."""

import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
import io
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "pr_infrastructure", Path(__file__).with_name("check-pr-infrastructure.py"))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

HEAD = "a" * 40
BASE = "b" * 40
STACK_ID = "arn:aws:cloudformation:us-east-1:123456789012:stack/site/stack-id"
CHANGE_SET_NAME = "premerge-staging-12-100-1-0"
CHANGE_SET = f"arn:aws:cloudformation:us-east-1:123456789012:changeSet/{CHANGE_SET_NAME}/new-id"
OLD_CHANGE_SET = "arn:aws:cloudformation:us-east-1:123456789012:changeSet/github-staging-old/old-id"


def pull_request():
    """Describe an open PR whose immutable head belongs to a fork."""
    return {"number": 12, "state": "open",
            "base": {"ref": "main", "sha": BASE, "repo": {"full_name": "owner/site"}},
            "head": {"sha": HEAD, "repo": {"full_name": "contributor/site"}}}


def stack():
    """Return an existing stack without exposing parameter values in reports."""
    return {"StackId": STACK_ID, "StackStatus": "UPDATE_COMPLETE", "CreationTime": "before",
            "ChangeSetId": OLD_CHANGE_SET,
            "Parameters": [{"ParameterKey": "AlertEmail", "ParameterValue": "private@example.invalid"}]}


class PullRequestInfrastructureTests(unittest.TestCase):
    """Exercise failures before credentials and cleanup after permission failures."""

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name) / "candidate"

    def bundle(self, config=None):
        """Construct the exact files that the trusted fetch/prepare stages emit."""
        self.directory.mkdir()
        config = config or preflight.trusted_config()
        context = {"kind": preflight.KIND, "version": 1, "repository": "owner/site",
                   "pr": 12, "head": HEAD, "base": BASE, "files": {}}
        for path in ["infra/deployments.json", *preflight.template_paths(config)]:
            source = preflight.ROOT / path
            content = (json.dumps(config).encode() if path.endswith(".json")
                       else source.read_bytes() if source.exists()
                       else (preflight.ROOT / "infra/site.yaml").read_bytes())
            target = self.directory / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            context["files"][path] = preflight.deployment.digest(content)
        (self.directory / "context.json").write_text(json.dumps(context))
        prepared = {"context": context, "templates": {}}
        for path in preflight.template_paths(config):
            content = json.dumps({"Resources": {"Example": {"Type": "AWS::S3::Bucket"}}}).encode()
            target = self.directory / preflight.prepared_path(path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            prepared["templates"][path] = preflight.deployment.digest(content)
        (self.directory / "prepared.json").write_text(json.dumps(prepared))
        return prepared

    def test_fetch_rejects_stale_or_wrong_pr_identity_before_downloading(self):
        """A trusted workflow must still bind downloads to the exact open PR."""
        changes = [lambda pr: pr["head"].update(sha="c" * 40),
                   lambda pr: pr["base"].update(sha="c" * 40),
                   lambda pr: pr["base"].update(ref="other"),
                   lambda pr: pr["base"]["repo"].update(full_name="other/site"),
                   lambda pr: pr.update(state="closed"),
                   lambda pr: pr.update(number=99)]
        for change in changes:
            value = pull_request()
            change(value)
            with self.subTest(value=value), patch.object(preflight, "github", return_value=value) as api:
                with self.assertRaisesRegex(ValueError, "PR head, base"):
                    preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
                api.assert_called_once_with("/repos/owner/site/pulls/12")
                self.assertFalse(self.directory.exists())

    @staticmethod
    def file_reply(path, content):
        return {"type": "file", "path": path, "encoding": "base64", "size": len(content),
                "content": base64.b64encode(content).decode(),
                "download_url": "https://attacker.invalid/execute-me"}

    def test_fetch_downloads_only_allowlisted_exact_head_data(self):
        """Ignore candidate download URLs and derive fork identity from the PR API."""
        paths = ["infra/deployments.json", *preflight.template_paths(preflight.trusted_config())]
        replies = [pull_request()]
        for path in paths:
            replies.append(self.file_reply(path, (preflight.ROOT / path).read_bytes()))
        with patch.object(preflight, "github", side_effect=replies) as api:
            preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
        self.assertEqual([call.args[0] for call in api.call_args_list[1:]],
                         [f"/repos/contributor/site/contents/{path}?ref={HEAD}" for path in paths])
        self.assertEqual(preflight.load_context(self.directory)["head"], HEAD)

    def test_fetch_plans_new_targets_named_by_the_pull_request(self):
        """A PR can add a stack and template without merging first."""
        config = preflight.trusted_config()
        config["staging"].append({"stack": "static-site-logs", "template": "infra/logs.yaml"})
        paths = preflight.template_paths(config)
        self.assertIn("infra/logs.yaml", paths)
        replies = [pull_request(), self.file_reply("infra/deployments.json", json.dumps(config).encode())]
        replies.extend(self.file_reply(path, b"Resources: {}") for path in paths)
        with patch.object(preflight, "github", side_effect=replies) as api:
            preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
        self.assertIn(f"/repos/contributor/site/contents/infra/logs.yaml?ref={HEAD}",
                      [call.args[0] for call in api.call_args_list])
        self.assertEqual(preflight.candidate_targets(self.directory), config)
        self.assertIn("infra/logs.yaml", preflight.load_context(self.directory)["files"])

    def test_fetch_rejects_unsafe_deployment_targets_before_downloading_templates(self):
        """A candidate config cannot name paths outside infra/ or ambiguous targets."""
        valid = {"stack": "site", "template": "infra/site.yaml"}
        cases = [
            {"staging": [], "production": [valid]},
            {"staging": [valid], "production": [valid], "extra": [valid]},
            {"staging": [{**valid, "template": "infra/../scripts/deploy.yaml"}], "production": [valid]},
            {"staging": [{**valid, "template": "/etc/passwd.yaml"}], "production": [valid]},
            {"staging": [{**valid, "template": "infra/nested/site.yaml"}], "production": [valid]},
            {"staging": [{**valid, "template": "infra/site.json"}], "production": [valid]},
            {"staging": [{**valid, "stack": "bad name"}], "production": [valid]},
            {"staging": [{**valid, "role": "admin"}], "production": [valid]},
            {"staging": [valid, valid], "production": [valid]},
            {"staging": [valid] * 11, "production": [valid]},
        ]
        for config in cases:
            with self.subTest(config=config), \
                    patch.object(preflight, "github", side_effect=[
                        pull_request(), self.file_reply("infra/deployments.json", json.dumps(config).encode())]) as api, \
                    self.assertRaisesRegex(ValueError, "deployment target|staging and production|Duplicate"):
                preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
            self.assertEqual(api.call_count, 2)
            self.assertFalse(self.directory.exists())

    def test_candidate_or_prepared_tampering_stops_before_aws(self):
        """Hashes bind both the original proposed text and the parsed evidence."""
        self.bundle()
        for path in ["infra/site.yaml", preflight.prepared_path("infra/site.yaml")]:
            target = self.directory / path
            original = target.read_bytes()
            target.write_bytes(original + b" ")
            with self.subTest(path=path), patch.object(preflight.deployment, "aws") as api, \
                    self.assertRaisesRegex(ValueError, "changed"):
                preflight.plan(self.directory, "staging", "100-1")
            api.assert_not_called()
            target.write_bytes(original)

    def test_rejects_symlinked_candidate_file(self):
        """Local candidate paths cannot escape into the trusted checkout."""
        self.bundle()
        target = self.directory / "infra/site.yaml"
        target.unlink()
        target.symlink_to(preflight.ROOT / "infra/site.yaml")
        with self.assertRaisesRegex(ValueError, "symlinks"):
            preflight.load_context(self.directory)

    def run_plan(self, no_op=True, event_error=False, wait_error=False, events=None, response=None,
                 created=CHANGE_SET, error=None):
        """Emulate AWS while recording every operation and submitted parameter."""
        self.bundle()
        response = response or {
            "StackId": STACK_ID, "Status": "FAILED" if no_op else "CREATE_COMPLETE",
            "ExecutionStatus": "UNAVAILABLE" if no_op else "AVAILABLE", "Changes": [],
            "StatusReason": preflight.deployment.NO_CHANGES[0] if no_op else ""}
        def api(service, operation, **options):
            self.assertEqual(service, "cloudformation")
            if operation == "validate-template":
                return {"Parameters": [{"ParameterKey": "AlertEmail"}]}
            if operation == "create-change-set":
                self.assertEqual(options["change_set_name"], CHANGE_SET_NAME)
                return {"Id": created}
            if operation == "describe-events" and options.get("change_set_name") == created:
                if event_error:
                    raise RuntimeError("AccessDenied")
                return {"OperationEvents": events or []}
            return {}
        if event_error or wait_error:
            error = error or RuntimeError
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(preflight.deployment, "checked_stack", return_value=stack()), \
                patch.object(preflight.deployment, "wait_for", side_effect=RuntimeError("wait failed") if wait_error else None,
                             return_value=response), \
                patch.object(preflight.deployment, "aws", side_effect=api) as calls, \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            if error:
                with self.assertRaises(error) as raised:
                    preflight.plan(self.directory, "staging", "100-1")
                result = raised.exception
            else:
                result = preflight.plan(self.directory, "staging", "100-1")
        self.output = output.getvalue()
        self.assertNotIn("execute-change-set", [call.args[1] for call in calls.call_args_list])
        # Cleanup targets this preflight's own stack and name, not an ID returned by AWS.
        calls.assert_called_with("cloudformation", "delete-change-set",
                                 stack_name=STACK_ID, change_set_name=CHANGE_SET_NAME)
        return result, calls.call_args_list

    def test_no_op_still_probes_real_events_and_submits_original_yaml(self):
        """Normalization must not cause false IAM policy changes in CloudFormation."""
        result, calls = self.run_plan()
        probe = calls[0]
        self.assertEqual(probe.args, ("cloudformation", "describe-events"))
        self.assertEqual(probe.kwargs, {"stack_name": STACK_ID, "change_set_name": OLD_CHANGE_SET})
        created = next(call for call in calls if call.args[1] == "create-change-set")
        self.assertEqual(created.kwargs["template_body"], "file://" + str(self.directory / "infra/site.yaml"))
        self.assertEqual(created.kwargs["parameters"], [{"ParameterKey": "AlertEmail", "UsePreviousValue": True}])
        self.assertTrue(result["stacks"][0]["noOp"])
        summary = preflight.report(result)
        self.assertIn(HEAD, summary)
        self.assertIn(BASE, summary)
        self.assertNotIn("private@example.invalid", summary)

    def test_permission_failure_cleans_up_without_execution(self):
        """A real DescribeEvents denial fails the check and removes its change set."""
        self.run_plan(no_op=False, event_error=True)

    def test_wait_failure_cleans_up_without_execution(self):
        """A failed or interrupted wait does not leave a normal temporary plan."""
        self.run_plan(no_op=False, wait_error=True)

    def test_validation_failure_names_each_finding_and_cleans_up(self):
        """The raised error carries CloudFormation's reason, not only a generic failure."""
        events = [{"EventType": "VALIDATION_ERROR", "ValidationFailureMode": "FAIL",
                   "LogicalResourceId": "Bucket", "ValidationStatusReason": "Bucket name already exists"},
                  {"EventType": "VALIDATION_ERROR", "ValidationFailureMode": "WARN",
                   "LogicalResourceId": "Alarm", "ValidationStatusReason": "Threshold is unusual"}]
        error, _ = self.run_plan(no_op=False, events=events, error=ValueError)
        self.assertIn("Bucket: Bucket name already exists", str(error))
        self.assertNotIn("Threshold is unusual", str(error))
        self.assertIn("Threshold is unusual", self.output)

    def test_unavailable_change_set_reports_the_aws_reason(self):
        response = {"StackId": STACK_ID, "Status": "FAILED", "ExecutionStatus": "UNAVAILABLE",
                    "StatusReason": "Template error: instance of Fn::GetAtt references undefined resource Missing"}
        error, _ = self.run_plan(no_op=False, response=response, error=ValueError)
        self.assertIn("undefined resource Missing", str(error))

    def test_unexpected_change_set_id_still_deletes_the_preflight_change_set(self):
        error, _ = self.run_plan(created="arn:aws:cloudformation:us-east-1:1:changeSet/other/id", error=ValueError)
        self.assertIn("namespace", str(error))

    def test_cleanup_failure_does_not_hide_the_planning_error(self):
        self.bundle()
        def api(service, operation, **options):
            if operation == "create-change-set":
                return {"Id": CHANGE_SET}
            if operation == "delete-change-set":
                raise RuntimeError("delete denied")
            return {}
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(preflight.deployment, "checked_stack", return_value=stack()), \
                patch.object(preflight.deployment, "wait_for", side_effect=RuntimeError("wait failed")), \
                patch.object(preflight.deployment, "aws", side_effect=api), \
                patch("sys.stderr", new_callable=io.StringIO) as errors, \
                self.assertRaisesRegex(RuntimeError, "wait failed"):
            preflight.plan(self.directory, "staging", "100-1")
        self.assertIn("delete denied", errors.getvalue())

    def test_unreadable_new_stack_explains_bootstrap(self):
        config = preflight.trusted_config()
        config["staging"] = [{"stack": "static-site-new", "template": "infra/site.yaml"}]
        self.bundle(config)
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(preflight.deployment, "checked_stack", side_effect=RuntimeError("AccessDenied")), \
                patch.object(preflight.deployment, "aws") as calls, \
                self.assertRaisesRegex(RuntimeError, "new staging target.*planning role scope.*AccessDenied"):
            preflight.plan(self.directory, "staging", "100-1")
        calls.assert_not_called()

    def test_prepare_applies_monitoring_guard_to_a_renamed_monitoring_template(self):
        """Pointing the monitoring stack at another file cannot skip its Guard rules."""
        config = preflight.trusted_config()
        config["production"] = [{**item, "template": "infra/monitoring-v2.yaml"}
                                if item["template"] == "infra/monitoring.yaml" else item
                                for item in config["production"]]
        self.bundle(config)
        credentials = {"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
                       "AWS_WEB_IDENTITY_TOKEN_FILE", "GH_TOKEN", "GITHUB_TOKEN"}
        environment = {key: value for key, value in os.environ.items() if key not in credentials}
        with patch.dict(os.environ, environment, clear=True), \
                patch.object(preflight, "parse_template",
                             return_value={"Resources": {"Example": {"Type": "AWS::S3::Bucket"}}}), \
                patch.object(preflight, "run_validator") as validators:
            preflight.prepare(self.directory)
        guard = [call.args[0] for call in validators.call_args_list if call.args[1] == "cfn-guard"]
        self.assertEqual([command[-1] for command in guard],
                         [str(self.directory / preflight.prepared_path("infra/monitoring-v2.yaml"))])

    def test_deployment_races_explain_rerunning_the_checks(self):
        """A concurrent deployment is named instead of looking like a template failure."""
        for error in [RuntimeError("cloudformation describe-change-set: An error occurred (ChangeSetNotFound)"),
                      ValueError("static-site-production is not ready: UPDATE_IN_PROGRESS")]:
            with self.subTest(error=error):
                self.assertIn("Rerun the PR checks", str(preflight.with_deployment_hint(error)))
        unrelated = ValueError("Template format error")
        self.assertIs(preflight.with_deployment_hint(unrelated), unrelated)

    def test_failure_output_cannot_inject_workflow_commands(self):
        """Candidate-derived errors stay one escaped annotation line."""
        error = ValueError("bad 100%\n::add-mask::secret\r\n::set-output name=x::y")
        line = preflight.annotation("AWS pre-merge plan (staging)", error)
        self.assertNotIn("\n", line)
        self.assertNotIn("\r", line)
        self.assertTrue(line.startswith("::error title=AWS pre-merge plan (staging)::bad 100%25%0A::add-mask::"))
        report = preflight.failure_report("staging", ValueError("```\n# heading"))
        self.assertNotIn("```\n#", report.split("```text", 1)[1].rsplit("```", 1)[0])
        with patch.dict(os.environ, {"GITHUB_ACTIONS": "true"}), \
                patch("sys.stdout", new_callable=io.StringIO) as output:
            preflight.print_untrusted("::error::spoofed")
        lines = output.getvalue().splitlines()
        self.assertRegex(lines[0], r"^::stop-commands::[0-9a-f]{32}$")
        self.assertEqual(lines[1], "::error::spoofed")
        self.assertEqual(lines[2], "::" + lines[0].rsplit("::", 1)[1] + "::")


@unittest.skipUnless(importlib.util.find_spec("yaml"), "PyYAML is supplied by the infrastructure validator image")
class CandidateParsingTests(unittest.TestCase):
    """Run in the existing credential-free validator image, with no new packages."""

    def test_current_templates_parse_as_inert_cloudformation_data(self):
        for path in preflight.template_paths(preflight.trusted_config()):
            with self.subTest(path=path):
                parsed = preflight.parse_template((preflight.ROOT / path).read_bytes())
                self.assertIn("Resources", parsed)
                json.dumps(parsed, allow_nan=False)

    def test_rejects_macros_custom_resources_and_nested_templates(self):
        cases = [
            b"Transform: AWS::Serverless-2016-10-31\nResources: {Bucket: {Type: 'AWS::S3::Bucket'}}",
            b"Resources: {Bucket: {Type: 'AWS::S3::Bucket', Properties: {Fn::Transform: {Name: bad}}}}",
            b"Resources: {Bad: {Type: 'Custom::Execute'}}",
            b"Resources: {Bad: {Type: 'AWS::CloudFormation::Stack', Properties: {TemplateURL: 'https://bad.invalid'}}}",
            b"Resources: {Bucket: {Type: 'AWS::S3::Bucket'}}\nMetadata: {TemplateURL: 'https://bad.invalid'}",
            b"Resources: {Bad: {Type: 'AWS::CloudFormation::CustomResource'}}",
            b"Resources: {Bad: {Type: 'AWS::Lambda::Function'}}",
            b"Resources: {Bad: {Type: 'AWS::Serverless::Function'}}",
            b"Resources: {Bad: {Type: 'Example::Network::VPC::MODULE'}}",
            b"Resources: {Bad: {Type: 'AWS::S3::Bucket::MODULE'}}",
            b"Resources: {Bad: {Type: 'MongoDB::Atlas::Cluster'}}",
            b"Resources: {Bad: {Type: ['AWS::S3::Bucket']}}",
        ]
        for raw in cases:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                preflight.parse_template(raw)

    def test_accepts_standard_aws_resource_types_before_trusted_code_lists_them(self):
        for resource_type in ["AWS::Logs::LogGroup", "AWS::CloudFront::CachePolicy", "AWS::WAFv2::WebACL"]:
            with self.subTest(resource_type=resource_type):
                raw = f"Resources: {{Example: {{Type: '{resource_type}'}}}}".encode()
                self.assertEqual(preflight.parse_template(raw)["Resources"]["Example"]["Type"], resource_type)

    def test_rejects_duplicate_keys_aliases_and_object_tags(self):
        cases = [
            b"Resources: {}\nResources: {Bucket: {Type: 'AWS::S3::Bucket'}}",
            b"Resources: {Bucket: {Type: 'AWS::S3::Bucket', Type: 'Custom::Execute'}}",
            b"Resources: &cycle {Bucket: *cycle}",
            b"Resources: !!python/object/apply:os.system ['echo unsafe']",
            b"- this is not a template mapping",
            b"Resources: {Bucket: {Type: 'AWS::S3::Bucket'}}\nMetadata: {bad: .nan}",
        ]
        for raw in cases:
            with self.subTest(raw=raw), self.assertRaises((ValueError, Exception)):
                preflight.parse_template(raw)


if __name__ == "__main__":
    unittest.main()
