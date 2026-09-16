"""Test required-check registration without changing GitHub settings."""

import contextlib
import copy
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "required_checks", Path(__file__).with_name("configure-required-checks.py"))
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)

REPOSITORY = "example/site"
APP = 123
HEAD = "a" * 40
BASE = "b" * 40


def ruleset():
    """Include unrelated rules, bypasses and parameters that an update must preserve."""
    return {"id": 20, "source_type": "Repository", "source": REPOSITORY,
            "name": "main", "target": "branch", "enforcement": "active",
            "bypass_actors": [{"actor_type": "Team", "actor_id": 42, "bypass_mode": "pull_request"}],
            "conditions": {"ref_name": {"include": ["refs/heads/main"], "exclude": []}},
            "rules": [{"type": "non_fast_forward"},
                      {"type": "pull_request", "parameters": {"required_approving_review_count": 1}},
                      {"type": "required_status_checks", "parameters": {
                          "strict_required_status_checks_policy": False,
                          "do_not_enforce_on_create": True,
                          "required_status_checks": [{"context": "Other check", "integration_id": 456}]}}]}


class RequiredCheckTests(unittest.TestCase):
    """Add only the requested gates and require real observed source identities."""

    def test_merge_preserves_existing_rules_checks_and_bypasses(self):
        original = ruleset()
        proposed = checks.require_checks(original, dict.fromkeys(checks.BASE_CHECKS, APP))
        self.assertEqual(original, ruleset())
        self.assertEqual(proposed["bypass_actors"], original["bypass_actors"])
        self.assertEqual(proposed["conditions"], original["conditions"])
        self.assertEqual(proposed["rules"][:2], original["rules"][:2])
        parameters = proposed["rules"][-1]["parameters"]
        self.assertTrue(parameters["strict_required_status_checks_policy"])
        self.assertTrue(parameters["do_not_enforce_on_create"])
        self.assertEqual(parameters["required_status_checks"], [
            {"context": "Other check", "integration_id": 456},
            {"context": "Check and build", "integration_id": APP},
            {"context": "Validate infrastructure", "integration_id": APP}])
        self.assertEqual(checks.require_checks(proposed, dict.fromkeys(checks.BASE_CHECKS, APP)), proposed)

    def test_adds_missing_rule_and_pins_existing_any_source_context(self):
        original = ruleset()
        original["rules"] = original["rules"][:2]
        proposed = checks.require_checks(original, {"Check and build": APP})
        proposed["rules"][-1]["parameters"]["required_status_checks"][0].pop("integration_id")
        pinned = checks.require_checks(proposed, {"Check and build": APP})
        self.assertEqual(pinned["rules"][-1]["parameters"]["required_status_checks"], [
            {"context": "Check and build", "integration_id": APP}])

    def test_conflicting_check_source_and_hidden_bypasses_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "different app source"):
            checks.require_checks(ruleset(), {"Other check": APP})
        original = ruleset()
        original.pop("bypass_actors")
        with self.assertRaisesRegex(ValueError, "preserve the complete ruleset"):
            checks.require_checks(original, {"Check and build": APP})

    def test_main_ruleset_requires_an_unambiguous_repository_source(self):
        rule = {"ruleset_id": 20, "ruleset_source_type": "Repository", "ruleset_source": REPOSITORY}
        with patch.object(checks, "pages", return_value=[rule]), \
                patch.object(checks, "gh_api", return_value=ruleset()):
            self.assertEqual(checks.main_ruleset(REPOSITORY)[0], 20)
        for rules in [[], [rule, {**rule, "ruleset_id": 21}],
                      [{**rule, "ruleset_source_type": "Organization"}]]:
            with self.subTest(rules=rules), patch.object(checks, "pages", return_value=rules), \
                    self.assertRaisesRegex(ValueError, "one active repository ruleset"):
                checks.main_ruleset(REPOSITORY)

    def test_observes_app_from_the_named_workflows_check_suite(self):
        run = {"workflow_id": 7, "event": "pull_request", "status": "completed", "check_suite_id": 8}
        check = {"name": "Check and build", "status": "completed", "app": {"slug": "github-actions", "id": APP}}
        with patch.object(checks, "workflow_on_main", return_value={"id": 7}), \
                patch.object(checks, "gh_api", return_value={"workflow_runs": [run]}), \
                patch.object(checks, "pages", return_value=[check]) as pages:
            self.assertEqual(checks.observed_check_app(REPOSITORY, "Check and build", "code-quality.yaml"), APP)
            self.assertIn("check-suites/8/check-runs", pages.call_args.args[0])
        with self.assertRaisesRegex(ValueError, "GitHub Actions"):
            checks.actions_app({**check, "app": {"id": 999, "slug": "another-app"}}, "Check and build")

    def test_dry_run_never_updates_github(self):
        with patch("sys.argv", ["configure-required-checks.py", "--repository", REPOSITORY, "--dry-run"]), \
                patch.object(checks, "main_ruleset", return_value=(20, ruleset())), \
                patch.object(checks, "observed_check_app", return_value=APP), \
                patch.object(checks, "gh_api") as api, contextlib.redirect_stdout(io.StringIO()):
            checks.main()
            api.assert_not_called()

    def test_concurrent_ruleset_changes_stop_before_mutation(self):
        original = ruleset()
        changed = copy.deepcopy(original)
        changed["bypass_actors"] = []
        with patch("sys.argv", ["configure-required-checks.py", "--repository", REPOSITORY]), \
                patch.object(checks, "main_ruleset", return_value=(20, original)), \
                patch.object(checks, "observed_check_app", return_value=APP), \
                patch.object(checks, "gh_api", return_value=changed) as api, \
                self.assertRaisesRegex(ValueError, "changed during review"):
            checks.main()
        self.assertEqual(api.call_count, 1)

    def test_apply_writes_complete_payload_and_verifies_preservation(self):
        original = ruleset()
        proposed = checks.require_checks(original, dict.fromkeys(checks.BASE_CHECKS, APP))
        actual = {**original, **proposed}
        with patch("sys.argv", ["configure-required-checks.py", "--repository", REPOSITORY]), \
                patch.object(checks, "main_ruleset", return_value=(20, original)), \
                patch.object(checks, "observed_check_app", return_value=APP), \
                patch.object(checks, "gh_api", side_effect=[original, actual, actual]) as api, \
                contextlib.redirect_stdout(io.StringIO()):
            checks.main()
            self.assertEqual(api.call_args_list[1].args, (f"repos/{REPOSITORY}/rulesets/20", proposed))


