"""Keep privileged preflight results attached to the revision actually tested."""

import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "pr_check", Path(__file__).with_name("pr-infrastructure-check.py"))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)

REPOSITORY = "example/site"
HEAD = "a" * 40
BASE = "b" * 40


def source():
    return {"id": 11, "workflow_id": 22, "path": check.SOURCE_WORKFLOW,
            "event": "pull_request", "status": "completed", "conclusion": "success",
            "repository": {"full_name": REPOSITORY}, "run_attempt": 1,
            "head_sha": HEAD, "head_repository": {"id": 42}}


def pull():
    return {"number": 7, "state": "open", "head": {"sha": HEAD, "repo": {"id": 42}},
            "base": {"ref": "main", "sha": BASE, "repo": {"full_name": REPOSITORY}}}


class PreMergeStatusTests(unittest.TestCase):
    def test_source_path_accepts_github_ref_suffix(self):
        run = {**source(), "path": check.SOURCE_WORKFLOW + "@refs/pull/7/merge"}
        with patch.object(check, "api", side_effect=[{"id": 22}, run]):
            self.assertEqual(check.source_run(REPOSITORY, 11, 1), run)

    def test_source_identity_rejects_other_workflows_events_and_attempts(self):
        for key, value in [("workflow_id", 99), ("path", "untrusted.yaml"),
                           ("event", "push"), ("run_attempt", 2),
                           ("status", "in_progress"), ("head_sha", "not-a-sha")]:
            run = {**source(), key: value}
            with self.subTest(key=key), patch.object(check, "api", side_effect=[{"id": 22}, run]):
                with self.assertRaises(ValueError):
                    check.source_run(REPOSITORY, 11, 1)

    def test_only_current_open_pr_in_the_expected_repository_matches(self):
        valid = pull()
        self.assertTrue(check.matches(valid, source(), REPOSITORY))
        for path, value in [("state", "closed"), ("head.sha", "c" * 40),
                            ("head.repo", None), ("head.repo.id", 99),
                            ("base.ref", "other"), ("base.repo.full_name", "other/repo")]:
            pr = copy.deepcopy(valid)
            target = pr
            keys = path.split(".")
            for key in keys[:-1]:
                target = target[key]
            target[keys[-1]] = value
            with self.subTest(path=path):
                self.assertFalse(check.matches(pr, source(), REPOSITORY))

    def finish_response(self, pr=None, run=None, result="success", identity=None):
        run = run or source()
        original = {"name": check.CHECK_NAME, "head_sha": HEAD,
                    "external_id": identity or check.external_id(3, pull(), source())}
        responses = [{"id": 3}, pr or pull(), original, {}]
        with patch.object(check, "source_run", return_value=run), \
                patch.object(check, "api", side_effect=responses) as api:
            try:
                check.finish(REPOSITORY, 11, 1, 123, 7, HEAD, BASE, result)
            except SystemExit:
                pass
            return api.call_args

    def test_success_requires_both_environment_plans(self):
        result = self.finish_response()
        self.assertEqual(result.args[2]["conclusion"], "success")
        for outcome in ["failure", "cancelled", "skipped"]:
            with self.subTest(outcome=outcome):
                result = self.finish_response(result=outcome)
                self.assertEqual(result.args[2]["conclusion"], "failure")

    def test_failed_upstream_cannot_be_reported_as_success(self):
        result = self.finish_response(run={**source(), "conclusion": "failure"})
        self.assertEqual(result.args[2]["conclusion"], "failure")

    def test_changed_head_or_base_cancels_the_old_check(self):
        for side in ["head", "base"]:
            pr = pull()
            pr[side]["sha"] = "c" * 40
            result = self.finish_response(pr=pr)
            self.assertEqual(result.args[0], f"repos/{REPOSITORY}/check-runs/123")
            self.assertEqual(result.args[2]["conclusion"], "cancelled")

    def test_wrong_check_identity_fails_before_any_success_write(self):
        with self.assertRaisesRegex(ValueError, "provenance"):
            self.finish_response(identity="premerge:another-run")


if __name__ == "__main__":
    unittest.main()
