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
import subprocess
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parent.parent
MAX_TEMPLATE_BYTES = 51200
MAX_JSON_BYTES = 1024 * 1024
SHA = re.compile(r"[a-f0-9]{40}")
REPOSITORY = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
KIND = "pull-request-infrastructure-preflight"
RESOURCE_TYPES = {
    "AWS::CertificateManager::Certificate", "AWS::CloudFront::Distribution",
    "AWS::CloudFront::Function", "AWS::CloudFront::OriginAccessControl",
    "AWS::CloudFront::ResponseHeadersPolicy", "AWS::CloudWatch::Alarm",
    "AWS::IAM::OIDCProvider", "AWS::IAM::Role", "AWS::KMS::Key",
    "AWS::Route53::HostedZone", "AWS::Route53::RecordSet",
    "AWS::Route53::RecordSetGroup", "AWS::S3::Bucket", "AWS::S3::BucketPolicy",
    "AWS::SNS::Subscription", "AWS::SNS::Topic", "AWS::SNS::TopicPolicy",
}
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
    """Use stack names and template paths from the trusted checkout only."""
    return {environment: deployment.deployment_config(environment)
            for environment in ("staging", "production")}


def template_paths():
    """Return the fixed paths the trusted deployment configuration permits."""
    return sorted({item["template"] for items in trusted_config().values() for item in items})


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
        raise ValueError(f"GitHub API request failed with HTTP {error.code}") from None


def validate_context(context):
    """Require explicit immutable PR provenance rather than workflow GITHUB_SHA."""
    if (not isinstance(context, dict) or context.get("kind") != KIND or context.get("version") != 1
            or not isinstance(context.get("repository"), str)
            or not REPOSITORY.fullmatch(context["repository"])
            or type(context.get("pr")) is not int or context["pr"] < 1
            or any(not isinstance(context.get(key), str) or not SHA.fullmatch(context[key])
                   for key in ("head", "base"))):
        raise ValueError("Invalid PR provenance")


def fetch(repository, pr, head, base, directory):
    """Download only allowlisted files after checking the current PR identity."""
    context = {"kind": KIND, "version": 1, "repository": repository, "pr": pr,
               "head": head, "base": base}
    validate_context(context)
    pull = github(f"/repos/{repository}/pulls/{pr}")
    if (pull.get("number") != pr or pull.get("state") != "open"
            or pull.get("base", {}).get("ref") != "main"
            or pull.get("base", {}).get("sha") != base
            or pull.get("head", {}).get("sha") != head
            or pull.get("base", {}).get("repo", {}).get("full_name", "").lower() != repository.lower()):
        raise ValueError("PR head, base, state, or repository changed; run a fresh check")
    source_repository = (pull.get("head", {}).get("repo") or {}).get("full_name", "")
    if not REPOSITORY.fullmatch(source_repository):
        raise ValueError("PR source repository is unavailable")
    # Forks are valid data sources only when identified by this exact PR response.
    contents = {}
    for path in ["infra/deployments.json", *template_paths()]:
        response = github(f"/repos/{source_repository}/contents/{path}?ref={head}")
        if (not isinstance(response, dict) or response.get("type") != "file"
                or response.get("path") != path or response.get("encoding") != "base64"
                or type(response.get("size")) is not int
                or not 0 <= response["size"] <= MAX_TEMPLATE_BYTES):
            raise ValueError("GitHub returned an unsupported candidate file")
        content = base64.b64decode("".join(response.get("content", "").split()), validate=True)
        if len(content) != response["size"] or len(content) > MAX_TEMPLATE_BYTES:
            raise ValueError("Candidate content size does not match GitHub metadata")
        contents[path] = content
    if decode_json(contents["infra/deployments.json"]) != trusted_config():
        raise ValueError("PR deployment targets differ from the trusted configuration")
    directory.mkdir(parents=True, exist_ok=False)
    for path, content in contents.items():
        target = directory / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    context["files"] = {path: deployment.digest(content) for path, content in contents.items()}
    (directory / "context.json").write_text(json.dumps(context, indent=2) + "\n")


