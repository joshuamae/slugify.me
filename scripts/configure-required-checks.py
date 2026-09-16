"""Preserve the existing main ruleset while requiring observed GitHub Actions checks.

Requires GitHub CLI authentication with repository administration access. Use
--dry-run to inspect the complete update body before changing GitHub settings.
"""

import argparse
import copy
from datetime import datetime
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlencode

BASE_CHECKS = {
    "Check and build": "code-quality.yaml",
    "Validate infrastructure": "infrastructure-checks.yaml"}
AWS_CHECK = "AWS pre-merge"
AWS_WORKFLOW = "aws-pre-merge.yaml"
WRITABLE_FIELDS = ("name", "target", "enforcement", "bypass_actors", "conditions", "rules")


def gh_api(path, payload=None):
    """Use argument arrays and a JSON file; never interpolate shell commands."""
    command = ["gh", "api", path, "-H", "Accept: application/vnd.github+json",
               "-H", "X-GitHub-Api-Version: 2022-11-28"]
    with tempfile.TemporaryDirectory(prefix="required-checks-") as directory:
        if payload is not None:
            body = Path(directory) / "update.json"
            body.write_text(json.dumps(payload))
            command.extend(["--method", "PUT", "--input", str(body)])
        result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"GitHub API request failed: {result.stderr.strip()}")
    return json.loads(result.stdout)


def pages(path, key=None):
    """Read complete API lists, retaining filters already present in the URL."""
    separator = "&" if "?" in path else "?"
    page = 1
    while True:
        response = gh_api(f"{path}{separator}per_page=100&page={page}")
        values = response[key] if key else response
        yield from values
        if len(values) < 100:
            return
        page += 1


def ruleset_payload(ruleset):
    """Copy every writable field, requiring visibility of private bypass settings."""
    if any(field not in ruleset for field in WRITABLE_FIELDS):
        raise ValueError("Cannot preserve the complete ruleset; administration access is required")
    return {field: copy.deepcopy(ruleset[field]) for field in WRITABLE_FIELDS}


def main_ruleset(repository):
    """Resolve the one active repository-owned ruleset applying to main."""
    sources = {rule["ruleset_id"]
               for rule in pages(f"repos/{repository}/rules/branches/main")
               if rule.get("ruleset_source_type") == "Repository"
               and rule.get("ruleset_source", "").lower() == repository.lower()}
    if len(sources) != 1:
        raise ValueError("Expected one active repository ruleset protecting main; review the rulesets manually")
    ruleset_id = sources.pop()
    ruleset = gh_api(f"repos/{repository}/rulesets/{ruleset_id}")
    if ruleset.get("source_type") != "Repository" \
            or ruleset.get("source", "").lower() != repository.lower() \
            or ruleset.get("target") != "branch" or ruleset.get("enforcement") != "active":
        raise ValueError("The main ruleset must be active and owned by this repository")
    ruleset_payload(ruleset)
    return ruleset_id, ruleset


def workflow_on_main(repository, filename):
    """Require the trusted workflow to exist on main before making its check mandatory."""
    path = f".github/workflows/{filename}"
    file = gh_api(f"repos/{repository}/contents/{path}?ref=main")
    workflow = gh_api(f"repos/{repository}/actions/workflows/{filename}")
    if file.get("type") != "file" or file.get("path") != path \
            or workflow.get("path") != path or workflow.get("state") != "active":
        raise ValueError(f"Required workflow must be an active file on main: {filename}")
    return workflow


def actions_app(check, context):
    """Discover the Actions app ID from an actual check, never from a fixed numeric ID."""
    app = check.get("app", {})
    if check.get("name") != context or check.get("status") != "completed" \
            or app.get("slug") != "github-actions" or type(app.get("id")) is not int or app["id"] <= 0:
        raise ValueError(f"Expected a completed GitHub Actions check: {context}")
    return app["id"]


