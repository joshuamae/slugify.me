# Deploy infrastructure and website changes through GitHub Actions

Merge a reviewed change into `main` to update the existing AWS infrastructure
before publishing the website. Complete the one-time role setup below before
merging the workflow. The pipeline uses CloudFormation directly; SAM CLI is not
required for this static website.

## Check a pull request before merge

Run the local checks, then open or update the pull request against `main`.
The application and infrastructure workflows run without AWS credentials.
After **Infrastructure checks** completes successfully, **AWS pre-merge checks**
performs live AWS planning checks for the proposed templates once its
[initial rollout](#enable-required-checks-and-roll-out-the-workflow) is complete.

1. Wait for **Check and build** to finish type checking, linting, formatting, tests and the application build
2. Wait for **Validate infrastructure** to finish template, Guard and Python checks
3. Wait for **AWS pre-merge** on the latest pull request revision and review its result
4. Resolve any failure and wait for checks on the updated revision before merging

The AWS check runs workflow and helper code from trusted `main`. It reads the
allowlisted proposed templates as data and validates them in an offline
container without credentials. It does not run scripts or actions from the pull
request with AWS credentials. It then uses the existing planning roles to create
temporary change sets, inspect validation results and call `DescribeEvents`,
including when AWS reports no infrastructure changes. It deletes its temporary
change sets and never executes them.

Expected result: the required checks pass for the latest revision before merge.
This catches template validation errors and live planning or event-read
permission failures. It does not exercise every deployment write permission or
guarantee that a later deployment will succeed. After merge, the pipeline still
creates fresh plans and uses the protected execution environments described
below.

### Enable required checks and roll out the workflow

Running a workflow alone does not make its result a merge requirement. An
administrator must configure the `main` ruleset. Sign in to GitHub CLI with
repository administration access, then run these commands from the repository
root, replacing `OWNER/REPOSITORY`:

1. Require the existing **Check and build** and **Validate infrastructure** checks

    ```sh
    python3 -B scripts/configure-required-checks.py --repository OWNER/REPOSITORY
    ```

2. Roll out **AWS pre-merge checks** and its trusted helper code on `main`, then verify a successful **AWS pre-merge** result for the current revision of an open pull request
3. Add **AWS pre-merge** to the required checks after that successful rollout

    ```sh
    python3 -B scripts/configure-required-checks.py --repository OWNER/REPOSITORY --include-aws
    ```

The helper preserves the existing ruleset, requires branches to be up to date
and pins the checks to the observed GitHub Actions app. Add `--dry-run` to
preview the update without changing GitHub. The `--include-aws` option refuses
to activate the third check until its trusted workflow is on `main` and a
successful result matches a current open pull request.

See [GitHub required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass-before-merging).

The AWS workflow uses `workflow_run`, which starts from the default branch.
Its first rollout requires the workflow and trusted helper code to reach `main`;
adding those files to a pull request does not activate the automatic check.
Requiring **AWS pre-merge** before it can run leaves pull requests blocked on a
missing check. Until rollout is complete, only the two existing checks provide
the configured merge gate. See [GitHub workflow-run behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

The AWS check currently supports pull requests only. The repository does not
use a merge queue. Before enabling one, add AWS checks for the merge group's
revision; the application and static infrastructure workflows already accept
`merge_group` events.

## What happens after a merge

1. Validate all four CloudFormation templates, run the monitoring and role Guard rules and
   their regression cases, and run the Python tests
2. Check and build the application once, saving an immutable release artifact
3. Create staging change sets from the same Git commit and show their resource
   changes in the workflow summary
4. Apply the staging infrastructure, wait for CloudFront deployment, verify the
   existing release with authentication, then publish and verify the new release
5. Create production change sets only after staging succeeds
6. Wait for the existing `production` environment approval; inspect the plan in
   the workflow summary before selecting **Approve and deploy**
7. Apply production infrastructure, verify the existing website, then publish
   and verify the same application artifact that passed staging

`infra/deployments.json` lists the existing stacks. Staging updates its hosting
stack. Production updates the domain, production hosting, and shared monitoring
stacks, in that order. The domain stack has no staging counterpart; its changes
receive local validation and production plan review before execution.

Application and static infrastructure checks require no AWS credentials. The
trusted AWS check and post-merge planning use roles that cannot execute changes.
The protected production job
obtains execution credentials only after approval. Infrastructure and
application rollback share the existing `aws-staging` concurrency group.

The publishing job allows 180 minutes. Production can spend up to 35 minutes on
each of its three stack updates, followed by up to 20 minutes waiting for
CloudFront and the remaining time verifying and publishing the website.
Infrastructure execution credentials last three hours; website publishing
obtains fresh, separate credentials after infrastructure verification.

Expected result: AWS reports successful stack updates, the existing release
still passes verification, and the new website release passes all content and
access checks. A failed step stops promotion.

## Run the same validators locally

Start Docker Desktop, or another Docker-compatible daemon, and run from the
repository root:

```sh
sh scripts/check-infrastructure.sh
```

The first run builds a local image. Subsequent runs reuse Docker's build cache.
The image supports Apple Silicon and Linux/Intel runners, pins `cfn-lint` 1.56.3
and Guard 3.2.1, and verifies the official Guard download checksums. It also pins
the base image digest. Validation mounts the repository read-only, runs with
network access disabled, and receives no AWS credentials. Building the image
requires network access to download the tools.

For an existing native installation of those tools:

```sh
sh scripts/check-infrastructure.sh --native
```

The native option runs the same checks but uses the versions on your PATH.
GitHub Actions always uses the container command.

## Set up infrastructure roles once

Use administrator credentials for this bootstrap. The existing publishing roles
remain limited to website uploads. Infrastructure changes target the existing
stack and resource ARNs collected for each environment. The planning and
execution roles also receive a separate permission to read CloudFormation
operation events across the account in the bootstrap stack's region. They
cannot update their own bootstrap stacks or grant themselves new permissions.

1. Sign in to AWS and GitHub CLI, set your AWS profile and region, and select the
   repository and first environment

    ```sh
    export AWS_PROFILE=YOUR_PROFILE
    export AWS_REGION=us-east-1
    export SITE_REPOSITORY=OWNER/REPOSITORY
    export INFRA_ENVIRONMENT=staging
    export INFRA_PARAMETERS="${TMPDIR:-/tmp}/infrastructure-${INFRA_ENVIRONMENT}-parameters.json"
    ```

2. Discover the existing resources and exact GitHub OIDC subject prefix

    ```sh
    python3 -B scripts/prepare-infrastructure-bootstrap.py \
      --environment "$INFRA_ENVIRONMENT" --repository "$SITE_REPOSITORY" \
      --output "$INFRA_PARAMETERS"
    ```

    Review the saved stack/resource ARNs. Keep this account-specific file outside
    Git. The helper creates the file with owner-only read/write permissions
    (`0600`) before writing and replaces any previous file atomically. It reads
    identifiers, not secret values. Existing stacks must be stable and must not
    have an inherited CloudFormation service role.

    For staging, the helper copies the hosting stack's `StagingAuthSecretArn`
    into a separate bootstrap parameter. Only the staging execution role can
    read that secret. Production receives no secret-read permission, and adding
    other secrets to `ResourceArns` does not grant access to their values.

3. Create and inspect the bootstrap change set

    ```sh
    aws cloudformation create-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name bootstrap-infrastructure-roles --change-set-type CREATE \
      --template-body file://infra/deployment-roles.yaml \
      --parameters "file://$INFRA_PARAMETERS" --capabilities CAPABILITY_IAM
    aws cloudformation wait change-set-create-complete \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name bootstrap-infrastructure-roles
    aws cloudformation describe-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name bootstrap-infrastructure-roles
    aws cloudformation describe-events \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name bootstrap-infrastructure-roles
    ```

4. Execute the reviewed bootstrap change set and wait for completion

    ```sh
    aws cloudformation execute-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name bootstrap-infrastructure-roles
    aws cloudformation wait stack-create-complete \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}"
    ```

5. In GitHub **Settings → Environments**, create `staging-plan` and
   `production-plan`, each allowing deployments from the `main` branch only
6. Keep the existing `staging` and `production` environments restricted to
   `main`, and keep a required reviewer on `production`
7. Configure the role outputs as environment variables

    ```sh
    INFRA_PLAN_ROLE="$(aws cloudformation describe-stacks \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --query 'Stacks[0].Outputs[?OutputKey==`PlanRoleArn`].OutputValue | [0]' --output text)"
    INFRA_EXECUTION_ROLE="$(aws cloudformation describe-stacks \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --query 'Stacks[0].Outputs[?OutputKey==`ExecutionRoleArn`].OutputValue | [0]' --output text)"
    gh variable set AWS_REGION --repo "$SITE_REPOSITORY" \
      --env "$INFRA_ENVIRONMENT-plan" --body us-east-1
    gh variable set AWS_INFRA_PLAN_ROLE_ARN --repo "$SITE_REPOSITORY" \
      --env "$INFRA_ENVIRONMENT-plan" --body "$INFRA_PLAN_ROLE"
    gh variable set AWS_INFRA_EXECUTION_ROLE_ARN --repo "$SITE_REPOSITORY" \
      --env "$INFRA_ENVIRONMENT" --body "$INFRA_EXECUTION_ROLE"
    ```

8. Repeat steps 1–4 and 7 with `INFRA_ENVIRONMENT=production`, then merge the
   automation branch and inspect the first pipeline run

Configure the [required checks](#enable-required-checks-and-roll-out-the-workflow)
in the `main` ruleset as part of the rollout. Role bootstrap changes remain a
separately reviewed administrator operation; the pipeline validates their
template but cannot deploy it itself.

## Update existing infrastructure roles

If you already created the bootstrap stacks, update them with administrator
credentials before running the updated workflow. The pipeline cannot update
its own roles. The current template includes three-hour execution sessions,
secret reads restricted to staging authentication and a separate
`cloudformation:DescribeEvents` permission for both planning and execution.
Planning roles also receive `cloudformation:DeleteChangeSet` for temporary
`github-<environment>-pr-*` change sets on their existing stacks. This cleanup
permission cannot delete the ordinary deployment plans awaiting approval.

The event-read statement uses `Resource: '*'` with `aws:RequestedRegion` equal
to the bootstrap stack's region. This permits reading CloudFormation operation
events for other stacks in the account in that region. It grants no deployment
action. Existing trust conditions, stack and resource scopes for other actions,
and production approval requirements stay in place.

This event-read exception addresses an observed GitHub planning failure: the
live `DescribeEvents` request was denied even though the existing policy
included stack and change-set ARNs and IAM simulation allowed the request.
Treat the exception as a bounded workaround for that runtime behavior; the
evidence does not establish a general AWS requirement for wildcard access.
See the [DescribeEvents API](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DescribeEvents.html)
and [requested-region condition](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion).

1. Repeat steps 1–2 in **Set up infrastructure roles once** for the environment
   you want to update, using this checkout to regenerate the parameter file
2. Create and inspect an update change set

    ```sh
    aws cloudformation create-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name update-infrastructure-roles --change-set-type UPDATE \
      --template-body file://infra/deployment-roles.yaml \
      --parameters "file://$INFRA_PARAMETERS" --capabilities CAPABILITY_IAM
    aws cloudformation wait change-set-create-complete \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name update-infrastructure-roles
    aws cloudformation describe-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name update-infrastructure-roles
    aws cloudformation describe-events \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name update-infrastructure-roles
    ```

3. After reviewing the role changes and validation results, execute the change
   set and wait for the update

    ```sh
    aws cloudformation execute-change-set \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}" \
      --change-set-name update-infrastructure-roles
    aws cloudformation wait stack-update-complete \
      --stack-name "static-site-infra-${INFRA_ENVIRONMENT}"
    ```

4. Repeat for the other environment, then start a complete new workflow run after the reviewed repository change is on `main`

    ```sh
    gh workflow run deploy-staging.yaml --repo "$SITE_REPOSITORY" --ref main
    ```

    Start a new run instead of rerunning only failed jobs. Infrastructure plans
    and artifacts are bound to their original run attempt; reusing earlier
    successful jobs can leave the plan out of sync with the new attempt.

Expected result: both bootstrap stacks finish updating without role replacement,
and the new workflow can read CloudFormation validation events before continuing
through its usual staging checks and production approval. Confirm that behavior
in the workflow; a successful role update or IAM simulation alone does not prove
the runtime denial is resolved. Both execution roles retain three-hour sessions,
staging can read only its authentication secret, and production has no
secret-read permission. Role ARNs stay the same. See
[AWS role session duration](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html)
for how the requested duration and role maximum work together.

## Parameters, plans, and failure handling

- Existing parameter values stay in CloudFormation via `UsePreviousValue`, including
  domains, certificates, OIDC ownership, alarm recipients, and secret versions
- Changing a template default does not override an existing stack parameter
- New required parameters need explicit initialization; the pipeline does not guess
- Plans contain commit/run identity, stack revisions, template checksums, change-set
  ARNs, and resource changes, without parameter values
- The execution job downloads the exact artifact ID and verifies its checksum
- An intervening stack update invalidates the plan, including a previously empty plan
- Explicit CloudFormation no-change results succeed; access errors and blocking
  validation findings do not count as no-ops
- Validation findings with `FAIL` mode stop planning; `WARN` findings appear in
  the job log and allow an otherwise valid change set to proceed
- Resource deletion or replacement requires a separately reviewed migration
- IAM permission or trust changes require an administrator; automated IAM changes
  are limited to tags, so the execution role cannot expand the publisher role's access
- Adding resource types or changing permissions may require an administrator to
  extend the bootstrap roles' exact resource scopes and allowed actions first
- CloudFormation rollback remains enabled; rollback completion fails the release job
- Failure after one stack update does not undo earlier successful stack updates
- Application rollback restores website content only; it does not revert infrastructure
- Infrastructure plans and verification evidence are retained as workflow artifacts
- Production verification requires six enabled alarms with the monitoring stack's
  `AlarmTopicArn` in both `AlarmActions` and `OKActions`, plus a confirmed email
  subscription on that topic with the exact production-error filter and
  `MessageBody` scope described in the [monitoring runbook](aws-operations.md#verify-the-deployed-email-filter)

## Troubleshooting

| Symptom                                             | What to do                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Docker cannot connect                               | Start Docker Desktop and rerun the validation command                                                               |
| OIDC access denied                                  | Check the immutable subject prefix, matching environment suffix, and `main` branch restriction                      |
| Missing planning/execution role                     | Complete the bootstrap and set the corresponding environment variable                                               |
| Requested session duration exceeds the role maximum | Update the existing infrastructure roles before retrying the workflow                                               |
| Staging bootstrap requires `StagingAuthSecretArn`   | Set the authentication secret ARN on the staging hosting stack, then regenerate the bootstrap parameters            |
| Monitoring alarms fail destination verification     | Check that all six enabled alarms include the monitoring stack's `AlarmTopicArn` in both alarm and recovery actions |
| Monitoring subscription fails verification          | Follow the [deployed email filter checks](aws-operations.md#verify-the-deployed-email-filter)                       |
| AWS CLI does not recognize `describe-events`        | Update AWS CLI v2 before running the deployment helper                                                              |
| `DescribeEvents` access denied during planning      | Apply the [role update](#update-existing-infrastructure-roles), then start a new complete workflow run              |
| Plan changed while approval was pending             | Inspect the live stack, then start a new workflow run from current `main`                                           |
| Rerunning only failed jobs rejects the plan         | Start a new complete run; plans are bound to their original run attempt                                             |
| New resource or permission is denied                | Review and update the bootstrap role scope before retrying; avoid administrator policies in CI                      |
| Stack update rolls back                             | Inspect CloudFormation events and fix the template; the website publishing step stays stopped                       |
| Verification fails after infrastructure succeeds    | Investigate the infrastructure while the existing release remains active; the new release has not been uploaded     |

For role and approval behavior, see [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
and [CloudFormation change sets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html).
