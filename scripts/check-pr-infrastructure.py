"""Inspect exact PR template data with trusted code, without executing a change set.

Fetch before obtaining AWS credentials. Prepare inside the trusted infrastructure
validator container with no network or credentials. Plan uses only Python's
standard library, the AWS CLI, and the trusted deployment helper.
"""

import argparse
import base64
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parent.parent
MAX_TEMPLATE_BYTES = 51200
MAX_JSON_BYTES = 1024 * 1024
MAX_TARGETS = 10
MAX_ERROR_CHARACTERS = 4000
SHA = re.compile(r"[a-f0-9]{40}")
REPOSITORY = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
STACK_NAME = re.compile(r"[A-Za-z][A-Za-z0-9-]{0,127}")
TEMPLATE_PATH = re.compile(r"infra/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.yaml")
KIND = "pull-request-infrastructure-preflight"
# Temporary change sets use a prefix the execution role cannot run.
CHANGE_SET_PREFIX = "premerge"
# Standard AWS types are planned; namespaces that run code or expand templates are not.
RESOURCE_TYPE = re.compile(r"AWS::([A-Za-z0-9]+)::[A-Za-z0-9]+")
BLOCKED_NAMESPACES = {"CloudFormation", "Lambda", "Serverless"}
SECTIONS = {"AWSTemplateFormatVersion", "Description", "Metadata", "Parameters",
            "Mappings", "Conditions", "Rules", "Resources", "Outputs"}

spec = importlib.util.spec_from_file_location("trusted_deployment", ROOT / "scripts/deploy-infrastructure.py")
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


def unique_object(pairs):
    """Reject ambiguous JSON instead of letting the final duplicate key win."""
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate object key")
        result[key] = value
    return result


def decode_json(data):
    """Decode bounded JSON without duplicate keys or non-finite numbers."""
    if len(data) > MAX_JSON_BYTES:
        raise ValueError("JSON input is too large")
    return json.loads(data, object_pairs_hook=unique_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("Invalid JSON number")))


def trusted_config():
    """Return the stack targets currently deployed from main."""
    return {environment: deployment.deployment_config(environment)
            for environment in ("staging", "production")}


def candidate_config(data):
    """Accept PR deployment targets only as bounded stack names and infra/ template paths."""
    config = decode_json(data)
    if not isinstance(config, dict) or set(config) != {"staging", "production"}:
        raise ValueError("infra/deployments.json must define only staging and production targets")
    for environment, items in config.items():
        if not isinstance(items, list) or not 1 <= len(items) <= MAX_TARGETS:
            raise ValueError(f"{environment} requires 1 to {MAX_TARGETS} deployment targets")
        stacks = set()
        for item in items:
            if (not isinstance(item, dict) or set(item) != {"stack", "template"}
                    or not isinstance(item["stack"], str) or not STACK_NAME.fullmatch(item["stack"])
                    or not isinstance(item["template"], str)
                    or not TEMPLATE_PATH.fullmatch(item["template"])):
                raise ValueError(f"Invalid {environment} deployment target; "
                                 "use a stack name and a template directly inside infra/ ending in .yaml")
            if item["stack"] in stacks:
                raise ValueError(f"Duplicate {environment} stack: {item['stack']}")
            stacks.add(item["stack"])
    return config


def template_paths(config):
    """Return each distinct template path named by a validated deployment config."""
    return sorted({item["template"] for items in config.values() for item in items})


def read_file(directory, relative, limit=MAX_TEMPLATE_BYTES):
    """Read a bounded regular file without following candidate symlinks."""
    root = directory.resolve()
    path = root
    for part in Path(relative).parts:
        if part in {"..", "."} or Path(part).is_absolute():
            raise ValueError("Unsafe candidate path")
        path = path / part
        if path.is_symlink():
            raise ValueError("Candidate symlinks are not allowed")
    if not path.is_file() or not path.resolve().is_relative_to(root) or path.stat().st_size > limit:
        raise ValueError("Missing, oversized, or unsafe candidate file")
    return path.read_bytes()


