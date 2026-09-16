"""Plan and apply existing CloudFormation stacks from one reviewed Git commit.

Uses the AWS CLI and Python standard library. Planning never executes changes.
Saved plans contain no parameter values; existing values remain in CloudFormation.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
STABLE = {"CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"}
NO_CHANGES = (
    "The submitted information didn't contain changes.",
    "No updates are to be performed.",
)


def digest(value):
    """Fingerprint bytes without exposing the content in the plan."""
    return hashlib.sha256(value).hexdigest()


def aws(service, operation, **options):
    """Call AWS without a shell and return decoded JSON or raise on failure."""
    command = ["aws", service, operation, "--region", os.environ["AWS_REGION"],
               "--output", "json", "--no-cli-pager"]
    for key, value in options.items():
        command.extend(["--" + key.replace("_", "-"),
                        json.dumps(value) if isinstance(value, (list, dict)) else str(value)])
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{service} {operation}: {result.stderr.strip()}")
    return json.loads(result.stdout or "{}")


def stack_version(stack):
    """Identify the exact stack revision inspected before approval."""
    return [stack["StackId"], stack.get("LastUpdatedTime", stack["CreationTime"])]


def previous_parameters(definitions, current):
    """Preserve existing parameters, allowing only defaults for new parameters."""
    existing = {item["ParameterKey"] for item in current}
    result = []
    for definition in definitions:
        key = definition["ParameterKey"]
        if key in existing:
            result.append({"ParameterKey": key, "UsePreviousValue": True})
        elif "DefaultValue" not in definition:
            raise ValueError(f"New required parameter {key}: bootstrap its value before automation")
    return result


def inspect_changes(changes):
    """Reject deletions and definite or conditional replacements before execution."""
    result = []
    for entry in changes:
        resource = entry["ResourceChange"]
        action = resource["Action"]
        replacement = resource.get("Replacement", "False")
        if action not in {"Add", "Modify"} or replacement != "False":
            raise ValueError(f"Manual migration required: {resource['LogicalResourceId']} "
                             f"{action}, replacement={replacement}")
        if resource["ResourceType"].startswith("AWS::IAM::"):
            properties = [detail["Target"].get("Name") for detail in resource.get("Details", [])
                          if detail["Target"].get("Attribute") == "Properties"]
            if action == "Add" or ("Properties" in resource.get("Scope", []) and
                                   (not properties or any(name != "Tags" for name in properties))):
                raise ValueError("IAM permission and trust changes require administrator review")
        result.append({key: resource.get(key) for key in
                       ("Action", "LogicalResourceId", "ResourceType", "Replacement", "Scope")})
    return result


def wait_for(fetch, finished, timeout=1200):
    """Poll a bounded operation, leaving AWS rollback enabled on timeout."""
    deadline = time.monotonic() + timeout
    while True:
        result = fetch()
        if finished(result):
            return result
        if time.monotonic() >= deadline:
            raise TimeoutError("AWS operation is still running; inspect it before retrying")
        time.sleep(10)


def read_stack(name):
    """Read one existing stack; never infer that an API error means a new stack."""
    return aws("cloudformation", "describe-stacks", stack_name=name)["Stacks"][0]


def checked_stack(name):
    """Require a stable stack without an inherited, more privileged service role."""
    stack = read_stack(name)
    if stack["StackStatus"] not in STABLE:
        raise ValueError(f"{name} is not ready: {stack['StackStatus']}")
    if stack.get("RoleARN"):
        raise ValueError(f"{name} has a service role; review pipeline permissions before adopting it")
    return stack


def deployment_config(environment):
    """Load the checked-in list of stacks and reject paths outside infrastructure."""
    config = json.loads((ROOT / "infra/deployments.json").read_text())[environment]
    for item in config:
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]{0,127}", item["stack"]):
            raise ValueError("Invalid stack name")
        template = (ROOT / item["template"]).resolve()
        if not template.is_relative_to(ROOT / "infra") or template.suffix != ".yaml":
            raise ValueError("Templates must be YAML files inside infra/")
    return config


def plan(environment, commit, run):
    """Create inspectable UPDATE change sets while preserving all stack parameters."""
    result = {"version": 1, "environment": environment, "commit": commit,
              "run": run, "region": os.environ["AWS_REGION"], "stacks": []}
    for index, item in enumerate(deployment_config(environment)):
        stack = checked_stack(item["stack"])
        path = ROOT / item["template"]
        schema = aws("cloudformation", "validate-template", template_body="file://" + str(path))
        created = aws("cloudformation", "create-change-set", stack_name=stack["StackId"],
                      change_set_name=f"github-{environment}-{run}-{index}",
                      change_set_type="UPDATE", template_body="file://" + str(path),
                      capabilities=["CAPABILITY_NAMED_IAM"],
                      parameters=previous_parameters(schema.get("Parameters", []),
                                                     stack.get("Parameters", [])),
                      description=f"Git commit {commit}; Actions run {run}")
        change_set = wait_for(
            lambda: aws("cloudformation", "describe-change-set", change_set_name=created["Id"]),
            lambda value: value["Status"] in {"CREATE_COMPLETE", "FAILED"})
        events = aws("cloudformation", "describe-events", change_set_name=created["Id"])
        findings = [event for event in events.get("OperationEvents", [])
                    if event.get("EventType") == "VALIDATION_ERROR"]
        if findings:
            for finding in findings:
                print(json.dumps({key: finding.get(key) for key in
                      ("ValidationName", "ValidationFailureMode", "LogicalResourceId",
                       "ValidationPath", "ValidationStatusReason")}))
            raise ValueError("CloudFormation validation findings require review before deployment")
        no_op = (change_set["Status"] == "FAILED" and
                 any(reason in change_set.get("StatusReason", "") for reason in NO_CHANGES))
        if not no_op and (change_set["Status"] != "CREATE_COMPLETE" or
                          change_set["ExecutionStatus"] != "AVAILABLE"):
            raise ValueError(change_set.get("StatusReason", "Change set is unavailable"))
        changes = inspect_changes(change_set.get("Changes", []))
        result["stacks"].append({**item, "stackVersion": stack_version(stack),
                                 "templateSha256": digest(path.read_bytes()),
                                 "changeSet": created["Id"], "noOp": no_op,
                                 "changes": changes})
    return result


def validate_plan(saved, environment, commit, run):
    """Bind an immutable plan to this run, environment, region, config and commit."""
    expected = {"version": 1, "environment": environment, "commit": commit,
                "run": run, "region": os.environ["AWS_REGION"]}
    if any(saved.get(key) != value for key, value in expected.items()):
        raise ValueError("Plan does not belong to this deployment")
    if [{"stack": item["stack"], "template": item["template"]}
        for item in saved["stacks"]] != deployment_config(environment):
        raise ValueError("Plan stack list differs from this commit")
    for item in saved["stacks"]:
        if digest((ROOT / item["template"]).read_bytes()) != item["templateSha256"]:
            raise ValueError("Template differs from the reviewed plan")


def apply(saved, environment, commit, run):
    """Execute only the reviewed change sets and require successful stack updates."""
    validate_plan(saved, environment, commit, run)
    # Check every stack before executing any of them, including no-op plans.
    for item in saved["stacks"]:
        if stack_version(checked_stack(item["stack"])) != item["stackVersion"]:
            raise ValueError(f"{item['stack']} changed after planning; create a fresh run")
    for item in saved["stacks"]:
        current = aws("cloudformation", "describe-change-set", change_set_name=item["changeSet"])
        if current["StackId"] != item["stackVersion"][0]:
            raise ValueError("Change set targets a different stack")
        if item["noOp"]:
            if current["Status"] != "FAILED" or not any(
                    reason in current.get("StatusReason", "") for reason in NO_CHANGES):
                raise ValueError("No-op plan no longer matches AWS")
            print(f"{item['stack']}: no resource updates")
            aws("cloudformation", "delete-change-set", change_set_name=item["changeSet"])
            continue
        if current["Status"] != "CREATE_COMPLETE" or current["ExecutionStatus"] != "AVAILABLE":
            raise ValueError("Change set is no longer executable; create a fresh run")
        if inspect_changes(current.get("Changes", [])) != item["changes"]:
            raise ValueError("AWS changes differ from the reviewed plan")
        aws("cloudformation", "execute-change-set", change_set_name=item["changeSet"],
            client_request_token=f"github-{environment}-{run}-{item['stack']}")
        updated = wait_for(lambda: read_stack(item["stack"]),
                           lambda value: stack_version(value) != item["stackVersion"] and
                           not value["StackStatus"].endswith("_IN_PROGRESS"),
                           timeout=2100)
        if updated["StackStatus"] != "UPDATE_COMPLETE":
            raise ValueError(f"{item['stack']}: {updated['StackStatus']}; publishing stopped")
        print(f"{item['stack']}: UPDATE_COMPLETE")


def report(saved):
    """Render a parameter-free review summary for the GitHub approval screen."""
    lines = [f"## {saved['environment'].title()} infrastructure plan", "",
             f"Commit: `{saved['commit']}`", ""]
    for item in saved["stacks"]:
        lines.extend([f"### {item['stack']}", "",
                      "| Stack | Resource | Action | Replacement |",
                      "| --- | --- | --- | --- |"])
        lines.extend(f"| {item['stack']} | {change['LogicalResourceId']} | "
                     f"{change['Action']} | {change['Replacement'] or 'False'} |"
                     for change in item["changes"])
        if item["noOp"]:
            lines.append(f"| {item['stack']} | — | No resource updates | — |")
        lines.extend(["", f"Change set: `{item['changeSet']}`", ""])
    return "\n".join(lines) + "\n"


def main():
    """Dispatch planning or execution with explicit GitHub provenance."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["plan", "apply"])
    parser.add_argument("--environment", choices=["staging", "production"], required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--sha256")
    args = parser.parse_args()
    commit = os.environ["GITHUB_SHA"]
    run = os.environ["GITHUB_RUN_ID"] + "-" + os.environ["GITHUB_RUN_ATTEMPT"]
    if os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise ValueError("Infrastructure deployment requires main")
    if not re.fullmatch(r"[a-f0-9]{40}", commit) or not re.fullmatch(r"\d+-\d+", run):
        raise ValueError("Invalid GitHub provenance")
    if args.action == "plan":
        saved = plan(args.environment, commit, run)
        args.plan.parent.mkdir(parents=True, exist_ok=True)
        args.plan.write_text(json.dumps(saved, indent=2) + "\n")
        summary = report(saved)
        print(summary)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
                stream.write(summary)
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
                stream.write(f"sha256={digest(args.plan.read_bytes())}\n")
    else:
        if digest(args.plan.read_bytes()) != args.sha256:
            raise ValueError("Plan artifact checksum does not match the planning job")
        apply(json.loads(args.plan.read_text()), args.environment, commit, run)


if __name__ == "__main__":
    main()
