"""Bind a trusted AWS preflight check to the exact pull request revision."""

import argparse
import json
import os
import re
import subprocess

CHECK_NAME = "AWS pre-merge"
SOURCE_WORKFLOW = ".github/workflows/infrastructure-checks.yaml"
SHA = re.compile(r"[a-f0-9]{40}")
MAX_ERRORS = 10
MAX_ERROR_CHARACTERS = 1500
EXIT_ANNOTATION = re.compile(r"Process completed with exit code \d+\.?")


def api(path, method="GET", data=None):
    """Use the job's scoped GitHub token, never a pull request artifact."""
    command = ["gh", "api", path, "--method", method]
    if data is not None:
        command.extend(["--input", "-"])
    result = subprocess.run(command, input=json.dumps(data) if data is not None else None,
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def write_outputs(values):
    """Append job outputs immediately so later failure handlers can see them."""
    with open(os.environ["GITHUB_OUTPUT"], "a") as handle:
        handle.writelines(f"{key}={value}\n" for key, value in values.items())


def run_url(repository):
    """Link each check to the trusted workflow run that reported it."""
    current_run = os.environ["GITHUB_RUN_ID"]
    if not current_run.isdecimal():
        raise ValueError("Invalid preflight run ID")
    return f"https://github.com/{repository}/actions/runs/{current_run}"


def error_block(messages):
    """Quote AWS and validator text inertly, within GitHub's summary limits."""
    lines = [message.replace("`", "'")[:MAX_ERROR_CHARACTERS] for message in messages[:MAX_ERRORS]]
    return "```text\n" + "\n\n".join(lines) + "\n```\n"


def complete(repository, check_id, conclusion, title, summary):
    """Finish a check run; callers decide the conclusion from trusted evidence."""
    api(f"repos/{repository}/check-runs/{check_id}", "PATCH", {
        "status": "completed", "conclusion": conclusion,
        "output": {"title": title, "summary": summary[:60000]}})


def source_run(repository, run_id, attempt):
    """Check server-side identity instead of trusting names or candidate output."""
    workflow = api(f"repos/{repository}/actions/workflows/infrastructure-checks.yaml")
    run = api(f"repos/{repository}/actions/runs/{run_id}")
    if (run["workflow_id"] != workflow["id"] or run["path"].split("@", 1)[0] != SOURCE_WORKFLOW
            or run["event"] != "pull_request" or run["status"] != "completed"
            or run["repository"]["full_name"] != repository
            or run["run_attempt"] != attempt
            or not SHA.fullmatch(run["head_sha"])):
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
    """Create the check first, then bind it to fresh PR metadata, including fork PRs."""
    repo = api(f"repos/{repository}")
    run = source_run(repository, run_id, attempt)
    url = run_url(repository)
    # A pending identity can never satisfy the required-check rollout helper.
    check = api(f"repos/{repository}/check-runs", "POST", {
        "name": CHECK_NAME, "head_sha": run["head_sha"], "status": "in_progress",
        "details_url": url,
        "external_id": f"premerge-pending:{repo['id']}:{run['id']}:{run['run_attempt']}",
        "output": {"title": "AWS planning checks", "summary":
                   "Testing the real planning roles without executing changes."}})
    write_outputs({"check-id": check["id"]})
    try:
        if repo["default_branch"] != "main":
            raise ValueError("Review preflight protection before changing the default branch")
        # Commit association works when workflow_run.pull_requests is empty for a fork.
        associated = api(f"repos/{repository}/commits/{run['head_sha']}/pulls?per_page=100")
        candidates = []
        for item in associated:
            pr = api(f"repos/{repository}/pulls/{int(item['number'])}")
            if matches(pr, run, repository):
                candidates.append(pr)
        if len(candidates) != 1:
            raise ValueError(f"Expected exactly one current open PR against main for {run['head_sha']}; "
                             f"found {len(candidates)}")
        pr = candidates[0]
        if not SHA.fullmatch(pr["base"]["sha"]):
            raise ValueError("Invalid pull request base revision")
        api(f"repos/{repository}/check-runs/{check['id']}", "PATCH",
            {"external_id": external_id(repo["id"], pr, run)})
    except Exception as error:
        complete(repository, check["id"], "failure", "AWS preflight could not start",
                 "The trusted workflow could not bind this check to the pull request revision.\n\n"
                 + error_block([str(error)]) + f"\nSee the [workflow run]({url}), then rerun the PR checks.")
        raise
    write_outputs({"pr": pr["number"], "head": run["head_sha"], "base": pr["base"]["sha"],
                   "run-plans": str(run["conclusion"] == "success").lower()})


def plan_errors(repository):
    """Collect planner error annotations from this run without letting lookup hide the result."""
    run_id, attempt = os.environ["GITHUB_RUN_ID"], os.environ["GITHUB_RUN_ATTEMPT"]
    if not run_id.isdecimal() or not attempt.isdecimal():
        return []
    messages = []
    try:
        jobs = api(f"repos/{repository}/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100")
        for job in jobs.get("jobs", []):
            if job.get("conclusion") != "failure" or type(job.get("id")) is not int:
                continue
            for item in api(f"repos/{repository}/check-runs/{job['id']}/annotations?per_page=50"):
                message = str(item.get("message", ""))
                if item.get("annotation_level") == "failure" and not EXIT_ANNOTATION.fullmatch(message):
                    messages.append(f"{job.get('name', 'plan')}: {message}")
    except (subprocess.CalledProcessError, ValueError, KeyError, TypeError, AttributeError):
        pass
    return messages


def failure_summary(repository, run):
    """Explain why a revision failed, quoting planner errors when they are available."""
    url = run_url(repository)
    if run["conclusion"] != "success":
        return ("**Validate infrastructure** failed for this revision, so AWS planning did not run. "
                f"Fix that check first. See the [workflow run]({url}).")
    errors = plan_errors(repository)
    summary = "This PR revision did not pass AWS preflight.\n\n"
    if errors:
        summary += error_block(errors) + "\n"
    else:
        summary += "No planner error was recorded; the job may have failed before planning started.\n\n"
    return summary + f"See the [workflow run]({url}) for full logs, then push a fix or rerun the PR checks."


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
    if conclusion == "success":
        summary = ("Both real planning roles passed template planning, event reads and temporary change-set "
                   "cleanup. No changes were executed.")
    elif conclusion == "cancelled":
        summary = "The pull request changed while this check ran. The newer revision receives its own check."
    else:
        summary = failure_summary(repository, run)
    complete(repository, check_id, conclusion, f"AWS preflight: {conclusion}", summary)
    write_outputs({"completed": "true"})
    if conclusion != "success":
        raise SystemExit(1)


def fail(repository, head=None, check_id=None):
    """Report an unexpected workflow failure; this path can never report success."""
    url = run_url(repository)
    title = "AWS preflight could not report a result"
    summary = (f"The trusted AWS pre-merge workflow stopped unexpectedly. See the [workflow run]({url}), "
               "then rerun the PR checks.")
    if check_id:
        check = api(f"repos/{repository}/check-runs/{check_id}")
        if check.get("name") != CHECK_NAME:
            raise ValueError("Check does not belong to this preflight")
        if check.get("status") != "completed":
            complete(repository, check_id, "failure", title, summary)
        return
    if not SHA.fullmatch(head or ""):
        raise ValueError("Invalid head revision")
    api(f"repos/{repository}/check-runs", "POST", {
        "name": CHECK_NAME, "head_sha": head, "status": "completed", "conclusion": "failure",
        "details_url": url, "output": {"title": title, "summary": summary}})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["begin", "finish", "fail"])
    parser.add_argument("--repository", required=True)
    parser.add_argument("--run", type=int)
    parser.add_argument("--attempt", type=int)
    parser.add_argument("--check-id", type=int)
    parser.add_argument("--pr", type=int)
    parser.add_argument("--head")
    parser.add_argument("--base")
    parser.add_argument("--result", choices=["success", "failure", "cancelled", "skipped"])
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repository):
        parser.error("Invalid repository")
    if args.action == "fail":
        if not args.check_id and not args.head:
            parser.error("Fail requires the check ID or head revision")
        fail(args.repository, args.head, args.check_id)
        return
    if not args.run or not args.attempt:
        parser.error("Begin and finish require the upstream run and attempt")
    if args.action == "begin":
        begin(args.repository, args.run, args.attempt)
    else:
        if not all([args.check_id, args.pr, args.head, args.base, args.result]):
            parser.error("Finish requires the original check and PR identity")
        finish(args.repository, args.run, args.attempt, args.check_id, args.pr,
               args.head, args.base, args.result)


if __name__ == "__main__":
    main()