class NoRedirects(urllib.request.HTTPRedirectHandler):
    """Never send GitHub credentials to a redirected host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("GitHub API redirects are not allowed")


def github(path):
    """Read a fixed GitHub API path without trusting response download URLs."""
    request = urllib.request.Request("https://api.github.com" + path, headers={
        "Authorization": "Bearer " + os.environ["GH_TOKEN"],
        "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "static-site-infrastructure-preflight",
    })
    try:
        with urllib.request.build_opener(NoRedirects).open(request, timeout=30) as response:
            return decode_json(response.read(MAX_JSON_BYTES + 1))
    except urllib.error.HTTPError as error:
        raise ValueError(f"GitHub API request failed with HTTP {error.code} for {path.split('?', 1)[0]}") from None


def validate_context(context):
    """Require explicit immutable PR provenance rather than workflow GITHUB_SHA."""
    if (not isinstance(context, dict) or context.get("kind") != KIND or context.get("version") != 1
            or not isinstance(context.get("repository"), str)
            or not REPOSITORY.fullmatch(context["repository"])
            or type(context.get("pr")) is not int or context["pr"] < 1
            or any(not isinstance(context.get(key), str) or not SHA.fullmatch(context[key])
                   for key in ("head", "base"))):
        raise ValueError("Invalid PR provenance")


def download(source_repository, path, head):
    """Download one exact-revision file through the contents API."""
    response = github(f"/repos/{source_repository}/contents/{path}?ref={head}")
    if (not isinstance(response, dict) or response.get("type") != "file"
            or response.get("path") != path or response.get("encoding") != "base64"
            or type(response.get("size")) is not int
            or not 0 <= response["size"] <= MAX_TEMPLATE_BYTES):
        raise ValueError(f"GitHub returned an unsupported or oversized candidate file: {path}")
    content = base64.b64decode("".join(response.get("content", "").split()), validate=True)
    if len(content) != response["size"] or len(content) > MAX_TEMPLATE_BYTES:
        raise ValueError(f"Candidate content size does not match GitHub metadata: {path}")
    return content


def fetch(repository, pr, head, base, directory):
    """Download the PR's deployment targets and only the templates they name."""
    context = {"kind": KIND, "version": 1, "repository": repository, "pr": pr,
               "head": head, "base": base}
    validate_context(context)
    pull = github(f"/repos/{repository}/pulls/{pr}")
    # The base SHA is recorded, not required: main can advance during planning without a
    # new PR event, and the plan uses only head templates and live stacks.
    if (pull.get("number") != pr or pull.get("state") != "open"
            or pull.get("base", {}).get("ref") != "main"
            or pull.get("head", {}).get("sha") != head
            or pull.get("base", {}).get("repo", {}).get("full_name", "").lower() != repository.lower()):
        raise ValueError("PR head, base branch, state, or repository changed; run a fresh check")
    source_repository = (pull.get("head", {}).get("repo") or {}).get("full_name", "")
    if not REPOSITORY.fullmatch(source_repository):
        raise ValueError("PR source repository is unavailable")
    # Forks are valid data sources only when identified by this exact PR response.
    contents = {"infra/deployments.json": download(source_repository, "infra/deployments.json", head)}
    config = candidate_config(contents["infra/deployments.json"])
    for path in template_paths(config):
        contents[path] = download(source_repository, path, head)
    directory.mkdir(parents=True, exist_ok=False)
    for path, content in contents.items():
        target = directory / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    context["files"] = {path: deployment.digest(content) for path, content in contents.items()}
    (directory / "context.json").write_text(json.dumps(context, indent=2) + "\n")


def candidate_targets(directory):
    """Parse the downloaded deployment targets after their digest has been checked."""
    return candidate_config(read_file(directory, "infra/deployments.json"))


