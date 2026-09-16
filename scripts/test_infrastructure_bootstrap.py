"""Test bootstrap parameter discovery and private file creation without AWS."""

import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "bootstrap", Path(__file__).with_name("prepare-infrastructure-bootstrap.py"))
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)


class InfrastructureBootstrapTests(unittest.TestCase):
    """Keep the staging secret scope separate and files private throughout writes."""

    def test_parameter_file_is_private_before_writing_and_replaces_existing_file(self):
        """Even a permissive umask or existing public file cannot expose new content."""
        for existing in [False, True]:
            with self.subTest(existing=existing), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "parameters.json"
                if existing:
                    output.write_text("previous content")
                    output.chmod(0o644)
                original_dump = json.dump

                def dump(value, stream, **options):
                    self.assertEqual(stat.S_IMODE(os.fstat(stream.fileno()).st_mode), 0o600)
                    return original_dump(value, stream, **options)

                old_umask = os.umask(0)
                try:
                    with patch.object(bootstrap.json, "dump", side_effect=dump):
                        bootstrap.write_parameters(output, {"Environment": "staging"})
                finally:
                    os.umask(old_umask)
                self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
                self.assertEqual(json.loads(output.read_text()), [
                    {"ParameterKey": "Environment", "ParameterValue": "staging"}])
                self.assertTrue(output.read_text().endswith("\n"))
                self.assertEqual(list(Path(directory).iterdir()), [output])

    def test_failed_write_keeps_previous_file_and_removes_temporary_file(self):
        """A failed serialization must not truncate an existing parameter file."""
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "parameters.json"
            output.write_text("previous content")
            with patch.object(bootstrap.json, "dump", side_effect=OSError("write failed")):
                with self.assertRaisesRegex(OSError, "write failed"):
                    bootstrap.write_parameters(output, {"Environment": "staging"})
            self.assertEqual(output.read_text(), "previous content")
            self.assertEqual(list(Path(directory).iterdir()), [output])

    def test_output_symlink_does_not_expose_parameters_in_its_target(self):
        """Replace the destination link instead of writing through it."""
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "public.json"
            target.write_text("leave unchanged")
            output = Path(directory) / "parameters.json"
            output.symlink_to(target)
            bootstrap.write_parameters(output, {"Environment": "staging"})
            self.assertFalse(output.is_symlink())
            self.assertEqual(target.read_text(), "leave unchanged")
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)

    def test_discovery_separates_staging_secret_and_requires_it_for_staging(self):
        """Only staging exports the hosting authentication secret as its own parameter."""
        secret = "arn:aws:secretsmanager:us-east-1:123456789012:secret:staging-auth-example"
        identity = {"Arn": "arn:aws:iam::123456789012:user/operator", "Account": "123456789012"}
        resources = {"StackResourceSummaries": [
            {"ResourceType": "AWS::S3::Bucket", "PhysicalResourceId": "example-bucket"}]}
        for environment, secret_value in [("staging", secret), ("production", secret), ("staging", "")]:
            with self.subTest(environment=environment, secret_value=secret_value), \
                    tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "parameters.json"
                stack = {"StackId": "stack-id", "Parameters": [
                    {"ParameterKey": "StagingAuthSecretArn", "ParameterValue": secret_value}]}
                with patch("sys.argv", ["bootstrap", "--environment", environment,
                                       "--repository", "owner/repo", "--output", str(output)]), \
                        patch.dict(os.environ, {"AWS_REGION": "us-east-1"}), \
                        patch.dict(bootstrap.helpers, {
                            "deployment_config": lambda env: [{"stack": "site", "template": "infra/site.yaml"}],
                            "checked_stack": lambda name: stack}), \
                        patch.object(bootstrap, "aws", side_effect=[identity, resources]), \
                        patch.object(bootstrap.subprocess, "check_output", return_value='{"use_default": true}'):
                    if environment == "staging" and not secret_value:
                        with self.assertRaisesRegex(ValueError, "requires StagingAuthSecretArn"):
                            bootstrap.main()
                        self.assertFalse(output.exists())
                    else:
                        bootstrap.main()
                        values = {item["ParameterKey"]: item["ParameterValue"]
                                  for item in json.loads(output.read_text())}
                        self.assertEqual(values["StagingAuthSecretArn"],
                                         secret if environment == "staging" else "")
                        self.assertEqual(values["ResourceArns"], "arn:aws:s3:::example-bucket")


if __name__ == "__main__":
    unittest.main()