def observed_check_app(repository, context, filename):
    """Resolve each existing check through the real workflow's recorded check suite."""
    workflow = workflow_on_main(repository, filename)
    runs = gh_api(f"repos/{repository}/actions/workflows/{workflow['id']}/runs?"
                  + urlencode({"event": "pull_request", "status": "completed", "per_page": 30}))
    for run in runs["workflow_runs"]:
        if run.get("workflow_id") != workflow["id"] or run.get("event") != "pull_request" \
                or run.get("status") != "completed":
            continue
        checks = pages(f"repos/{repository}/check-suites/{run['check_suite_id']}/check-runs?"
                       + urlencode({"check_name": context, "filter": "all"}), "check_runs")
        for check in checks:
            if check.get("name") == context and check.get("status") == "completed":
                return actions_app(check, context)
    raise ValueError(f"No completed pull-request check was observed for {context}")


def observed_aws_check_app(repository, app_id):
    """Require live, successful AWS-check evidence before enabling its merge gate.

    GitHub app pinning identifies GitHub Actions, not an individual workflow.
    Run metadata and the current PR head prevent accidental premature activation;
    they are not a cryptographic defense against another workflow with checks:write.
    """
    workflow = workflow_on_main(repository, AWS_WORKFLOW)
    source_workflow = workflow_on_main(repository, "infrastructure-checks.yaml")
    repo = gh_api(f"repos/{repository}")
    response = gh_api(f"repos/{repository}/actions/workflows/{workflow['id']}/runs?"
                      + urlencode({"event": "workflow_run", "status": "success", "per_page": 30}))
    runs = {run["html_url"]: run for run in response["workflow_runs"]
            if run.get("workflow_id") == workflow["id"] and run.get("event") == "workflow_run"
            and run.get("head_branch") == "main" and run.get("status") == "completed"
            and run.get("conclusion") == "success" and run.get("repository", {}).get("id") == repo["id"]}
    if not runs:
        raise ValueError("AWS pre-merge must successfully run from main before its check is required")
    for pull in pages(f"repos/{repository}/pulls?state=open&base=main&sort=updated&direction=desc"):
        checks = pages(f"repos/{repository}/commits/{pull['head']['sha']}/check-runs?"
                       + urlencode({"check_name": AWS_CHECK, "filter": "all"}), "check_runs")
        for check in checks:
            run = runs.get(check.get("details_url"))
            identity = re.fullmatch(r"premerge:(\d+):(\d+):(\d+):(\d+):([a-f0-9]{40}):([a-f0-9]{40})",
                                    check.get("external_id") or "")
            if not run or not identity or check.get("conclusion") != "success" \
                    or check.get("status") != "completed":
                continue
            repository_id, number, source_id, attempt, head, base = identity.groups()
            if int(repository_id) != repo["id"] or int(number) != pull["number"] \
                    or check.get("head_sha") != head or pull["head"]["sha"] != head \
                    or pull["base"]["sha"] != base or actions_app(check, AWS_CHECK) != app_id:
                continue
            try:
                start = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
                finish = datetime.fromisoformat(run["updated_at"].replace("Z", "+00:00"))
                checked = datetime.fromisoformat(check["completed_at"].replace("Z", "+00:00"))
            except (KeyError, ValueError, TypeError):
                continue
            if not start <= checked <= finish:
                continue
            source = gh_api(f"repos/{repository}/actions/runs/{source_id}")
            current = gh_api(f"repos/{repository}/pulls/{number}")
            if source.get("workflow_id") != source_workflow["id"] \
                    or source.get("event") != "pull_request" or source.get("status") != "completed" \
                    or source.get("conclusion") != "success" or source.get("run_attempt") != int(attempt) \
                    or source.get("head_sha") != head or source.get("repository", {}).get("id") != repo["id"]:
                continue
            if current.get("state") == "open" and current.get("head", {}).get("sha") == head \
                    and current.get("base", {}).get("sha") == base \
                    and current.get("base", {}).get("ref") == "main" \
                    and current["base"].get("repo", {}).get("id") == repo["id"]:
                return app_id
    raise ValueError("No successful AWS pre-merge check matches a current open PR and trusted workflow run")