def load_context(directory):
    """Verify every downloaded file against the targets it was fetched for."""
    context = decode_json(read_file(directory, "context.json"))
    validate_context(context)
    files = context.get("files")
    if (not isinstance(files, dict) or "infra/deployments.json" not in files
            or deployment.digest(read_file(directory, "infra/deployments.json")) != files["infra/deployments.json"]):
        raise ValueError("Candidate deployment targets changed after download")
    expected = {"infra/deployments.json", *template_paths(candidate_targets(directory))}
    if set(files) != expected:
        raise ValueError("Candidate file allowlist changed")
    for path in expected:
        if deployment.digest(read_file(directory, path)) != files[path]:
            raise ValueError("Candidate content changed after download")
    return context


def check_resource_type(name, resource_type):
    """Plan standard AWS resources; reject types that run code, expand, or come from modules."""
    match = RESOURCE_TYPE.fullmatch(resource_type) if isinstance(resource_type, str) else None
    if not match or match.group(1) in BLOCKED_NAMESPACES:
        raise ValueError(f"{name} uses resource type {str(resource_type)[:100]!r}, which pre-merge planning "
                         "does not accept. Custom, module, third-party, CloudFormation, Lambda and "
                         "Serverless types need separate administrator review.")


def validate_template_data(template):
    """Reject executable transforms, remote templates, and unsupported shapes."""
    count = 0

    def walk(value, path, depth=0):
        nonlocal count
        count += 1
        if count > 20000 or depth > 50:
            raise ValueError("Template is too complex")
        if isinstance(value, dict):
            for key, child in value.items():
                if not isinstance(key, str):
                    raise ValueError("Template mapping keys must be strings")
                if key in {"Transform", "Fn::Transform", "TemplateURL", "TemplateBody"}:
                    raise ValueError("Transforms and external template indirection are not allowed")
                walk(child, f"{path}.{key}", depth + 1)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                walk(child, f"{path}[{index}]", depth + 1)
        elif value is not None and type(value) not in {str, bool, int, float}:
            raise ValueError(f"Unsupported template value at {path[:200]}")
        elif isinstance(value, float) and not math.isfinite(value):
            raise ValueError(f"Non-finite template number at {path[:200]}")

    walk(template, "template")
    if not isinstance(template, dict) or set(template) - SECTIONS:
        raise ValueError("Unsupported template sections")
    resources = template.get("Resources")
    if not isinstance(resources, dict) or not resources or len(resources) > 500:
        raise ValueError("Template requires a bounded Resources mapping")
    for name, resource in resources.items():
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*", name) or not isinstance(resource, dict):
            raise ValueError("Resource names must be alphanumeric and each resource must be a mapping")
        check_resource_type(name, resource.get("Type"))
        if not isinstance(resource.get("Properties", {}), dict):
            raise ValueError(f"{name} Properties must be a mapping")
    return template


def parse_template(raw):
    """Parse CloudFormation YAML safely using the validator image's PyYAML."""
    import yaml  # Only the offline prepare stage needs the existing dependency.

    class TemplateLoader(yaml.SafeLoader):
        """Accept known CloudFormation tags without object constructors or aliases."""

        def construct_mapping(self, node, deep=False):
            pairs = [(self.construct_object(key, deep=True), self.construct_object(value, deep=True))
                     for key, value in node.value]
            if any(not isinstance(key, str) for key, _ in pairs):
                raise ValueError("Template mapping keys must be strings")
            return unique_object(pairs)

    def intrinsic(loader, tag, node):
        allowed = {"Ref", "Condition", "Sub", "GetAtt", "GetAZs", "Join", "FindInMap",
                   "Select", "Split", "If", "Equals", "And", "Or", "Not", "Base64", "Cidr", "ImportValue"}
        if tag not in allowed:
            raise ValueError("Unsupported CloudFormation YAML tag")
        if isinstance(node, yaml.ScalarNode):
            value = loader.construct_scalar(node)
            if tag == "GetAtt":
                value = value.split(".", 1)
        elif isinstance(node, yaml.SequenceNode):
            value = loader.construct_sequence(node, deep=True)
        else:
            value = loader.construct_mapping(node, deep=True)
        return {tag if tag in {"Ref", "Condition"} else "Fn::" + tag: value}

    TemplateLoader.add_multi_constructor("!", intrinsic)
    # CloudFormation reads unquoted dates such as Version: 2012-10-17 as strings.
    TemplateLoader.add_constructor("tag:yaml.org,2002:timestamp", TemplateLoader.construct_yaml_str)
    depth = 0
    for count, event in enumerate(yaml.parse(raw)):
        if isinstance(event, yaml.AliasEvent):
            raise ValueError("YAML aliases are not allowed")
        if isinstance(event, (yaml.MappingStartEvent, yaml.SequenceStartEvent)):
            depth += 1
        elif isinstance(event, (yaml.MappingEndEvent, yaml.SequenceEndEvent)):
            depth -= 1
        if depth > 50 or count > 40000:
            raise ValueError("Template is too complex")
    return validate_template_data(yaml.load(raw, Loader=TemplateLoader))


