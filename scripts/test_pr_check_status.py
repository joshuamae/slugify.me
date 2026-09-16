"""Keep privileged preflight results attached to the revision actually tested."""

import copy
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "pr_check", Path(__file__).with_name("pr-infrastructure-check.py"))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)

REPOSITORY = "example/site"
HEAD = "a" * 40
BASE = "b" * 40
RUN_ENV = {"GITHUB_RUN_ID": "500", "GITHUB_RUN_ATTEMPT": "1"}
RUN_URL = f"https://github.com/{REPOSITORY}/actions/runs/500"


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

    def finish_response(self, pr=None, run=None, result="success", identity=None, errors=()):
        run = run or source()
        original = {"name": check.CHECK_NAME, "head_sha": HEAD,
                    "external_id": identity or check.external_id(3, pull(), source())}
        responses = [{"id": 3}, pr or pull(), original, {}]
        with patch.dict(os.environ, RUN_ENV), \
                patch.object(check, "source_run", return_value=run), \
                patch.object(check, "plan_errors", return_value=list(errors)), \
                patch.object(check, "write_outputs") as outputs, \
                patch.object(check, "api", side_effect=responses) as api:
            try:
                check.finish(REPOSITORY, 11, 1, 123, 7, HEAD, BASE, result)
            except SystemExit:
                pass
            self.outputs = outputs.call_args_list
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

    def test_failure_summary_quotes_planner_errors_inertly(self):
        errors = ["plan (staging): Bucket: name already exists", "plan (production): ```\n# injected"]
        result = self.finish_response(result="failure", errors=errors)
        summary = result.args[2]["output"]["summary"]
        self.assertIn("Bucket: name already exists", summary)
        self.assertEqual(summary.count("```"), 2)
        self.assertIn(RUN_URL, summary)
        self.assertEqual([call.args[0] for call in self.outputs], [{"completed": "true"}])

    def test_failed_upstream_summary_points_to_validate_infrastructure(self):
        result = self.finish_response(run={**source(), "conclusion": "failure"}, result="skipped")
        self.assertIn("Validate infrastructure", result.args[2]["output"]["summary"])

    def test_plan_errors_ignore_generic_exit_annotations_and_lookup_failures(self):
        jobs = {"jobs": [{"id": 1, "name": "plan (staging)", "conclusion": "failure"},
                         {"id": 2, "name": "plan (production)", "conclusion": "success"}]}
        annotations = [{"annotation_level": "failure", "message": "Process completed with exit code 1."},
                       {"annotation_level": "failure", "message": "cfn-lint reported problems"},
                       {"annotation_level": "warning", "message": "Node deprecation"}]
        with patch.dict(os.environ, RUN_ENV), patch.object(check, "api", side_effect=[jobs, annotations]) as api:
            self.assertEqual(check.plan_errors(REPOSITORY), ["plan (staging): cfn-lint reported problems"])
        self.assertEqual(api.call_args_list[0].args[0], f"repos/{REPOSITORY}/actions/runs/500/attempts/1/jobs?per_page=100")
        failure = subprocess.CalledProcessError(1, ["gh"])
        with patch.dict(os.environ, RUN_ENV), patch.object(check, "api", side_effect=failure):
            self.assertEqual(check.plan_errors(REPOSITORY), [])

    def begin_with(self, associated, pulls, run=None, default_branch="main"):
        responses = [{"id": 3, "default_branch": default_branch}, {"id": 900}, associated, *pulls, {}, {}]
        if default_branch != "main":
            responses = [responses[0], responses[1], {}]
        with tempfile.NamedTemporaryFile("r") as output, \
                patch.dict(os.environ, {**RUN_ENV, "GITHUB_OUTPUT": output.name}), \
                patch.object(check, "source_run", return_value=run or source()), \
                patch.object(check, "api", side_effect=responses) as api:
            try:
                check.begin(REPOSITORY, 11, 1)
                raised = None
            except ValueError as error:
                raised = error
            return api.call_args_list, output.read(), raised

    def test_begin_publishes_the_check_before_binding_the_pr(self):
        calls, outputs, raised = self.begin_with([{"number": 7}], [pull()])
        self.assertIsNone(raised)
        created = calls[1]
        self.assertEqual(created.args[:2], (f"repos/{REPOSITORY}/check-runs", "POST"))
        self.assertTrue(created.args[2]["external_id"].startswith("premerge-pending:"))
        self.assertEqual(calls[-1].args[2], {"external_id": check.external_id(3, pull(), source())})
        self.assertTrue(outputs.startswith("check-id=900\n"))
        self.assertIn("run-plans=true", outputs)

    def test_begin_reports_binding_failures_on_the_pr(self):
        closed = {**pull(), "state": "closed"}
        calls, outputs, raised = self.begin_with([{"number": 7}], [closed])
        self.assertRegex(str(raised), "found 0")
        final = calls[-1]
        self.assertEqual(final.args[:2], (f"repos/{REPOSITORY}/check-runs/900", "PATCH"))
        self.assertEqual(final.args[2]["conclusion"], "failure")
        self.assertIn("found 0", final.args[2]["output"]["summary"])
        self.assertEqual(outputs, "check-id=900\n")

    def test_begin_rejects_multiple_matching_pull_requests(self):
        other = {**pull(), "number": 8}
        calls, outputs, raised = self.begin_with([{"number": 7}, {"number": 8}], [pull(), other])
        self.assertRegex(str(raised), "found 2")
        self.assertEqual(calls[-1].args[2]["conclusion"], "failure")
        self.assertNotIn("run-plans", outputs)

    def test_begin_rejects_a_default_branch_other_than_main(self):
        calls, outputs, raised = self.begin_with([], [], default_branch="develop")
        self.assertRegex(str(raised), "default branch")
        self.assertEqual([call.args[1] for call in calls[1:]], ["POST", "PATCH"])
        self.assertEqual(calls[-1].args[2]["conclusion"], "failure")
        self.assertNotIn("run-plans", outputs)

    def test_failed_upstream_run_does_not_enable_aws_planning(self):
        calls, outputs, raised = self.begin_with([{"number": 7}], [pull()],
                                                 run={**source(), "conclusion": "failure"})
        self.assertIsNone(raised)
        self.assertIn("run-plans=false", outputs)
        self.assertNotIn("run-plans=true", outputs)

    def test_fail_by_head_completes_this_runs_pending_check_instead_of_adding_one(self):
        runs = {"check_runs": [
            {"id": 900, "name": check.CHECK_NAME, "status": "in_progress", "details_url": RUN_URL},
            {"id": 901, "name": check.CHECK_NAME, "status": "in_progress",
             "details_url": "https://github.com/example/site/actions/runs/1"},
            {"id": 902, "name": check.CHECK_NAME, "status": "completed", "details_url": RUN_URL}]}
        with patch.dict(os.environ, RUN_ENV), patch.object(check, "api", side_effect=[runs, {}]) as api:
            check.fail(REPOSITORY, head=HEAD)
        self.assertEqual([(call.args[0], call.args[1] if len(call.args) > 1 else "GET") for call in api.call_args_list],
                         [(f"repos/{REPOSITORY}/commits/{HEAD}/check-runs?check_name=AWS%20pre-merge&filter=all&per_page=100", "GET"),
                          (f"repos/{REPOSITORY}/check-runs/900", "PATCH")])
        self.assertEqual(api.call_args.args[2]["conclusion"], "failure")

    def test_fail_never_reports_success_or_overwrites_a_result(self):
        with patch.dict(os.environ, RUN_ENV), patch.object(check, "api", return_value={}) as api:
            check.fail(REPOSITORY, head=HEAD)
        body = api.call_args.args[2]
        self.assertEqual((body["head_sha"], body["conclusion"], body["details_url"]), (HEAD, "failure", RUN_URL))
        with patch.dict(os.environ, RUN_ENV), self.assertRaisesRegex(ValueError, "head"):
            check.fail(REPOSITORY, head="main")
        for status, writes in [("in_progress", 1), ("completed", 0)]:
            existing = {"name": check.CHECK_NAME, "status": status}
            with self.subTest(status=status), patch.dict(os.environ, RUN_ENV), \
                    patch.object(check, "api", side_effect=[existing, {}]) as api:
                check.fail(REPOSITORY, check_id=900)
            self.assertEqual(len(api.call_args_list) - 1, writes)
            if writes:
                self.assertEqual(api.call_args.args[2]["conclusion"], "failure")
        with patch.dict(os.environ, RUN_ENV), \
                patch.object(check, "api", return_value={"name": "Other", "status": "in_progress"}), \
                self.assertRaisesRegex(ValueError, "does not belong"):
            check.fail(REPOSITORY, check_id=900)


if __name__ == "__main__":
    unittest.main()
