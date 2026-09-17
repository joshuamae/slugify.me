# Set up AWS hosting

Use this guide for initial hosting setup, staging access, release recovery and
the production domain. For routine changes to existing infrastructure, see
[Deploy infrastructure and website changes through GitHub Actions](infrastructure-delivery.md).
Run all commands from the repository root.

The CloudFormation template in `infra/site.yaml` describes the AWS resources
needed to host the generated website. CloudFormation creates related resources
together as a **stack**. Use separate stacks for staging and production.

- **Staging** — A password-protected environment for testing deployments
- **Production** — The environment intended for visitors
- **S3** — Storage for the generated website files
- **CloudFront** — HTTPS delivery with password checks on staging
- **OIDC** — A way for GitHub to obtain temporary AWS deployment credentials

The template prepares hosting resources and a GitHub deployment role. Steps 8–9
below publish and verify a staging release manually. The [staging and production
workflow](#deploy-staging-and-promote-to-production) handles subsequent
releases. New stacks start with a generated CloudFront address. Production serves
its custom domain through Route 53 and an ACM certificate; see
[Production domain](#production-domain).

## Existing budget

Use the account's existing AWS budget. This template does not create or modify
budgets. Budget notifications do not automatically stop AWS charges.

## Monitor availability and review costs

`infra/monitoring.yaml` defines CloudFront request and error alarms for both
environments in a separate stack. See
[Monitor AWS hosting and review monthly costs](aws-operations.md) for alarms,
notifications, logging retention, the cost estimate and the monthly review. Use
[Rehearse recovery from a missing staging asset](aws-staging-failure-exercise.md)
for the controlled failure procedure.

## Before you start

Run commands from the repository root in Bash or Zsh. You need:

- AWS CLI installed and signed in
- GitHub CLI (`gh`) installed and signed in with access to the repository's OIDC settings
- AWS permissions to create the S3, CloudFront, and IAM resources in the template
- Node.js 24 and npm for building the website
- Python 3 for hidden terminal entry of staging credentials
- AWS permissions to create a staging credential digest secret and allow the CloudFormation execution identity to read its selected version
- `curl`, `gzip`, and `shasum` available in the terminal
- GNU tar 1.28 or newer for packaging and tests; the tool checks `gtar` first, then `tar`
- Your GitHub repository name in `OWNER/REPOSITORY` format

On macOS, install GNU tar with Homebrew. The built-in BSD tar does not support
the required archive normalization options:

```sh
brew install gnu-tar
gtar --version
```

Ubuntu GitHub runners provide GNU tar. Rollback and verification only extract
existing archives and can use the system `tar`; they do not require GNU tar.

Confirm AWS access:

```sh
aws sts get-caller-identity
```

Expected result: AWS displays information about the signed-in identity. Check
that this is the account where you intend to create the website resources.

## 1. Set the deployment settings

Replace `OWNER/REPOSITORY` with your GitHub repository.

```sh
export AWS_REGION="us-east-1"
export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_PAGER=""

export SITE_REPOSITORY="OWNER/REPOSITORY"
export SITE_ENVIRONMENT="staging"
export SITE_STACK="static-site-staging"
```

These settings apply to the current terminal session. Start with staging.

Read the repository's OIDC identity prefix from GitHub. This is the beginning of
the identity string GitHub sends to AWS, before the environment name:

```sh
SITE_OIDC_SUBJECT_PREFIX="$(
  gh api "repos/$SITE_REPOSITORY/actions/oidc/customization/sub" \
    --jq 'if .use_default == true and (.sub_claim_prefix | type) == "string" and (.sub_claim_prefix | length) > 0 then .sub_claim_prefix else error("Expected a default OIDC subject with a nonempty sub_claim_prefix; review repository OIDC settings") end'
)" && export SITE_OIDC_SUBJECT_PREFIX
```

Stop if this command fails. Expected result: `SITE_OIDC_SUBJECT_PREFIX` contains
either `repo:OWNER/REPOSITORY` or
`repo:OWNER@OWNER_ID/REPOSITORY@REPOSITORY_ID`. Display it to confirm:

```sh
printf '%s\n' "$SITE_OIDC_SUBJECT_PREFIX"
```

Repositories created after July 15, 2026, and repositories that opted in to
immutable subjects include numeric owner and repository IDs. Preserve the exact
returned prefix, including both IDs; do not reconstruct it from repository names.
The template appends `:environment:staging` or `:environment:production` and
requires an exact match. Custom subject templates need separate review because
their format can differ. See [GitHub's OIDC reference](https://docs.github.com/en/actions/reference/security/oidc).

## 2. Find an existing GitHub identity provider

Run this discovery step when creating a new stack. When updating an existing
stack, follow the update section below to preserve its identity-provider ownership.

```sh
SITE_OIDC_ARN="$(
  aws iam list-open-id-connect-providers \
    --query "OpenIDConnectProviderList[?ends_with(Arn, '/token.actions.githubusercontent.com')].Arn | [0]" \
    --output text
)"
```

If that command fails, resolve the error before continuing. After it succeeds:

```sh
if [ "$SITE_OIDC_ARN" = "None" ]; then
  SITE_OIDC_ARN=""
fi
export SITE_OIDC_ARN
```

If a provider exists, the template reuses it. Otherwise, the template creates
one. An **ARN** is AWS's unique identifier for a resource.

## 3. Validate the template

```sh
aws cloudformation validate-template \
  --region "$AWS_REGION" \
  --template-body file://infra/site.yaml
```

Expected result: AWS returns template information without an error. The IAM
capability notice is expected because the template defines deployment access.
This API checks basic template validity; it does not prove that resource
configuration or deployment permissions will succeed.

If `cfn-lint` is installed, also check resource schemas locally:

```sh
cfn-lint infra/site.yaml
```

## Set up staging credentials

Staging requires a browser username and password for every page and asset,
including `robots.txt` and `sitemap.xml`. CloudFront checks credentials before
serving cached content. Production stays publicly accessible. The browser app
still runs entirely on the device and uses the same build in both environments.

The template resolves a SHA-256 **digest** (a one-way representation of the
authorization header) from AWS Secrets Manager into the CloudFront function.
It never embeds the password in repository files or deployment artifacts.
Use a password manager to generate a unique random password of at least 32
characters. Anyone allowed to read the deployed function can read the digest;
a strong random password prevents practical guessing against that digest.

1. Set the deployment settings above for `staging`, then enter
   `username:password` at the hidden prompt below. Use a username without spaces
   or colons. Keep the password in your password manager. Do not enable shell
   tracing (`set -x`) while handling credentials.

    ```sh
    STAGING_BASIC_AUTH="$(python3 -c 'import getpass; print(getpass.getpass("Staging username:password: "))')" && export STAGING_BASIC_AUTH
    ```

2. Create a secret containing only the digest. This command prints its ARN and
   version ID, which identify the secret without revealing the password.
   Secrets Manager storage incurs AWS charges.

    ```sh
    (
      set -e
      set -o pipefail
      node --input-type=module -e '
        import { sha256, stagingAuthorization } from "./scripts/site-release.mjs";
        console.log(JSON.stringify({ authorizationSha256: sha256(stagingAuthorization("staging")) }));
      ' | aws secretsmanager create-secret \
        --region "$AWS_REGION" \
        --name "$SITE_STACK/access" \
        --tags Key=Project,Value=static-site Key=Environment,Value=staging \
        --secret-string file:///dev/stdin \
        --query '{ARN:ARN,VersionId:VersionId}' \
        --output json
    )
    ```

3. Copy the returned identifiers into these settings. CloudFormation needs
   `secretsmanager:GetSecretValue` on this secret; a customer-managed encryption
   key also requires the relevant `kms:Decrypt` permission. The GitHub deployment
   role does not need access to Secrets Manager.

    ```sh
    export SITE_STAGING_AUTH_SECRET_ARN="PASTE_SECRET_ARN_HERE"
    export SITE_STAGING_AUTH_SECRET_VERSION_ID="PASTE_VERSION_ID_HERE"
    ```

4. Create the GitHub `staging` environment if needed and save the same
   `username:password` value as its `STAGING_BASIC_AUTH` secret. This sends the
   value over standard input rather than including it in command arguments.

    ```sh
    printf '%s' "$STAGING_BASIC_AUTH" | gh secret set STAGING_BASIC_AUTH \
      --repo "$SITE_REPOSITORY" \
      --env staging
    ```

Expected result: AWS stores the digest and GitHub stores the credentials.
Neither action changes access to the live site. Keep `STAGING_BASIC_AUTH` in
the terminal environment for local `publish`, `rollback`, `adopt`, and `verify`
commands; unset it when finished. Production commands ignore this setting.

## 4. Preview the infrastructure changes

A **change set** previews the resources AWS would create or update. This command
prepares a change set without creating the website's resources. For a new stack,
AWS may show a stack record with status `REVIEW_IN_PROGRESS` while it awaits
execution.

```sh
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK" \
  --template-file infra/site.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment="$SITE_ENVIRONMENT" \
    GitHubRepository="$SITE_REPOSITORY" \
    GitHubOidcSubjectPrefix="${SITE_OIDC_SUBJECT_PREFIX:?Read the GitHub OIDC prefix before continuing}" \
    ExistingOidcProviderArn="$SITE_OIDC_ARN" \
    StagingAuthSecretArn="${SITE_STAGING_AUTH_SECRET_ARN:-}" \
    StagingAuthSecretVersionId="${SITE_STAGING_AUTH_SECRET_VERSION_ID:-}" \
  --no-execute-changeset
```

The command prints a change-set ARN. Copy that ARN into this setting:

```sh
export SITE_CHANGE_SET_ARN="PASTE_CHANGE_SET_ARN_HERE"
```

Inspect the proposed changes:

```sh
aws cloudformation describe-change-set \
  --region "$AWS_REGION" \
  --change-set-name "$SITE_CHANGE_SET_ARN" \
  --query 'Changes[].ResourceChange.{Action:Action,Resource:LogicalResourceId,Type:ResourceType,Replacement:Replacement}' \
  --output table
```

For a new stack, expect additions for the bucket, distribution, access policies,
URL function, staging response headers policy, and deployment role. The distribution
uses AWS-managed cache policies. An identity provider is also added if one does
not already exist. Review the changes before continuing.

## 5. Create the staging resources

Executing the change set creates AWS resources that may incur charges.

```sh
aws cloudformation execute-change-set \
  --region "$AWS_REGION" \
  --change-set-name "$SITE_CHANGE_SET_ARN"

aws cloudformation wait stack-create-complete \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK"
```

CloudFront setup can take several minutes. If the waiter times out, check the
stack status before attempting another deployment:

```sh
aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK" \
  --query 'Stacks[0].StackStatus' \
  --output text
```

Expected result: `CREATE_COMPLETE`. If the status is still `CREATE_IN_PROGRESS`,
wait again. If the stack reports a failure, use the troubleshooting section below.

## 6. Read the deployment outputs

```sh
aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK" \
  --query 'Stacks[0].Outputs' \
  --output table
```

The outputs include:

- `BucketName` — Destination for website files and release archives
- `DistributionId` — CloudFront identifier
- `SiteUrl` — Public website address
- `DeployRoleArn` — Role GitHub will use
- `OidcProviderArn` — Shared GitHub identity provider

The website may return an access error until its files are uploaded.

## 7. Prepare the website build

```sh
npm ci
npm run check
npm run build
```

Expected result: the generated website appears in `build/client/`. The publishing
step must upload that directory into the bucket's `site/` prefix. A **prefix**
is the beginning of an S3 object's name, used here like a folder.

## 8. Save and upload a staging release

Use Node.js 24 and the AWS CLI from the repository root. Build from a committed
checkout so the manifest's full commit SHA identifies the source. For an existing
site, first [register and adopt its current release](#register-an-existing-release)
so the first new deployment can record the previous release.

The release tool packages the build, records each file's checksum and HTTP
metadata, archives it without overwriting an existing release, uploads assets
before HTML, invalidates CloudFront, and verifies every file before recording
success. An **invalidation** removes CloudFront's cached responses; it does not
clear visitors' browser caches.

```sh
(
  set -e
  export AWS_REGION="us-east-1"
  export AWS_PAGER=""
  export SITE_ENVIRONMENT="staging"

  stack_output() {
    aws cloudformation describe-stacks \
      --stack-name static-site-staging \
      --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" \
      --output text
  }

  export S3_BUCKET="$(stack_output BucketName)"
  export CLOUDFRONT_DISTRIBUTION_ID="$(stack_output DistributionId)"
  export SITE_URL="$(stack_output SiteUrl)"
  SITE_RELEASE_ID="$(git rev-parse --short=12 HEAD)-$(date -u +%Y%m%dT%H%M%SZ)"
  SITE_RELEASE_CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  SITE_RELEASE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$SITE_RELEASE_DIR"' EXIT

  node scripts/site-release.mjs package \
    --source build/client --directory "$SITE_RELEASE_DIR" \
    --release-id "$SITE_RELEASE_ID" --commit-sha "$(git rev-parse HEAD)" \
    --created-at "$SITE_RELEASE_CREATED_AT" \
    --output "$SITE_RELEASE_DIR/info.json"

  SITE_MANIFEST_SHA256="$(node -p \
    'JSON.parse(require("node:fs").readFileSync(process.argv[1])).manifestSha256' \
    "$SITE_RELEASE_DIR/info.json")"

  node scripts/site-release.mjs publish \
    --directory "$SITE_RELEASE_DIR" --release-id "$SITE_RELEASE_ID" \
    --manifest-sha256 "$SITE_MANIFEST_SHA256"
)
```

Expected result: every file passes status, MIME type, cache-header, and content
checks. The summary records the archive and manifest hashes, full source commit,
invalidation ID, elapsed time, and previous release. The private
`releases/state.json` object changes only after verification succeeds. Complete
the browser checks in step 9 as well.

HTML files are replaced individually, so publishing is not an atomic switch
across all pages. If uploading or verification fails, active/previous references
stay unchanged and the state records the failed operation. Follow the
[application rollback procedure](#restore-a-selected-release) to restore service.
Previous hashed assets remain available for cached pages.

## 9. Verify staging

Run the following block from the same checkout used to build the release. It
reads current stack outputs, checks all four pages, samples a generated JavaScript
and CSS file, and checks public access. Use your operator AWS identity for these
checks; the GitHub deployment role does not grant bucket-policy inspection.
Set `STAGING_BASIC_AUTH` using the hidden prompt in **Set up staging credentials**
before running this block. The helper sends the header through standard input,
does not follow redirects, and disables local curl configuration files.

```sh
(
  set -e
  export AWS_REGION="us-east-1"
  export AWS_DEFAULT_REGION="$AWS_REGION"
  export AWS_PAGER=""

  stack_output() {
    aws cloudformation describe-stacks \
      --stack-name static-site-staging \
      --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" \
      --output text
  }

  SITE_BUCKET="$(stack_output BucketName)"
  SITE_URL="$(stack_output SiteUrl)"

  staging_curl() {
    node --input-type=module -e '
      import { stagingAuthorization } from "./scripts/site-release.mjs";
      console.log("header = \"Authorization: " + stagingAuthorization("staging") + "\"");
    ' | curl --disable --proto '=https' --config - "$@"
  }

  for SITE_PATH in / /about /faq /privacy-policy; do
    staging_curl --fail --silent --show-error --head --max-time 30 \
      --write-out 'Checked %{url_effective}: %{http_code}\n' \
      "$SITE_URL$SITE_PATH"
  done

  SITE_JS="$(find build/client/assets -type f -name '*.js' -print -quit)"
  SITE_CSS="$(find build/client/assets -type f -name '*.css' -print -quit)"

  for SITE_ASSET in "$SITE_JS" "$SITE_CSS"; do
    test -n "$SITE_ASSET"
    staging_curl --fail --silent --show-error --head --max-time 30 \
      --write-out 'Checked %{url_effective}: %{http_code}\n' \
      "$SITE_URL/${SITE_ASSET#build/client/}"
  done

  staging_curl --fail --silent --show-error --max-time 30 "$SITE_URL/robots.txt"
  staging_curl --fail --silent --show-error --max-time 30 "$SITE_URL/sitemap.xml"

  curl --disable --silent --show-error --head --max-time 30 "$SITE_URL/"

  aws s3api get-public-access-block --bucket "$SITE_BUCKET"
  aws s3api get-bucket-policy-status --bucket "$SITE_BUCKET"

  staging_curl --silent --show-error --output /dev/null --max-time 30 \
    --write-out 'Missing asset status: %{http_code}\n' \
    "$SITE_URL/assets/intentionally-missing.js"

  curl --silent --show-error --output /dev/null --max-time 30 \
    --write-out 'Anonymous S3 status: %{http_code}\n' \
    "https://$SITE_BUCKET.s3.$AWS_REGION.amazonaws.com/site/index.html"
)
```

Compare the output with these expected results. The commands display headers and
access settings; they do not automatically assert every value in this table.

| Check                          | Expected result                                         |
| ------------------------------ | ------------------------------------------------------- |
| All four page URLs             | `200` with `Content-Type: text/html; charset=utf-8`     |
| HTML caching                   | `Cache-Control: private, no-store`                      |
| Sample JavaScript and CSS      | `200` with appropriate JavaScript and CSS content types |
| Hashed asset browser caching   | `Cache-Control: private, no-store`                      |
| Staging indexing               | `X-Robots-Tag: noindex`                                 |
| Anonymous staging request      | `401` with a `WWW-Authenticate: Basic` challenge        |
| `robots.txt` and `sitemap.xml` | Actual text and XML contents, rather than homepage HTML |
| S3 public-access blocks        | All four values `true`                                  |
| S3 policy status               | `IsPublic: false`                                       |
| Missing asset                  | `403` or `404`, rather than successful HTML             |
| Anonymous direct S3 request    | `403`                                                   |

A missing S3 object can return `403` when the requesting identity lacks permission
to list the bucket. That result is expected for this CloudFront configuration.
See [S3 object access permissions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).
The sitemap retains the application's configured production URLs.

Finish with a browser check:

1. Open the website address printed by the upload command in a new private window and confirm that it asks for credentials before showing content; enter your staging username and password
2. In **Text to slugify**, enter `Hello, World!` and confirm **Generated slug** shows `hello-world`
3. Append ` Again` and confirm the result immediately changes to `hello-world-again`
4. Press Tab to focus **Copy generated slug**, then Enter, and confirm the copy-success message appears
5. Open **About**, **FAQ**, and **Privacy Policy**, refreshing each page to verify direct loading

Keep the release ID, verification time, and results with your deployment notes.
HTTP success alone does not prove that the browser application is working.

## File layout and caching

The upload commands use this S3 layout:

```text
site/
  index.html
  about/index.html
  faq/index.html
  privacy-policy/index.html
  assets/

releases/
  state.json
  v1/
    RELEASE_ID/
      site.tar.gz
      SHA256SUMS
      manifest.json
```

CloudFront can read `site/`. It cannot read the private archives under
`releases/`. Production is public through CloudFront; staging requires credentials
on every request.

Apply these headers when uploading:

| File type                 | Cache-Control                        |
| ------------------------- | ------------------------------------ |
| HTML                      | `no-cache,max-age=0,must-revalidate` |
| Hashed files in `assets/` | `public,max-age=31536000,immutable`  |
| Unhashed public files     | `no-cache,max-age=0,must-revalidate` |

Hashed asset names change when their contents change. Upload assets before HTML
and keep previous hashed assets available so older pages and rollback releases
can still load their dependencies. Upload-time headers are necessary; the
template alone does not set these headers on S3 objects.

### CloudFront cache policies and the Free plan

The distribution uses two AWS-managed cache policies:

| Path            | Managed policy     | Behavior                                                                         |
| --------------- | ------------------ | -------------------------------------------------------------------------------- |
| `/assets/*`     | `CachingOptimized` | Cache hashed assets for up to one year using their upload-time headers           |
| Everything else | `CachingDisabled`  | Fetch HTML and unversioned files from S3 on each request that reaches CloudFront |

Both behaviors run the viewer-request function, preserving staging authentication
and canonical hostname redirects. Staging also applies its `noindex` and browser
`no-store` response headers to both behaviors. Disabling edge caching for HTML
and unversioned files increases S3 requests; hashed assets remain cached.

To resolve **You're using configuration not available in this tier: custom cache policies**:

1. Follow **Update an existing stack** to create a change set with this template, preserving the stack's current parameters
2. Confirm the change set modifies `Distribution` without replacement and removes `CachePolicy`; investigate any additional resource changes
3. Execute the reviewed change set and wait for the stack update and CloudFront deployment to finish
4. Verify page content, assets, redirects, and staging authentication, then retry Free plan enrollment in the CloudFront console

Expected result: the distribution no longer uses a custom cache policy. Updating
the template or publishing site files alone does not update the deployed distribution.

The Free plan supports managed cache policies, but excludes custom response
header policies too. Staging still uses `StagingResponseHeaders` to protect its
browser caching and indexing behavior, so this cache-policy change alone does
not make staging eligible for the Free plan. If enrollment reports another
unsupported feature, review that feature separately. See
[CloudFront pricing plan features](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
and [AWS-managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html).

### Page URL handling

The CloudFront function maps these URLs, including trailing-slash variants, to
generated HTML:

| URL               | Generated file              |
| ----------------- | --------------------------- |
| `/`               | `index.html`                |
| `/about`          | `about/index.html`          |
| `/faq`            | `faq/index.html`            |
| `/privacy-policy` | `privacy-policy/index.html` |

Update the mapping if supported routes change. Missing assets and unknown paths
remain errors instead of returning homepage HTML.

## GitHub deployment settings

Create GitHub environments named `staging` and `production`. Add these variables
to each environment using its own stack outputs:

| Variable                     | Value             |
| ---------------------------- | ----------------- |
| `AWS_REGION`                 | Deployment region |
| `AWS_ROLE_ARN`               | `DeployRoleArn`   |
| `S3_BUCKET`                  | `BucketName`      |
| `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId`  |
| `SITE_URL`                   | `SiteUrl`         |

Add `STAGING_BASIC_AUTH` as an **environment secret** on `staging`, using the
`username:password` value from **Set up staging credentials**. Do not add it to
production. The reusable publishing workflow reads the selected environment's
secret for both deployment and rollback. Keep `secrets: inherit` on the staging
deployment and rollback jobs that call this workflow. This works around a
[reported GitHub Actions issue](https://github.com/actions/runner/issues/4453)
where environment secrets resolve to empty values without inheritance.

Restrict both environments to the `main` branch. Require a reviewer for
production and disable administrator bypass. The environment restrictions enforce
the branch policy because the AWS trust rule identifies the repository and
environment, rather than a branch.

The publishing jobs request `id-token: write` and use their target GitHub
environment to assume its role. The build job has only `contents: read`. The role grants file
publishing and cache invalidation permissions; infrastructure changes use the
operator's separate AWS identity. OIDC lets GitHub request temporary credentials
without storing AWS access keys in GitHub. See
[GitHub's AWS OIDC guide](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

## Rotate the staging password

1. Pause new releases and enter the new credentials using the hidden prompt in
   **Set up staging credentials**
2. Store a new digest version in the existing secret

    ```sh
    (
      set -e
      set -o pipefail
      node --input-type=module -e '
        import { sha256, stagingAuthorization } from "./scripts/site-release.mjs";
        console.log(JSON.stringify({ authorizationSha256: sha256(stagingAuthorization("staging")) }));
      ' | aws secretsmanager put-secret-value \
        --region "$AWS_REGION" \
        --secret-id "$SITE_STAGING_AUTH_SECRET_ARN" \
        --secret-string file:///dev/stdin \
        --query '{ARN:ARN,VersionId:VersionId}' \
        --output json
    )
    ```

3. Set `SITE_STAGING_AUTH_SECRET_VERSION_ID` to the returned version ID and update
   the GitHub staging secret with the command in **Set up staging credentials**
4. Preview the staging stack update; omitted parameters retain their current values

    ```sh
    aws cloudformation deploy \
      --region "$AWS_REGION" \
      --stack-name "$SITE_STACK" \
      --template-file infra/site.yaml \
      --capabilities CAPABILITY_IAM \
      --parameter-overrides \
        Environment=staging \
        StagingAuthSecretArn="${SITE_STAGING_AUTH_SECRET_ARN:?Set the staging secret ARN}" \
        StagingAuthSecretVersionId="${SITE_STAGING_AUTH_SECRET_VERSION_ID:?Set the staging secret version}" \
      --no-execute-changeset
    ```

5. Inspect and execute the returned change set using the commands in steps 4–5,
   waiting with `stack-update-complete` instead of `stack-create-complete`
6. Verify that the new password works and the old password receives `401`
7. Resume releases and run `unset STAGING_BASIC_AUTH` in the local terminal

Changing a Secrets Manager value alone does not refresh deployed function code.
The explicit version parameter makes rotation an intentional CloudFormation
update and supports reverting to a known version. Retain any secret version
needed for infrastructure rollback. The secret is managed separately from the
stack; retiring the stack does not delete it. See
[CloudFormation secret references](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html).

## Keep staging and CloudFront addresses out of search results

Staging's password requirement prevents Google from reading the content.
CloudFront also adds `X-Robots-Tag: noindex` to staging responses, including
authentication failures. This header is an additional indexing directive;
the password requirement is the access control. Do not add `noindex` to the
shared HTML build, because that would also affect production.

Keep the shared `robots.txt` crawl rules unchanged. A `Disallow: /` rule can
prevent Google from seeing indexing directives and does not guarantee that a
URL disappears from search. Google recommends password protection for private
content and eventually removes previously indexed protected content. For faster
removal of existing results, use Search Console's temporary Removals tool for
the affected staging property while keeping password protection enabled. See
[Google's content controls](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share),
[noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing),
and [removal instructions](https://developers.google.com/search/docs/crawling-indexing/remove-information).

When `PrimaryDomainName` is configured, production's generated CloudFront
hostname returns a permanent `301` redirect to that domain, preserving the path
and query parameters. Google uses this as a signal to index the destination.
Verify this redirect after infrastructure changes; a production stack without
a primary domain still serves its generated hostname publicly. See
[Google's redirect guidance](https://developers.google.com/search/docs/crawling-indexing/301-redirects).

## Troubleshoot staging access

| Symptom                                            | Check                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Stack update rejects missing credentials           | Set both `StagingAuthSecretArn` and `StagingAuthSecretVersionId` for staging                                                     |
| CloudFormation cannot resolve the digest           | Check the secret ARN, version ID, `authorizationSha256` JSON key, and execution identity's secret/key permissions                |
| Correct browser credentials receive `401`          | Recompute the digest from the exact UTF-8 `username:password`, deploy the matching secret version, and retry in a private window |
| Deployment reports missing or rejected credentials | Set the staging environment secret in GitHub or `STAGING_BASIC_AUTH` locally; confirm it matches the deployed digest             |
| Deployment reports staging is unprotected          | Confirm the staging stack's latest update completed with both authentication secret parameters set                               |
| Verification fails on indexing or cache headers    | Confirm the staging response headers policy is attached and deployed                                                             |
| Google still lists a staging URL                   | Keep authentication enabled; removal requires recrawling or a Search Console removal request                                     |

## Create the production stack

Complete staging setup and verification before creating production. Use the same
`infra/site.yaml` template to create a separate bucket, CloudFront distribution,
and deployment role. Reuse the existing GitHub identity provider:

```sh
SITE_OIDC_ARN="$(
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name static-site-staging \
    --query "Stacks[0].Outputs[?OutputKey=='OidcProviderArn'].OutputValue | [0]" \
    --output text
)"
```

Confirm the command succeeded and returned an ARN, then set:

```sh
export SITE_OIDC_ARN
export SITE_ENVIRONMENT="production"
export SITE_STACK="static-site-production"
```

Repeat steps 4–6 for the production stack, including the exact GitHub OIDC subject
prefix obtained in step 1. Review the new change set before execution. Expect new
production resources and no replacement of staging resources. Keep the staging
stack's original identity-provider ownership parameter unchanged.

Expected result: `static-site-production` reaches `CREATE_COMPLETE` and returns
its own bucket, distribution, deployment role, and HTTPS URL. The production URL
initially uses the CloudFront hostname. The custom domain is configured
separately; see [Production domain](#production-domain).

## Configure production approval

1. Open the repository's **Settings**, then **Environments**
2. Create an environment named exactly `production`
3. Enable **Required reviewers** and select the maintainer who approves releases
4. For a sole maintainer, leave **Prevent self-review** unchecked so the person who triggered the run can approve it
5. Deselect **Allow administrators to bypass configured protection rules**
6. Under **Deployment branches and tags**, select **Selected branches and tags** and add a branch rule for `main` only
7. Add the five **Environment variables** from the production stack outputs, using the table above
8. Confirm that `staging` also permits only the `main` branch

Self-review provides a manual approval gate. It does not provide an independent
second-person review. Required reviewers depend on repository visibility and
GitHub plan; see [Managing environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

To populate production variables from the terminal, first confirm `SITE_REPOSITORY`
and `AWS_REGION` are set as in step 1. Run this block only after production reaches
`CREATE_COMPLETE`:

```sh
(
  set -eu
  SITE_STACK="static-site-production"
  set_output_variable() {
    local variable="$1" output="$2" value
    value="$(aws cloudformation describe-stacks \
      --region "$AWS_REGION" --stack-name "$SITE_STACK" \
      --query "Stacks[0].Outputs[?OutputKey=='$output'].OutputValue | [0]" \
      --output text)"
    test -n "$value" && test "$value" != None
    gh variable set "$variable" --repo "$SITE_REPOSITORY" \
      --env production --body "$value"
  }
  gh variable set AWS_REGION --repo "$SITE_REPOSITORY" \
    --env production --body "$AWS_REGION"
  set_output_variable AWS_ROLE_ARN DeployRoleArn
  set_output_variable S3_BUCKET BucketName
  set_output_variable CLOUDFRONT_DISTRIBUTION_ID DistributionId
  set_output_variable SITE_URL SiteUrl
  gh variable list --repo "$SITE_REPOSITORY" --env production
)
```

The production role expects the exact `GitHubOidcSubjectPrefix` followed by
`:environment:production`. Staging expects the same prefix followed by
`:environment:staging`. Environment branch rules restrict the branch because
these AWS identities name environments rather than branches.

## Deploy staging and promote to production

`.github/workflows/deploy-staging.yaml` starts on pushes to `main`, including
merged pull requests, or a manual run on `main`. Pull requests and other branches
do not deploy. `.github/workflows/publish-site.yaml` is a reusable workflow called
by the staging and production jobs; it has no standalone manual trigger.

Complete the [infrastructure automation setup](infrastructure-delivery.md)
before enabling this workflow. Infrastructure and website deployment use
separate AWS roles. Run the same AWS linters locally with
`sh scripts/check-infrastructure.sh`; Docker provides the pinned tools.

The publishing job allows up to three hours, with matching infrastructure
execution credentials. If the infrastructure roles already exist, follow
[Update existing infrastructure roles](infrastructure-delivery.md#update-existing-infrastructure-roles)
before running the updated workflow. Staging secret access is limited to its
authentication secret. Production verification requires all six monitoring
alarms to notify the monitoring stack's SNS topic for both alarm and recovery
events.

The run follows this sequence:

1. **Validate infrastructure** checks the CloudFormation templates, Guard rules and regression cases, and Python tests without AWS credentials; **Check and package** then runs `npm ci`, `npm run check`, and `npm run build`
2. The build packages `build/client/`, creates `SHA256SUMS` and `manifest.json`, and saves all three files as one immutable GitHub artifact retained for seven days
3. **Plan staging infrastructure** prepares and inspects change sets from the merged commit; **Publish and verify staging** applies them and verifies the current release before publishing and verifying the new artifact
4. **Plan production infrastructure** runs only after staging succeeds and records the domain, hosting, and monitoring change sets in the workflow summary; **Publish and verify production** then waits for the production environment's required reviewer
5. After approval, production verifies the saved plan, applies infrastructure, verifies the existing release, and publishes the same checked artifact without rebuilding

Each release ID combines the first 12 characters of the commit SHA, the GitHub
run ID, and the build attempt number. Each environment archives the package under
`releases/v1/RELEASE_ID/`, uploads assets before HTML with explicit manifest cache
headers, and waits for its CloudFront invalidation to finish.

The shared publishing job compares every manifest file and all four page routes,
including trailing-slash variants, with the packaged contents. It checks HTTP
status, content type, and cache headers, confirms missing assets and unknown
routes return `403` or `404`, and confirms anonymous direct S3 homepage access
returns `403`. Successful evidence is saved in state and as a GitHub artifact
retained for 30 days.

### Approve and verify a release

1. Merge the workflow changes into `main` after both environments are configured
2. Open **Actions**, select **Deploy staging and production**, and open the run for the merge commit
3. Wait for staging verification to succeed, then open the staging site and complete the browser checks in step 9
4. Review the staging deployment summary and record its release ID, commit, artifact ID, and archive SHA-256
5. Select **Review deployments**, select `production`, and choose **Approve and deploy** only if the staging checks are satisfactory
6. Wait for production publishing and HTTP verification to succeed
7. Confirm the production summary shows the same release ID, commit, artifact ID, and SHA-256 as staging
8. Open the production website link and repeat the browser checks in step 9

Expected result: both environments serve the same tested release; both summaries
report successful archiving and HTTP verification. Record the two invalidation
IDs as deployment evidence. Reject the deployment if staging browser checks fail.

The existing `aws-staging` concurrency group now serializes the whole promotion
flow, including production approval. A waiting approval holds the queue, so the
staging site remains on the release under review. Approve or reject promptly.
New runs do not cancel an active run; GitHub may replace a pending run with a newer
pending run and does not guarantee ordering. Do not run manual S3 uploads while
an automated deployment is active. See [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

To build the current `main` branch again and start another promotion:

```sh
gh workflow run deploy-staging.yaml \
  --repo "$(gh repo view --json nameWithOwner --jq .nameWithOwner)" \
  --ref main
```

**Re-run jobs** uses the original run's commit. Re-running an older run can
replace newer content. Use a new **Run workflow** on `main` for the current source.
A production retry still requires approval and the original artifact. If that
artifact has expired, start a new run so staging tests the new package first.

## Troubleshoot automated deployment

Open the failed job and expand the first failed step before retrying.

| Symptom                                   | What to check                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Unsupported environment                   | Call the reusable workflow with exactly `staging` or `production`; other values fail validation                        |
| Missing deployment environment variable   | Add the named variable to the failing job's environment using that environment's stack outputs                         |
| Production is waiting                     | Complete staging browser checks, then use **Review deployments** to approve or reject the release                      |
| Later staging runs are pending            | Resolve the active run's production approval; the whole promotion shares one queue                                     |
| Branch deployment rejected                | Select `main` for manual runs and check both environment branch rules                                                  |
| OIDC or `AssumeRoleWithWebIdentity` error | Check `AWS_ROLE_ARN`, audience `sts.amazonaws.com`, exact immutable subject prefix, and the correct environment suffix |
| S3 upload or CloudFront `AccessDenied`    | Confirm bucket, distribution, and role variables all belong to the target environment's stack                          |
| Missing artifact or checksum failure      | Start a new run on `main`; both environments require the original verified artifact, which expires after seven days    |
| Invalidation waiter times out             | Inspect the invalidation ID printed in **Publish selected release and verify every file** using the command below      |
| HTTP verification fails                   | Check the failing URL, headers, and contents; stale files fail the byte comparison even when the status is `200`       |

To inspect an invalidation, replace both placeholders with values from the
failing environment's run:

```sh
aws cloudfront get-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --id INVALIDATION_ID \
  --query 'Invalidation.Status' \
  --output text
```

Failed staging checks block production. A failure after uploads start can leave
partially updated pages because S3 replaces files individually. The release tool
records the failed operation and preserves the last verified active and previous
release references. Use the rollback procedure below to restore a selected
archive without rebuilding it.

## Manage releases and application rollback

`scripts/site-release.mjs` uses Node.js built-ins and invokes the installed AWS
CLI, `tar`, and `curl`. Packaging additionally requires GNU tar 1.28+ and `gzip`.
It adds no npm dependency to the application.
Deployment and rollback use the same upload order, metadata, invalidation, and
verification code.

Packaging normalizes archive ordering, timestamps, ownership, permissions, and
gzip headers using [GNU tar's reproducibility guidance](https://www.gnu.org/software/tar/manual/html_node/Reproducibility.html).
Supply `--created-at` as a UTC ISO timestamp when the release identity is first
created. Reuse that timestamp, release ID, commit SHA, and identical built files
when repackaging the same release; the archive, manifest, and checksum file will
match byte for byte with the same GNU tar/gzip toolchain. Prefer retrying with the
original three packaged files. Normalization does not make two independent app
builds identical or allow replacing an existing archive with changed contents.

Both build and publishing workflows pin external actions to verified commit SHAs,
following [GitHub's action-pinning guidance](https://docs.github.com/en/actions/reference/security/secure-use).
Review upstream changes before updating these pins; the version comments identify
their release series. The package step rejects extraction failures, missing
hashes, and invalid SHA-256 values before writing any workflow outputs.

### Release records and integrity

- `releases/v1/RELEASE_ID/site.tar.gz` — Original packaged website
- `releases/v1/RELEASE_ID/manifest.json` — Full commit SHA, archive SHA-256, creation time, and every file's path, size, SHA-256, Content-Type, and Cache-Control
- `releases/v1/RELEASE_ID/SHA256SUMS` — Archive checksum for operator inspection
- `releases/state.json` — Active and previous releases, any pending operation, and the last successful HTTP verification evidence

The build passes the manifest checksum and immutable GitHub artifact ID to both
publishing jobs. Each job checks the manifest, archive, and unpacked files. S3
uploads use `If-None-Match: *`; an identical retry is accepted after comparing the
existing bytes, and conflicting contents fail. The bucket policy requires this
conditional creation under `releases/v1/`. Existing legacy archives stay under
their original prefixes. Administrators can still deliberately delete archives
or change the policy; this is not regulatory Object Lock.

Publishing and rollback workflows share one concurrency group, including the
production approval wait. CLI operations also acquire a lock through a
conditional write to `releases/state.json`.

### Configure CLI access to one environment

Run from the repository root. Choose the environment explicitly and obtain all
three destinations from the same stack:

```sh
export AWS_REGION="us-east-1"
export AWS_PAGER=""
export SITE_REPOSITORY="OWNER/REPOSITORY"
export SITE_ENVIRONMENT="staging"
export SITE_STACK="static-site-$SITE_ENVIRONMENT"

site_output() {
  aws cloudformation describe-stacks --stack-name "$SITE_STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" \
    --output text
}

export S3_BUCKET="$(site_output BucketName)"
export CLOUDFRONT_DISTRIBUTION_ID="$(site_output DistributionId)"
export SITE_URL="$(site_output SiteUrl)"

node scripts/site-release.mjs state
```

Expected result: state for the selected bucket. A new installation has null
active/previous references. An existing initialized installation shows the
release IDs and manifest hashes needed for recovery.

### Register an existing release

Archives created before this procedure have no manifest. Import the currently
published archive and an earlier known-good archive before rehearsing rollback.
For each archive, obtain its full commit SHA and checksum from its successful
workflow run or saved deployment evidence. The short prefix alone is not enough
to establish provenance. Set these values from that evidence:

```sh
export SITE_RELEASE_ID="RELEASE_ID_FROM_SUCCESSFUL_RUN"
export SITE_COMMIT_SHA="FULL_40_CHARACTER_COMMIT_SHA"
export SITE_ARCHIVE_SHA256="ARCHIVE_SHA256_FROM_SUCCESSFUL_RUN"

node scripts/site-release.mjs import-legacy \
  --release-id "$SITE_RELEASE_ID" --commit-sha "$SITE_COMMIT_SHA" \
  --archive-sha256 "$SITE_ARCHIVE_SHA256"
```

This verifies the original archive checksum, records explicit metadata, and
creates a manifest-backed copy under `releases/v1/` without rebuilding or changing
the website. It leaves the original archive intact. Then adopt only the archive
that currently matches the live site:

```sh
node scripts/site-release.mjs adopt --release-id "$SITE_RELEASE_ID"
```

Adoption checks every public file before initializing active state. It does not
upload website files and refuses to replace an already initialized active
release. If it fails, verify the selected release and current MIME/cache metadata
before proceeding. Importing an archive does not mark it active or prove that it
was previously deployed successfully.

### Restore a selected release

For routine rollback, use the **Roll back site** workflow on the default
branch. Select a known-good release that exists in the target environment's
manifest-backed S3 archive:

```sh
gh workflow run rollback-site.yaml --repo "$SITE_REPOSITORY" --ref main \
  -f environment=staging -f release-id=KNOWN_GOOD_RELEASE_ID

gh run list --repo "$SITE_REPOSITORY" --workflow rollback-site.yaml --limit 5
```

To restore production, use `-f environment=production`. Review and approve that
run in the protected GitHub production environment. The workflow downloads the
archive from that environment's bucket, verifies it, restores assets before HTML,
invalidates CloudFront, and verifies every file and all four routes. It runs no
build or dependency installation. The same release remains available after
GitHub's seven-day build-artifact retention expires.

For an operator-led **staging** rehearsal, using the CLI environment above:

Confirm no deployment is running, record the current release and baseline
verification, and keep the original archive ready. Stop before uploading if the
environment is not staging or an archive check fails. If restoration or HTTP
verification fails, retain the error and restore the original known-good release
before continuing the exercise. Production is outside the rehearsal scope.

```sh
node scripts/site-release.mjs verify \
  --release-id CURRENT_RELEASE_ID --output "$HOME/staging-before.json"
node scripts/site-release.mjs rollback \
  --release-id KNOWN_GOOD_RELEASE_ID --output "$HOME/staging-rollback.json"
node scripts/site-release.mjs state
node scripts/site-release.mjs rollback \
  --release-id CURRENT_RELEASE_ID --output "$HOME/staging-restored.json"
```

Expected result: successful HTTP verification, a recorded recovery duration, and
active/previous references that reflect each successful restoration. After each
restore, check real-time slug generation, copying, and direct loads/refreshes on
all four pages. This restores website files only; it does not change DNS or
infrastructure.

Registering an older archive does not change active/previous history. A successful
publication of a different release moves the existing active release to
`previous`; restoring the current release preserves the existing previous
reference. Do not edit state manually or use `adopt` on an initialized environment.

### Recover an interrupted operation

A normal caught failure records `pending.status=failed`; the next rollback may
recover it. A killed or timed-out process can leave a running operation ID.
Confirm the original workflow or CLI process has stopped before taking over its
lock. Cancel an abandoned approval-waiting run before requesting an urgent
rollback, since both workflows share the promotion concurrency group.

```sh
node scripts/site-release.mjs state
node scripts/site-release.mjs rollback \
  --release-id KNOWN_GOOD_RELEASE_ID \
  --recover-operation EXACT_PENDING_OPERATION_ID
```

The workflow exposes the same optional `recover-operation` input. A wrong ID is
rejected. Do not clear or overwrite the state object manually; active/previous
references and its conditional-write ETag are part of the recovery safeguards.

### Retention and cleanup

Retain the active release, previous release, newest ten manifest-backed releases,
and every release younger than 30 days. Keep original legacy archives and all
published hashed assets. This deliberately avoids deleting files still needed
by cached pages or a rollback; storage remains part of the monthly cost review.
There is no blanket age-based S3 expiration rule.

Preview eligible archive cleanup using an operator identity:

```sh
node scripts/site-release.mjs prune
```

The plan fails while an operation is pending or before active state is
initialized. Review the candidates, then explicitly apply a fresh plan:

```sh
node scripts/site-release.mjs prune --apply
```

The result reports `dryRun: false` for `--apply`, including when there are no
eligible archives; plan-only runs report `dryRun: true`.

Cleanup locks release operations, rechecks active/previous protection, and deletes
all S3 versions and delete markers only within eligible `releases/v1/RELEASE_ID/`
archive prefixes. It never deletes `site/` assets, legacy archives, or state
history. This is permanent deletion. The GitHub deployment role has no deletion
permissions; operator cleanup additionally requires `s3:ListBucketVersions` and
`s3:DeleteObjectVersion`. Do not grant these permissions to the publishing role.

### Troubleshoot cache and rollback checks

- A `200` response can still contain stale content; compare its SHA-256 with the selected manifest
- A warm CloudFront asset cache can hide an origin failure; complete an invalidation or use a never-requested object path before checking origin access, since the managed asset policy excludes query strings and a random query parameter does not bypass it
- HTML and unversioned public files require revalidation; hashed assets use a one-year immutable cache policy
- The script records status, MIME type, cache headers, CloudFront cache result, and content checks for every manifest file and each supported page route
- Missing resources must return `403` or `404`; successful fallback HTML is a failure
- A failed upload can leave mixed pages; rollback restores the selected manifest's files and retains older hashed assets
- If a new file extension appears, define and test its MIME type in the release tool before deployment

## Production domain

`infra/domain.yaml` manages the production Route 53 hosted zone, the apex and
`www` website records, an optional Google verification TXT record, and a
DNS-validated ACM certificate. Domain registration stays with the existing
registrar. The production pipeline updates this stack before production hosting
and preserves its current parameter values.

- Keep `EnableCertificate=true` and `TrafficTarget=cloudfront`; the certificate is attached to the production distribution
- Keep the ACM validation CNAMEs in Route 53 so the certificate renews automatically
- Do not change `DomainName` or replace the hosted zone
- Change stack-managed records through the template; records added directly in Route 53, such as mail or service records, are not managed by this stack
- `PreviousIpv4Addresses` and `PreviousWwwTarget` still hold the former host's values and are unused while `TrafficTarget` is `cloudfront`
- Deleting the stack retains the zone, records, and certificate

The production site stack sets `PrimaryDomainName` and `CertificateArn`. Its
CloudFront hostname and `www` return a `301` redirect to the HTTPS apex domain,
so GitHub's production `SITE_URL` variable must use the stack's `SiteUrl`
output rather than the CloudFront hostname.

## Update an existing stack

Keep `GitHubOidcSubjectPrefix` set. An empty value falls back to the older
name-only trust policy, which rejects tokens from a repository using immutable
subjects. If the repository is renamed, transferred, or changes its OIDC subject
configuration, repeat the prefix lookup in step 1 and override only
`GitHubOidcSubjectPrefix` in a new change set. Do not broaden the trust policy
with wildcards to make authentication pass.

Set `SITE_STACK` to the existing stack you intend to update. Preserve its current
parameters by omitting `--parameter-overrides`:

```sh
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK" \
  --template-file infra/site.yaml \
  --capabilities CAPABILITY_IAM \
  --no-execute-changeset
```

Do not replace the original empty `ExistingOidcProviderArn` parameter with the
ARN of a provider owned by this stack. That changes the creation condition and
removes the retained provider from the stack's management.

Save the new change-set ARN and review it as in step 4. Review any replacement
or removal before execution. After executing the update, use the update waiter:

```sh
aws cloudformation execute-change-set \
  --region "$AWS_REGION" \
  --change-set-name "$SITE_CHANGE_SET_ARN"

aws cloudformation wait stack-update-complete \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK"
```

Expected result: `UPDATE_COMPLETE`. If AWS reports no changes, there is no new
change set to execute.

## Troubleshooting

### AWS reports access denied

Check the identity with `aws sts get-caller-identity`. The identity creating
infrastructure needs more permissions than the GitHub role used only to publish
website files.

### AWS reports that the GitHub identity provider already exists

For a new stack, repeat the identity-provider discovery step and create a new
change set using the discovered ARN. For an existing stack, first check whether
it already owns the provider before changing its parameters.

### CloudFront returns an error before the first upload

The infrastructure does not include website content. Build the application and
publish its output under `site/`.

### A stack deployment fails

Inspect the failure details:

```sh
aws cloudformation describe-events \
  --region "$AWS_REGION" \
  --stack-name "$SITE_STACK" \
  --filters FailedEvents=true
```

If the CLI does not recognize `describe-events`, update the AWS CLI. Address the
specific failure before retrying. A failed first deployment can leave a stack in
`ROLLBACK_COMPLETE`; inspect it before deciding whether to delete and recreate it.

## Resource retention

The S3 bucket and any GitHub identity provider created by the template are
retained when their stack is deleted. Retained files and S3 versions can continue
to incur storage charges. Keep the shared identity provider while other stacks
use it.

## AWS references

- [CloudFront origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront cache policy settings](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-cachepolicy-cachepolicyconfig.html)
- [AWS CLI CloudFormation deployment](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html)
- [GitHub OIDC with AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