def monitoring_templates(config):
    """Select monitoring policy targets by trusted stack, so renaming a template cannot skip Guard."""
    stacks = {item["stack"] for items in trusted_config().values() for item in items
              if item["template"] == "infra/monitoring.yaml"}
    return sorted({item["template"] for items in config.values() for item in items
                   if item["stack"] in stacks or item["template"] == "infra/monitoring.yaml"})


def prepared_path(path):
    """Derive output paths from validated infra/ template paths only."""
    return "prepared/" + str(Path(path).with_suffix(".json"))


def print_untrusted(text):
    """Print candidate-derived text without letting it issue workflow commands."""
    if os.environ.get("GITHUB_ACTIONS") != "true":
        print(text)
        return
    token = secrets.token_hex(16)
    print(f"::stop-commands::{token}")
    print(text)
    print(f"::{token}::", flush=True)


def run_validator(command, name):
    """Run a template validator and keep its findings in the raised error."""
    result = subprocess.run(command, capture_output=True, text=True)
    output = (result.stdout + result.stderr).strip()
    if output:
        print_untrusted(output)
    if result.returncode:
        raise ValueError(f"{name} reported problems in the proposed templates:\n{output[-MAX_ERROR_CHARACTERS:]}")


def prepare(directory):
    """Normalize and validate data offline before any AWS role is assumed."""
    if any(os.environ.get(key) for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
                                          "AWS_SESSION_TOKEN", "AWS_WEB_IDENTITY_TOKEN_FILE",
                                          "GH_TOKEN", "GITHUB_TOKEN")):
        raise ValueError("Prepare must run without cloud or GitHub credentials")
    context = load_context(directory)
    paths = template_paths(candidate_targets(directory))
    prepared = {"context": context, "templates": {}}
    for path in paths:
        try:
            parsed = parse_template(read_file(directory, path))
        except Exception as error:
            raise ValueError(f"{path}: {error}") from None
        content = json.dumps(parsed, separators=(",", ":"), allow_nan=False).encode()
        if len(content) > MAX_TEMPLATE_BYTES:
            raise ValueError(f"{path}: normalized template exceeds CloudFormation's inline limit")
        output = directory / prepared_path(path)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        prepared["templates"][path] = deployment.digest(content)
    run_validator(["cfn-lint", "--regions", "us-east-1", "--template",
                   *[str(directory / prepared_path(path)) for path in paths]], "cfn-lint")
    for path in monitoring_templates(candidate_targets(directory)):
        run_validator(["cfn-guard", "validate", "--rules", str(ROOT / "infra/monitoring.guard"),
                       "--data", str(directory / prepared_path(path))], "cfn-guard")
    (directory / "prepared.json").write_text(json.dumps(prepared, indent=2) + "\n")


def load_prepared(directory):
    """Recheck provenance, bytes, and inert JSON before invoking AWS."""
    context = load_context(directory)
    prepared = decode_json(read_file(directory, "prepared.json"))
    if (prepared.get("context") != context or not isinstance(prepared.get("templates"), dict)
            or set(prepared["templates"]) != set(template_paths(candidate_targets(directory)))):
        raise ValueError("Prepared templates do not match the downloaded PR")
    for path, fingerprint in prepared["templates"].items():
        content = read_file(directory, prepared_path(path))
        if deployment.digest(content) != fingerprint:
            raise ValueError("Prepared template changed after validation")
        validate_template_data(decode_json(content))
    return prepared


