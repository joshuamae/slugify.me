"""Bind a trusted AWS preflight check to the exact pull request revision."""

import argparse
import json
import os
import re
import subprocess

CHECK_NAME = "AWS pre-merge"
SOURCE_WORKFLOW = ".github/workflows/infrastructure-checks.yaml"


def api(path, method="GET", data=None):
    """Use the job's scoped GitHub token, never a pull request artifact."""
    command = ["gh", "api", path, "--method", method]
    if data is not None:
        command.extend(["--input", "-"])
    result = subprocess.run(command, input=json.dumps(data) if data is not None else None,
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def source_run(repository, run_id, attempt):
    """Check server-side identity instead of trusting names or candidate output."""
    workflow = api(f"repos/{repository}/actions/workflows/infrastructure-checks.yaml")
    run = api(f"repos/{repository}/actions/runs/{run_id}")
    if (run["workflow_id"] != workflow["id"] or run["path"].split("@", 1)[0] != SOURCE_WORKFLOW
            or run["event"] != "pull_request" or run["status"] != "completed"
            or run["repository"]["full_name"] != repository
            or run["run_attempt"] != attempt
            or not re.fullmatch(r"[a-f0-9]{40}", run["head_sha"])):
        raise ValueError("Unexpected upstream workflow identity or revision")
    return run


def matches(pr, run, repository):
    """Only the still-open PR at this run's head can receive its result."""
    return (pr["state"] == "open" and pr["head"]["sha"] == run["head_sha"]
            and pr["base"]["ref"] == "main"
            and pr["base"]["repo"]["full_name"] == repository
            and pr["head"].get("repo") is not None
            and pr["head"]["repo"]["id"] == run["head_repository"]["id"])


def external_id(repository_id, pr, run):
    return (f"premerge:{repository_id}:{pr['number']}:{run['id']}:"
            f"{run['run_attempt']}:{pr['head']['sha']}:{pr['base']['sha']}")


def begin(repository, run_id, attempt):
    """Resolve fresh PR metadata, including fork PRs, and create a pending check."""
    repo = api(f"repos/{repository}")
    if repo["default_branch"] != "main":
        raise ValueError("Review preflight protection before changing the default branch")
    run = source_run(repository, run_id, attempt)
    # Commit association works when workflow_run.pull_requests is empty for a fork.
    associated = api(f"repos/{repository}/commits/{run['head_sha']}/pulls?per_page=100")
    candidates = []
    for item in associated:
        pr = api(f"repos/{repository}/pulls/{int(item['number'])}")
        if matches(pr, run, repository):
            candidates.append(pr)
    if len(candidates) != 1:
        raise ValueError("Expected exactly one current open PR for this upstream run")
    pr = candidates[0]
    if not re.fullmatch(r"[a-f0-9]{40}", pr["base"]["sha"]):
        raise ValueError("Invalid pull request base revision")
    current_run = os.environ["GITHUB_RUN_ID"]
    if not current_run.isdecimal():
        raise ValueError("Invalid preflight run ID")
    check = api(f"repos/{repository}/check-runs", "POST", {
        "name": CHECK_NAME, "head_sha": run["head_sha"], "status": "in_progress",
        "details_url": f"https://github.com/{repository}/actions/runs/{current_run}",
        "external_id": external_id(repo["id"], pr, run),
        "output": {"title": "AWS planning checks", "summary":
                   "Testing the real planning roles without executing changes."}})
    outputs = {"check-id": check["id"], "pr": pr["number"], "head": run["head_sha"],
               "base": pr["base"]["sha"], "run-plans": str(run["conclusion"] == "success").lower()}
    with open(os.environ["GITHUB_OUTPUT"], "a") as handle:
        handle.writelines(f"{key}={value}\n" for key, value in outputs.items())


def finish(repository, run_id, attempt, check_id, pr_number, head, base, result):
    """Never relabel an old run as passing for a newer PR revision."""
    repo = api(f"repos/{repository}")
    run = source_run(repository, run_id, attempt)
    pr = api(f"repos/{repository}/pulls/{pr_number}")
    check = api(f"repos/{repository}/check-runs/{check_id}")
    expected = f"premerge:{repo['id']}:{pr_number}:{run_id}:{attempt}:{head}:{base}"
    if (check["name"] != CHECK_NAME or check["head_sha"] != head
            or check["external_id"] != expected or run["head_sha"] != head):
        raise ValueError("Check provenance does not match this preflight")
    fresh = matches(pr, run, repository) and pr["base"]["sha"] == base
    conclusion = ("cancelled" if not fresh else
                  "success" if result == "success" and run["conclusion"] == "success" else "failure")
    summary = ("Both real planning roles passed template planning, event reads and temporary change-set cleanup. "
               "No changes were executed." if conclusion == "success" else
               "This PR revision did not pass AWS preflight. Inspect the linked workflow and rerun the PR checks.")
    api(f"repos/{repository}/check-runs/{check_id}", "PATCH", {
        "status": "completed", "conclusion": conclusion,
        "output": {"title": f"AWS preflight: {conclusion}", "summary": summary}})
    if conclusion != "success":
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["begin", "finish"])
    parser.add_argument("--repository", required=True)
    parser.add_argument("--run", type=int, required=True)
    parser.add_argument("--attempt", type=int, required=True)
    parser.add_argument("--check-id", type=int)
    parser.add_argument("--pr", type=int)
    parser.add_argument("--head")
    parser.add_argument("--base")
    parser.add_argument("--result", choices=["success", "failure", "cancelled", "skipped"])
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repository):
        parser.error("Invalid repository")
    if args.action == "begin":
        begin(args.repository, args.run, args.attempt)
    else:
        if not all([args.check_id, args.pr, args.head, args.base, args.result]):
            parser.error("Finish requires the original check and PR identity")
        finish(args.repository, args.run, args.attempt, args.check_id, args.pr,
               args.head, args.base, args.result)


if __name__ == "__main__":
    main()