def load_context(directory):
    """Verify every downloaded file and the fixed target list before each stage."""
    context = decode_json(read_file(directory, "context.json"))
    validate_context(context)
    expected = {"infra/deployments.json", *template_paths()}
    if not isinstance(context.get("files"), dict) or set(context["files"]) != expected:
        raise ValueError("Candidate file allowlist changed")
    for path in expected:
        if deployment.digest(read_file(directory, path)) != context["files"][path]:
            raise ValueError("Candidate content changed after download")
    if decode_json(read_file(directory, "infra/deployments.json")) != trusted_config():
        raise ValueError("PR deployment targets differ from the trusted configuration")
    return context


def validate_template_data(template):
    """Reject executable transforms, remote templates, and unsupported shapes."""
    count = 0

    def walk(value, depth=0):
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
                walk(child, depth + 1)
        elif isinstance(value, list):
            for child in value:
                walk(child, depth + 1)
        elif value is not None and type(value) not in {str, bool, int, float}:
            raise ValueError("Unsupported template value")
        elif isinstance(value, float) and not math.isfinite(value):
            raise ValueError("Non-finite template number")

    walk(template)
    if not isinstance(template, dict) or set(template) - SECTIONS:
        raise ValueError("Unsupported template sections")
    resources = template.get("Resources")
    if not isinstance(resources, dict) or not resources or len(resources) > 500:
        raise ValueError("Template requires a bounded Resources mapping")
    for name, resource in resources.items():
        if (not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*", name)
                or not isinstance(resource, dict) or resource.get("Type") not in RESOURCE_TYPES
                or not isinstance(resource.get("Properties", {}), dict)):
            raise ValueError("Unsupported resource type or shape; review trusted preflight policy")
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


def prepared_path(path):
    """Derive output paths from trusted filenames, never candidate metadata."""
    return "prepared/" + str(Path(path).with_suffix(".json"))


def prepare(directory):
    """Normalize and validate data offline before any AWS role is assumed."""
    if any(os.environ.get(key) for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
                                          "AWS_SESSION_TOKEN", "AWS_WEB_IDENTITY_TOKEN_FILE",
                                          "GH_TOKEN", "GITHUB_TOKEN")):
        raise ValueError("Prepare must run without cloud or GitHub credentials")
    context = load_context(directory)
    prepared = {"context": context, "templates": {}}
    for path in template_paths():
        content = json.dumps(parse_template(read_file(directory, path)),
                             separators=(",", ":"), allow_nan=False).encode()
        if len(content) > MAX_TEMPLATE_BYTES:
            raise ValueError("Normalized template exceeds CloudFormation's inline limit")
        output = directory / prepared_path(path)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        prepared["templates"][path] = deployment.digest(content)
    files = [str(directory / prepared_path(path)) for path in template_paths()]
    subprocess.run(["cfn-lint", "--regions", "us-east-1", "--template", *files], check=True)
    subprocess.run(["cfn-guard", "validate", "--rules", str(ROOT / "infra/monitoring.guard"),
                    "--data", str(directory / prepared_path("infra/monitoring.yaml"))], check=True)
    (directory / "prepared.json").write_text(json.dumps(prepared, indent=2) + "\n")


def load_prepared(directory):
    """Recheck provenance, bytes, and inert JSON before invoking AWS."""
    context = load_context(directory)
    prepared = decode_json(read_file(directory, "prepared.json"))
    if (prepared.get("context") != context or not isinstance(prepared.get("templates"), dict)
            or set(prepared["templates"]) != set(template_paths())):
        raise ValueError("Prepared templates do not match the downloaded PR")
    for path, fingerprint in prepared["templates"].items():
        content = read_file(directory, prepared_path(path))
        if deployment.digest(content) != fingerprint:
            raise ValueError("Prepared template changed after validation")
        validate_template_data(decode_json(content))
    return prepared