def existing_stack(item, environment):
    """Read a target stack, explaining what a new stack needs before it can be planned."""
    try:
        return deployment.checked_stack(item["stack"])
    except RuntimeError as error:
        if item in trusted_config()[environment]:
            raise
        raise RuntimeError(f"{item['stack']} is a new {environment} target in this PR and could not be read. "
                           "Create the stack and add it to the planning role scope before merging. "
                           f"AWS said: {error}") from None


def remove_change_set(stack_id, name):
    """Delete this preflight's change set by stack and name, never by a returned ID."""
    deployment.aws("cloudformation", "delete-change-set", stack_name=stack_id, change_set_name=name)


def plan(directory, environment, run):
    """Exercise actual planner permissions and delete every created change set."""
    if not re.fullmatch(r"[1-9][0-9]*-[1-9][0-9]*", run):
        raise ValueError("Invalid workflow run identity")
    prepared = load_prepared(directory)
    context = prepared["context"]
    result = {"kind": KIND, "context": context, "environment": environment, "run": run,
              "region": os.environ["AWS_REGION"], "stacks": []}
    for index, item in enumerate(candidate_targets(directory)[environment]):
        stack = existing_stack(item, environment)
        # Send the exact reviewed YAML. Normalized intrinsic representations can
        # otherwise produce spurious IAM and distribution changes in AWS.
        template = directory / item["template"]
        schema = deployment.aws("cloudformation", "validate-template", template_body="file://" + str(template))
        # Offline checks read PyYAML's parse; CloudFormation's own parse must also find no
        # macro, because change-set creation runs transforms before anything is executed.
        if schema.get("DeclaredTransforms"):
            raise ValueError(f"{item['template']}: CloudFormation reports transforms, "
                             "which pre-merge planning does not accept")
        name = f"{CHANGE_SET_PREFIX}-{environment}-{context['pr']}-{run}-{index}"
        parameters = deployment.previous_parameters(schema.get("Parameters", []), stack.get("Parameters", []))
        # Start cleanup before creation: AWS can accept the change set even when the
        # CLI call then fails or is interrupted by the step timeout.
        try:
            created = deployment.aws(
                "cloudformation", "create-change-set", stack_name=stack["StackId"],
                change_set_name=name, change_set_type="UPDATE",
                template_body="file://" + str(template), capabilities=["CAPABILITY_NAMED_IAM"],
                parameters=parameters,
                description=f"PR {context['pr']}; head {context['head']}; base {context['base']}; preflight only")
            change_set_id = created.get("Id", "")
            if f":changeSet/{name}/" not in change_set_id:
                raise ValueError("AWS returned a change set outside this preflight's namespace")
            change_set = deployment.wait_for(
                lambda: deployment.aws("cloudformation", "describe-change-set", change_set_name=change_set_id),
                lambda value: value["Status"] in {"CREATE_COMPLETE", "FAILED"}, timeout=600)
            if change_set["StackId"] != stack["StackId"]:
                raise ValueError("AWS returned a change set for a different stack")
            no_op = (change_set["Status"] == "FAILED" and any(
                reason in change_set.get("StatusReason", "") for reason in deployment.NO_CHANGES))
            findings = []
            if no_op:
                # Still make the deployment's event read against this change set.
                deployment.aws("cloudformation", "describe-events", stack_name=stack["StackId"],
                               change_set_name=change_set_id)
            else:
                findings = deployment.validation_findings(stack["StackId"], change_set_id)
                deployment.require_available(change_set)
            try:
                changes = deployment.inspect_changes(change_set.get("Changes", []))
            except ValueError as error:
                raise ValueError(f"{item['stack']}: {error}") from None
            result["stacks"].append({**item, "noOp": no_op, "changes": changes,
                                     "warningCount": len(findings),
                                     "sourceSha256": context["files"][item["template"]],
                                     "preparedSha256": prepared["templates"][item["template"]]})
        except BaseException:
            try:
                remove_change_set(stack["StackId"], name)
            except Exception as cleanup:
                # Keep the planning error as the reported failure.
                print(f"Could not delete temporary change set {name}: {cleanup}", file=sys.stderr)
            raise
        remove_change_set(stack["StackId"], name)
    return result


