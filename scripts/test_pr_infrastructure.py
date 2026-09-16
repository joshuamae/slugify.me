"""Test premerge provenance, inert template handling, and non-executing AWS plans."""

import base64
import copy
import importlib.util
import json
import os
from pathlib import Path
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
CHANGE_SET = "arn:aws:cloudformation:us-east-1:123456789012:changeSet/github-staging-pr-12-100-1-0/new-id"
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

    def bundle(self):
        """Construct the exact files that the trusted fetch/prepare stages emit."""
        self.directory.mkdir()
        context = {"kind": preflight.KIND, "version": 1, "repository": "owner/site",
                   "pr": 12, "head": HEAD, "base": BASE, "files": {}}
        for path in ["infra/deployments.json", *preflight.template_paths()]:
            content = (preflight.ROOT / path).read_bytes()
            target = self.directory / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            context["files"][path] = preflight.deployment.digest(content)
        (self.directory / "context.json").write_text(json.dumps(context))
        prepared = {"context": context, "templates": {}}
        for path in preflight.template_paths():
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

    def test_fetch_downloads_only_allowlisted_exact_head_data(self):
        """Ignore candidate download URLs and derive fork identity from the PR API."""
        paths = ["infra/deployments.json", *preflight.template_paths()]
        replies = [pull_request()]
        for path in paths:
            content = (preflight.ROOT / path).read_bytes()
            replies.append({"type": "file", "path": path, "encoding": "base64", "size": len(content),
                            "content": base64.b64encode(content).decode(),
                            "download_url": "https://attacker.invalid/execute-me"})
        with patch.object(preflight, "github", side_effect=replies) as api:
            preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
        self.assertEqual([call.args[0] for call in api.call_args_list[1:]],
                         [f"/repos/contributor/site/contents/{path}?ref={HEAD}" for path in paths])
        self.assertEqual(preflight.load_context(self.directory)["head"], HEAD)

    def test_fetch_rejects_changed_deployment_targets(self):
        """A candidate config cannot select a new stack or local executable file."""
        replies = [pull_request()]
        for path in ["infra/deployments.json", *preflight.template_paths()]:
            content = b'{"staging":[],"production":[]}' if path.endswith(".json") else (preflight.ROOT / path).read_bytes()
            replies.append({"type": "file", "path": path, "encoding": "base64", "size": len(content),
                            "content": base64.b64encode(content).decode()})
        with patch.object(preflight, "github", side_effect=replies), \
                self.assertRaisesRegex(ValueError, "deployment targets"):
            preflight.fetch("owner/site", 12, HEAD, BASE, self.directory)
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

    def run_plan(self, no_op=True, event_error=False, wait_error=False):
        """Emulate AWS while recording every operation and submitted parameter."""
        self.bundle()
        response = {"StackId": STACK_ID, "Status": "FAILED" if no_op else "CREATE_COMPLETE",
                    "ExecutionStatus": "UNAVAILABLE" if no_op else "AVAILABLE", "Changes": [],
                    "StatusReason": preflight.deployment.NO_CHANGES[0] if no_op else ""}
        def api(service, operation, **options):
            self.assertEqual(service, "cloudformation")
            if operation == "validate-template":
                return {"Parameters": [{"ParameterKey": "AlertEmail"}]}
            if operation == "create-change-set":
                return {"Id": CHANGE_SET}
            if operation == "describe-events" and options.get("change_set_name") == CHANGE_SET and event_error:
                raise RuntimeError("AccessDenied")
            return {}
        with patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                patch.object(preflight.deployment, "checked_stack", return_value=stack()), \
                patch.object(preflight.deployment, "wait_for", side_effect=RuntimeError("wait failed") if wait_error else None,
                             return_value=response), \
                patch.object(preflight.deployment, "aws", side_effect=api) as calls:
            if event_error or wait_error:
                with self.assertRaises(RuntimeError):
                    preflight.plan(self.directory, "staging", "100-1")
                result = None
            else:
                result = preflight.plan(self.directory, "staging", "100-1")
        self.assertNotIn("execute-change-set", [call.args[1] for call in calls.call_args_list])
        calls.assert_called_with("cloudformation", "delete-change-set", change_set_name=CHANGE_SET)
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


@unittest.skipUnless(importlib.util.find_spec("yaml"), "PyYAML is supplied by the infrastructure validator image")
class CandidateParsingTests(unittest.TestCase):
    """Run in the existing credential-free validator image, with no new packages."""

    def test_current_templates_parse_as_inert_cloudformation_data(self):
        for path in preflight.template_paths():
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
        ]
        for raw in cases:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                preflight.parse_template(raw)

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