def require_checks(ruleset, observed):
    """Merge required contexts without removing unrelated rules, checks or bypass actors."""
    result = ruleset_payload(ruleset)
    matches = [rule for rule in result["rules"] if rule["type"] == "required_status_checks"]
    if len(matches) > 1:
        raise ValueError("Multiple required-status-check rules need manual review")
    if matches:
        rule = matches[0]
    else:
        rule = {"type": "required_status_checks", "parameters": {
            "required_status_checks": [], "strict_required_status_checks_policy": True}}
        result["rules"].append(rule)
    parameters = rule["parameters"]
    checks = parameters["required_status_checks"]
    for context, app_id in observed.items():
        matches = [check for check in checks if check["context"] == context]
        if len(matches) > 1:
            raise ValueError(f"Duplicate required check needs manual review: {context}")
        if matches:
            if matches[0].get("integration_id") not in (None, app_id):
                raise ValueError(f"Required check has a different app source: {context}")
            matches[0]["integration_id"] = app_id
        else:
            checks.append({"context": context, "integration_id": app_id})
    parameters["strict_required_status_checks_policy"] = True
    return result


def main():
    """Preview or apply a narrowly scoped update after checking live source identities."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, help="GitHub owner/repository")
    parser.add_argument("--include-aws", action="store_true",
                        help="Require AWS pre-merge after its trusted workflow has successfully run")
    parser.add_argument("--dry-run", action="store_true", help="Print the update JSON without changing GitHub")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repository):
        raise ValueError("Repository must be owner/repository")
    ruleset_id, original = main_ruleset(args.repository)
    observed = {context: observed_check_app(args.repository, context, filename)
                for context, filename in BASE_CHECKS.items()}
    if len(set(observed.values())) != 1:
        raise ValueError("Existing checks disagree about the GitHub Actions app identity")
    if args.include_aws:
        observed[AWS_CHECK] = observed_aws_check_app(args.repository, next(iter(observed.values())))
    proposed = require_checks(original, observed)
    if args.dry_run:
        print(json.dumps(proposed, indent=2))
        return
    path = f"repos/{args.repository}/rulesets/{ruleset_id}"
    fresh = gh_api(path)
    if fresh != original:
        raise ValueError("The ruleset changed during review; rerun before applying")
    gh_api(path, proposed)
    actual = gh_api(path)
    if require_checks(actual, observed) != ruleset_payload(actual):
        raise ValueError("GitHub did not retain the required checks; inspect the ruleset")
    expected_other = {key: value for key, value in proposed.items() if key != "rules"}
    if any(actual.get(key) != value for key, value in expected_other.items()):
        raise ValueError("GitHub returned different ruleset settings; inspect the ruleset")
    original_other_rules = [rule for rule in original["rules"] if rule["type"] != "required_status_checks"]
    actual_other_rules = [rule for rule in actual["rules"] if rule["type"] != "required_status_checks"]
    if actual_other_rules != original_other_rules:
        raise ValueError("GitHub returned different unrelated rules; inspect the ruleset")
    expected_parameters = next(rule["parameters"] for rule in proposed["rules"]
                               if rule["type"] == "required_status_checks")
    actual_parameters = next(rule["parameters"] for rule in actual["rules"]
                             if rule["type"] == "required_status_checks")
    if any(actual_parameters.get(key) != value for key, value in expected_parameters.items()):
        raise ValueError("GitHub returned different required-check settings; inspect the ruleset")
    print(json.dumps({"ruleset_id": ruleset_id, "required_checks": list(observed), "strict": True}))


if __name__ == "__main__":
    main()