class AwsGateBootstrapTests(unittest.TestCase):
    """Keep AWS gating unavailable until the trusted workflow has run for a current PR."""

    def fixtures(self):
        pull = {"number": 4, "state": "open", "head": {"sha": HEAD},
                "base": {"sha": BASE, "ref": "main", "repo": {"id": 99}}}
        run = {"workflow_id": 9, "event": "workflow_run", "head_branch": "main", "status": "completed",
               "conclusion": "success", "repository": {"id": 99},
               "html_url": f"https://github.com/{REPOSITORY}/actions/runs/10",
               "created_at": "2026-09-16T12:00:00Z", "updated_at": "2026-09-16T12:05:00Z"}
        check = {"name": checks.AWS_CHECK, "status": "completed", "conclusion": "success",
                 "head_sha": HEAD, "app": {"slug": "github-actions", "id": APP},
                 "details_url": run["html_url"], "external_id": f"premerge:99:4:8:1:{HEAD}:{BASE}",
                 "completed_at": "2026-09-16T12:04:00Z"}
        source = {"workflow_id": 7, "event": "pull_request", "status": "completed",
                  "conclusion": "success", "run_attempt": 1, "head_sha": HEAD, "repository": {"id": 99}}
        return {"pull": pull, "current": copy.deepcopy(pull), "run": run, "check": check, "source": source}

    def observe(self, data):
        def api(path):
            if path == f"repos/{REPOSITORY}":
                return {"id": 99}
            if "/workflows/9/runs?" in path:
                return {"workflow_runs": [data["run"]]}
            if path.endswith("actions/runs/8"):
                return data["source"]
            if path.endswith("pulls/4"):
                return data["current"]
            self.fail(f"Unexpected API call: {path}")

        with patch.object(checks, "workflow_on_main", side_effect=lambda repo, file: {
                "id": 9 if file == checks.AWS_WORKFLOW else 7}), \
                patch.object(checks, "gh_api", side_effect=api), \
                patch.object(checks, "pages", side_effect=lambda path, key=None: [
                    data["check"] if "/check-runs?" in path else data["pull"]]):
            return checks.observed_aws_check_app(REPOSITORY, APP)

    def test_successful_current_pr_check_can_enable_aws_gate(self):
        self.assertEqual(self.observe(self.fixtures()), APP)

    def test_missing_main_workflow_blocks_activation(self):
        with patch.object(checks, "workflow_on_main", side_effect=RuntimeError("not on main")), \
                self.assertRaisesRegex(RuntimeError, "not on main"):
            checks.observed_aws_check_app(REPOSITORY, APP)

    def test_stale_wrong_source_or_unsuccessful_checks_cannot_enable_gate(self):
        mutations = [
            ("run", "head_branch", "feature"), ("run", "workflow_id", 999),
            ("run", "conclusion", "failure"), ("source", "event", "push"),
            ("source", "run_attempt", 2), ("source", "head_sha", "c" * 40),
            ("check", "conclusion", "failure"), ("check", "head_sha", "c" * 40),
            ("check", "external_id", "unbound"), ("check", "details_url", "https://example.invalid"),
            ("check", "completed_at", "2026-09-15T12:00:00Z"),
            ("current", "state", "closed"), ("current", "head", {"sha": "c" * 40})]
        for section, key, value in mutations:
            with self.subTest(section=section, key=key):
                data = self.fixtures()
                data[section][key] = value
                with self.assertRaisesRegex(ValueError, "AWS pre-merge"):
                    self.observe(data)


if __name__ == "__main__":
    unittest.main()