def plan(directory, environment, run):
    """Exercise actual planner permissions and delete every created change set."""
    if not re.fullmatch(r"[1-9][0-9]*-[1-9][0-9]*", run):
        raise ValueError("Invalid workflow run identity")
    prepared = load_prepared(directory)
    context = prepared["context"]
    result = {"kind": KIND, "context": context, "environment": environment, "run": run,
              "region": os.environ["AWS_REGION"], "stacks": []}
    for index, item in enumerate(trusted_config()[environment]):
        stack = deployment.checked_stack(item["stack"])
        probe = {"stack_name": stack["StackId"]}
        if stack.get("ChangeSetId"):
            probe["change_set_name"] = stack["ChangeSetId"]
        # Always make a real request, including when the candidate will be a no-op.
        deployment.aws("cloudformation", "describe-events", **probe)
        # Send the exact reviewed YAML. Normalized intrinsic representations can
        # otherwise produce spurious IAM and distribution changes in AWS.
        template = directory / item["template"]
        schema = deployment.aws("cloudformation", "validate-template", template_body="file://" + str(template))
        name = f"github-{environment}-pr-{context['pr']}-{run}-{index}"
        created = deployment.aws("cloudformation", "create-change-set", stack_name=stack["StackId"],
                                 change_set_name=name, change_set_type="UPDATE",
                                 template_body="file://" + str(template), capabilities=["CAPABILITY_NAMED_IAM"],
                                 parameters=deployment.previous_parameters(schema.get("Parameters", []),
                                                                           stack.get("Parameters", [])),
                                 description=f"PR {context['pr']}; head {context['head']}; base {context['base']}; preflight only")
        change_set_id = created["Id"]
        if not change_set_id.endswith("/" + name) and f":changeSet/{name}/" not in change_set_id:
            raise ValueError("AWS returned a change set outside this preflight's namespace")
        try:
            change_set = deployment.wait_for(
                lambda: deployment.aws("cloudformation", "describe-change-set", change_set_name=change_set_id),
                lambda value: value["Status"] in {"CREATE_COMPLETE", "FAILED"}, timeout=600)
            if change_set["StackId"] != stack["StackId"]:
                raise ValueError("AWS returned a change set for a different stack")
            no_op = (change_set["Status"] == "FAILED" and any(
                reason in change_set.get("StatusReason", "") for reason in deployment.NO_CHANGES))
            findings = []
            if not no_op:
                events = deployment.aws("cloudformation", "describe-events",
                                        stack_name=stack["StackId"], change_set_name=change_set_id)
                findings = [event for event in events.get("OperationEvents", [])
                            if event.get("EventType") == "VALIDATION_ERROR"]
                if any(event.get("ValidationFailureMode") == "FAIL" for event in findings):
                    raise ValueError("CloudFormation validation findings require review before deployment")
                if change_set["Status"] != "CREATE_COMPLETE" or change_set["ExecutionStatus"] != "AVAILABLE":
                    raise ValueError("CloudFormation could not prepare the candidate change set")
            changes = deployment.inspect_changes(change_set.get("Changes", []))
            result["stacks"].append({**item, "noOp": no_op, "changes": changes,
                                     "warningCount": len(findings),
                                     "sourceSha256": context["files"][item["template"]],
                                     "preparedSha256": prepared["templates"][item["template"]]})
        finally:
            # Only this exact ARN was created above; deployment plans are never read.
            deployment.aws("cloudformation", "delete-change-set", change_set_name=change_set_id)
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
    if args.action == "fetch":
        fetch(args.repository, args.pr, args.head, args.base, args.directory)
    elif args.action == "prepare":
        prepare(args.directory)
    else:
        summary = report(plan(args.directory.resolve(), args.environment, args.run))
        args.report.write_text(summary)
        print(summary)


if __name__ == "__main__":
    main()