def report(result):
    """Render human evidence, not an artifact accepted by the deployment helper."""
    context = result["context"]
    lines = [f"## AWS pre-merge: {result['environment']}", "",
             f"PR: #{context['pr']}", f"Head: `{context['head']}`", f"Base: `{context['base']}`", "",
             "Live event reads and unexecuted change-set validation passed. Temporary change sets were deleted.", "",
             "| Stack | Result | Validation warnings | Template SHA-256 |",
             "| --- | --- | --- | --- |"]
    for stack in result["stacks"]:
        outcome = "No resource changes" if stack["noOp"] else f"{len(stack['changes'])} reviewed resource changes"
        lines.append(f"| {stack['stack']} | {outcome} | {stack['warningCount']} | `{stack['sourceSha256']}` |")
    lines.extend(["", "This check does not execute changes or prove every execution-role write permission.", ""])
    return "\n".join(lines)


def error_text(error):
    """Bound an error message for summaries and annotations."""
    message = str(error) or type(error).__name__
    return message[:MAX_ERROR_CHARACTERS]


def failure_report(environment, error):
    """Show the failure reason in the job summary as inert text."""
    return "\n".join([f"## AWS pre-merge: {environment}", "",
                      "The proposed infrastructure did not pass AWS planning. "
                      "Temporary change sets were deleted when AWS allowed it.", "",
                      "```text", error_text(error).replace("`", "'"), "```", ""])


def with_deployment_hint(error):
    """Explain failures caused by a deployment updating the same stack during planning."""
    message = str(error)
    # Executing any change set deletes the stack's other change sets, including this preflight's.
    if "ChangeSetNotFound" in message or "_IN_PROGRESS" in message:
        return RuntimeError(f"{message}\nA deployment was probably updating this stack. "
                            "Rerun the PR checks after it finishes.")
    return error


def annotation(title, error):
    """Encode an error as one workflow-command line so the report job can read it."""
    message = error_text(error).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    return f"::error title={title}::{message}"


def main():
    """Keep downloading, offline parsing, and credentialed planning separate."""
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    downloader = commands.add_parser("fetch")
    downloader.add_argument("--repository", required=True)
    downloader.add_argument("--pr", type=int, required=True)
    downloader.add_argument("--head", required=True)
    downloader.add_argument("--base", required=True)
    downloader.add_argument("--directory", type=Path, required=True)
    normalizer = commands.add_parser("prepare")
    normalizer.add_argument("--directory", type=Path, required=True)
    planner = commands.add_parser("plan")
    planner.add_argument("--directory", type=Path, required=True)
    planner.add_argument("--environment", choices=["staging", "production"], required=True)
    planner.add_argument("--run", required=True)
    planner.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    title = f"AWS pre-merge {args.action}" + (f" ({args.environment})" if args.action == "plan" else "")
    try:
        if args.action == "fetch":
            fetch(args.repository, args.pr, args.head, args.base, args.directory)
        elif args.action == "prepare":
            prepare(args.directory)
        else:
            summary = report(plan(args.directory.resolve(), args.environment, args.run))
            with args.report.open("a") as stream:
                stream.write(summary)
            print(summary)
    except (Exception, KeyboardInterrupt) as error:
        if isinstance(error, KeyboardInterrupt):
            error = RuntimeError("Planning was interrupted, usually by the step timeout")
        if args.action == "plan":
            error = with_deployment_hint(error)
            with args.report.open("a") as stream:
                stream.write(failure_report(args.environment, error))
        print_untrusted(f"{title} failed:\n{error_text(error)}")
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print(annotation(title, error), flush=True)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
