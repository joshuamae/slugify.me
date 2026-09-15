[![Netlify Status](https://api.netlify.com/api/v1/badges/939a795d-2add-4f4c-ab04-ca986d843ae6/deploy-status)](https://app.netlify.com/projects/slugify-me/deploys)
# slugify.me

slugify.me is a simple, open source, no-ads web app for turning text into URL-friendly slugs in real time

## Features

- Converts user input to a slug as it is typed
- Useful for URL paths, filenames, and other text identifiers
- Runs in the browser with no ads or backend required for its current functionality

## Pages and navigation

| Route             | Page                       | Purpose                                                                           |
|-------------------|----------------------------|-----------------------------------------------------------------------------------|
| `/`               | Slug Generator             | Converts text immediately as you type or paste, with a copy button for the result |
| `/about`          | About                      | Project background, design principles, and open source information                |
| `/faq`            | Frequently Asked Questions | Answers about slug rules, supported characters, privacy, and common uses          |
| `/privacy-policy` | Privacy Policy             | Privacy information and hosting-related disclosures                               |

The shared header links the **slugify.me** brand back to the generator and provides
About, FAQ, and GitHub links. The shared footer includes About, FAQ, Privacy Policy,
and GitHub links, together with the project's open source, ad-free, browser-local
processing statement. Each page defines its own title and description.

Slug generation happens locally in your browser. Text entered into the generator
is not uploaded or saved by the application, and there are no ads. The Privacy
Policy describes hosting-related request information separately. A shadcn TL;DR
card appears before the policy heading and summarizes browser-local processing,
open source verification, Netlify Observability logging, and the absence of ads
or tracking added by the project.

## Site structure

- `app/root.tsx` — Document shell and shared header, route outlet, and footer
- `app/routes.ts` — Route registration
- `app/routes/` — Home, About, FAQ, and Privacy Policy page components and metadata
- `app/components/layouts/` — Shared `SiteHeader` and `SiteFooter` components
- `app/features/slug-generator/` — Generator UI, pure slug conversion logic, and slug tests
- `app/routes.test.tsx` — Route rendering, metadata, shared layout, and navigation tests
- `public/` — Favicons, social images, and search discovery files
- `react-router.config.ts` — Client runtime and build-time pre-rendering configuration

## Search and browser metadata

- `public/robots.txt` — Public crawler access and the production sitemap location
- `public/sitemap.xml` — Canonical HTTPS URLs for every public page
- `public/apple-touch-icon.png` — 180×180 home-screen and bookmark icon derived from the existing favicon
- `public/social-preview.png` — 1200×630 Open Graph and Twitter preview image

Each route uses React 19 document metadata elements for its canonical URL,
page-specific title and description, and social metadata. React Router
pre-renders every public route so this metadata is present in the initial HTML
without requiring JavaScript. The document shell publishes shared Open Graph
and Twitter image metadata, keeps the existing ICO and SVG favicons, and links
the Apple touch icon.

When a public route is added, renamed, or removed, update `public/sitemap.xml`
in the same change. Keep every sitemap URL on `https://slugify.me`, include only
real public routes, and omit `<lastmod>` unless accurate modification dates can
be maintained. Update `public/robots.txt` only if the sitemap location or crawler
policy changes.

The site does not include `site.webmanifest` because it is not offered as an
installable or offline-capable web app. Add one only if that product scope
changes, together with the required installable icons and related testing.

## Slug rules

Generated slugs follow these rules:

- Text is converted to lowercase
- Unicode text is normalized and combining diacritic marks are removed (`Crème brûlée` becomes `creme-brulee`)
- Unicode letters and numbers are preserved (`東京 2026` becomes `東京-2026`)
- Apostrophes and quotation marks are removed without splitting words (`don't` becomes `dont`)
- Each run of whitespace, remaining punctuation, symbols, separators, or emoji becomes a single hyphen (`-`)
- Leading and trailing hyphens are removed. Input containing only separators produces an empty slug
- `C++` and `C#` are handled explicitly as `cpp` and `c-sharp`

## Tech stack

- React
- React Router
- TypeScript
- Vite
- npm

## Getting started

### Requirements

- Node.js
- npm

### Build from source

From the repository root, install dependencies and start the development server:

```sh
npm install
npm run dev
```

Create and preview a production build with:

```sh
npm run build
npm run preview
```

Netlify deployment settings and the rewrite to React Router's generated
`__spa-fallback.html` are defined in `netlify.toml`.

## Code quality

ESLint checks JavaScript, TypeScript, and React code for correctness, while
Prettier handles formatting. Run the complete set of checks with:

```sh
npm run check
```

The checks can also be run or fixed individually:

```sh
npm run typecheck
npm run lint
npm run lint:fix
npm run format:check
npm run format
npm test
```

Tests use Vitest with the existing React and React Router dependencies. They cover
slug conversion rules and render the actual page components with an in-memory
router to check route matching, shared layout, navigation destinations, About/FAQ
active-link attributes and styling, metadata exports, and back navigation.

These Node-based tests do not simulate keyboard input, screen readers, browser
hydration, responsive layouts, or the hosting platform's fallback behavior. Verify
those separately in a browser, including direct visits and refreshes on every route.

## Known limitations

- Character-specific replacements currently cover only `C++` and `C#`; other symbol-heavy terms follow the general separator rules
- The project is distributed from source; no npm package or release binaries are provided

## License

Licensed under the [GNU Affero General Public License, version 3 or later](LICENSE)

## Set up AWS hosting

The CloudFormation template in `infra/site.yaml` describes the AWS resources
needed to host the generated website. CloudFormation creates related resources
together as a **stack**. Use separate stacks for staging and production.

- **Staging** — A practice environment for testing deployments
- **Production** — The environment intended for visitors
- **S3** — Storage for the generated website files
- **CloudFront** — Public HTTPS delivery of those files
- **OIDC** — A way for GitHub to obtain temporary AWS deployment credentials

The template prepares hosting resources and a GitHub deployment role. Steps 8–9
below publish and verify a staging release manually. The [staging and production
workflow](#deploy-staging-and-promote-to-production) handles subsequent
releases. Each stack uses a generated CloudFront address;
custom domains and a production cutover are
separate changes. The current Netlify configuration remains the existing hosting
setup until a cutover is completed.

### Existing budget

Use the account's existing AWS budget. This template does not create or modify
budgets. Budget notifications do not automatically stop AWS charges.

### Before you start

Run commands from the repository root in Bash or Zsh. You need:

- AWS CLI installed and signed in
- GitHub CLI (`gh`) installed and signed in with access to the repository's OIDC settings
- AWS permissions to create the S3, CloudFront, and IAM resources in the template
- Node.js 24 and npm for building the website
- `curl`, `tar`, and `shasum` available in the terminal
- Your GitHub repository name in `OWNER/REPOSITORY` format

Confirm AWS access:

```sh
aws sts get-caller-identity
```

Expected result: AWS displays information about the signed-in identity. Check
that this is the account where you intend to create the website resources.

### 1. Set the deployment settings

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

### 2. Find an existing GitHub identity provider

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

### 3. Validate the template

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

### 4. Preview the infrastructure changes

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
cache policy, URL function, and deployment role. An identity provider is also
added if one does not already exist. Review the changes before continuing.

### 5. Create the staging resources

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

### 6. Read the deployment outputs

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

### 7. Prepare the website build

```sh
npm ci
npm run check
npm run build
```

Expected result: the generated website appears in `build/client/`. The publishing
step must upload that directory into the bucket's `site/` prefix. A **prefix**
is the beginning of an S3 object's name, used here like a folder.

### 8. Save and upload a staging release

Run this block from the repository root after a successful build. It targets
`static-site-staging` explicitly and reads the bucket, distribution, and website
address from that stack. Use the same checkout that produced the build; commit
source changes before building so the release's commit identifier describes its
contents.

The commands save a compressed copy of the build and a checksum under a unique
`releases/` prefix, upload assets before HTML, and then refresh CloudFront. An
**invalidation** asks CloudFront to remove cached responses so subsequent requests
can fetch the uploaded files. It does not clear visitors' browser caches. See
[CloudFront invalidation behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html).

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
  SITE_DISTRIBUTION="$(stack_output DistributionId)"
  SITE_URL="$(stack_output SiteUrl)"

  test -s build/client/index.html

  SITE_RELEASE_ID="$(git rev-parse --short=12 HEAD)-$(date -u +%Y%m%dT%H%M%SZ)"
  SITE_RELEASE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$SITE_RELEASE_DIR"' EXIT

  tar -czf "$SITE_RELEASE_DIR/site.tar.gz" -C build/client .

  (
    cd "$SITE_RELEASE_DIR"
    shasum -a 256 site.tar.gz > SHA256SUMS
  )

  aws s3 cp "$SITE_RELEASE_DIR/" \
    "s3://$SITE_BUCKET/releases/$SITE_RELEASE_ID/" \
    --recursive \
    --only-show-errors

  aws s3 cp build/client/assets/ \
    "s3://$SITE_BUCKET/site/assets/" \
    --recursive \
    --cache-control "public,max-age=31536000,immutable" \
    --only-show-errors

  aws s3 cp build/client/ \
    "s3://$SITE_BUCKET/site/" \
    --recursive \
    --exclude "assets/*" \
    --exclude ".vite/*" \
    --exclude "*.html" \
    --cache-control "no-cache,max-age=0,must-revalidate" \
    --only-show-errors

  aws s3 cp build/client/ \
    "s3://$SITE_BUCKET/site/" \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "no-cache,max-age=0,must-revalidate" \
    --only-show-errors

  SITE_INVALIDATION="$(
    aws cloudfront create-invalidation \
      --distribution-id "$SITE_DISTRIBUTION" \
      --paths "/*" \
      --query Invalidation.Id \
      --output text
  )"

  printf 'CloudFront invalidation: %s\n' "$SITE_INVALIDATION"

  aws cloudfront wait invalidation-completed \
    --distribution-id "$SITE_DISTRIBUTION" \
    --id "$SITE_INVALIDATION"

  printf '\nRelease saved: %s\nWebsite: %s\n' \
    "$SITE_RELEASE_ID" "$SITE_URL"
)
```

The outer parentheses keep temporary settings in a separate shell, and `set -e`
stops that shell if a command fails. The `EXIT` trap removes the temporary release
directory when that shell exits, after either success or failure. The terminal
may remain quiet during uploads and the CloudFront wait.

Expected result: the command prints the release ID and website address after the
invalidation completes. Save the release ID, and mark it successful only after
step 9 passes. If a command fails, inspect its error before retrying; an archive
can exist even if publishing failed. If only the invalidation waiter times out,
check that invalidation with `aws cloudfront get-invalidation` using the printed
ID and the stack's distribution ID before uploading again.

All uploads are scoped to the selected bucket's `site/` and `releases/` prefixes,
and the invalidation targets only its CloudFront distribution. These commands do
not delete previous assets. HTML files are replaced individually, so this is not
an atomic switch across every page. The archives provide the inputs for a later
rollback procedure; saving an archive alone does not verify recovery.

### 9. Verify staging

Run the following block from the same checkout used to build the release. It
reads current stack outputs, checks all four pages, samples a generated JavaScript
and CSS file, and checks public access. Use your operator AWS identity for these
checks; the GitHub deployment role does not grant bucket-policy inspection.

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

  for SITE_PATH in / /about /faq /privacy-policy; do
    curl --fail --silent --show-error --head --max-time 30 \
      --write-out 'Checked %{url_effective}: %{http_code}\n' \
      "$SITE_URL$SITE_PATH"
  done

  SITE_JS="$(find build/client/assets -type f -name '*.js' -print -quit)"
  SITE_CSS="$(find build/client/assets -type f -name '*.css' -print -quit)"

  for SITE_ASSET in "$SITE_JS" "$SITE_CSS"; do
    test -n "$SITE_ASSET"
    curl --fail --silent --show-error --head --max-time 30 \
      --write-out 'Checked %{url_effective}: %{http_code}\n' \
      "$SITE_URL/${SITE_ASSET#build/client/}"
  done

  curl --fail --silent --show-error --max-time 30 "$SITE_URL/robots.txt"
  curl --fail --silent --show-error --max-time 30 "$SITE_URL/sitemap.xml"

  aws s3api get-public-access-block --bucket "$SITE_BUCKET"
  aws s3api get-bucket-policy-status --bucket "$SITE_BUCKET"

  curl --silent --show-error --output /dev/null --max-time 30 \
    --write-out 'Missing asset status: %{http_code}\n' \
    "$SITE_URL/assets/intentionally-missing.js"

  curl --silent --show-error --output /dev/null --max-time 30 \
    --write-out 'Anonymous S3 status: %{http_code}\n' \
    "https://$SITE_BUCKET.s3.$AWS_REGION.amazonaws.com/site/index.html"
)
```

Compare the output with these expected results. The commands display headers and
access settings; they do not automatically assert every value in this table.

| Check | Expected result |
| --- | --- |
| All four page URLs | `200` with `Content-Type: text/html; charset=utf-8` |
| HTML caching | `Cache-Control: no-cache,max-age=0,must-revalidate` |
| Sample JavaScript and CSS | `200` with appropriate JavaScript and CSS content types |
| Hashed asset caching | `Cache-Control: public,max-age=31536000,immutable` |
| `robots.txt` and `sitemap.xml` | Actual text and XML contents, rather than homepage HTML |
| S3 public-access blocks | All four values `true` |
| S3 policy status | `IsPublic: false` |
| Missing asset | `403` or `404`, rather than successful HTML |
| Anonymous direct S3 request | `403` |

A missing S3 object can return `403` when the requesting identity lacks permission
to list the bucket. That result is expected for this CloudFront configuration.
See [S3 object access permissions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).
The sitemap retains the application's configured production URLs.

Finish with a browser check:

1. Open the website address printed by the upload command
2. In **Text to slugify**, enter `Hello, World!` and confirm **Generated slug** shows `hello-world`
3. Append ` Again` and confirm the result immediately changes to `hello-world-again`
4. Press Tab to focus **Copy generated slug**, then Enter, and confirm the copy-success message appears
5. Open **About**, **FAQ**, and **Privacy Policy**, refreshing each page to verify direct loading

Keep the release ID, verification time, and results with your deployment notes.
HTTP success alone does not prove that the browser application is working.

### File layout and caching

The upload commands use this S3 layout:

```text
site/
  index.html
  about/index.html
  faq/index.html
  privacy-policy/index.html
  assets/

releases/
  RELEASE_ID/
    site.tar.gz
    SHA256SUMS
```

CloudFront can read `site/`. It cannot read the private archives under
`releases/`. The website itself is public through CloudFront.

Apply these headers when uploading:

| File type | Cache-Control |
| --- | --- |
| HTML | `no-cache,max-age=0,must-revalidate` |
| Hashed files in `assets/` | `public,max-age=31536000,immutable` |
| Unhashed public files | `no-cache,max-age=0,must-revalidate` |

Hashed asset names change when their contents change. Upload assets before HTML
and keep previous hashed assets available so older pages and rollback releases
can still load their dependencies. Upload-time headers are necessary; the
template alone does not set these headers on S3 objects.

The CloudFront function maps these URLs, including trailing-slash variants, to
generated HTML:

| URL | Generated file |
| --- | --- |
| `/` | `index.html` |
| `/about` | `about/index.html` |
| `/faq` | `faq/index.html` |
| `/privacy-policy` | `privacy-policy/index.html` |

Update the mapping if supported routes change. Missing assets and unknown paths
remain errors instead of returning homepage HTML.

### GitHub deployment settings

Create GitHub environments named `staging` and `production`. Add these variables
to each environment using its own stack outputs:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | Deployment region |
| `AWS_ROLE_ARN` | `DeployRoleArn` |
| `S3_BUCKET` | `BucketName` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |
| `SITE_URL` | `SiteUrl` |

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

### Create the production stack

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
initially uses the CloudFront hostname. Custom-domain and DNS cutover are separate
steps.

### Configure production approval

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

### Deploy staging and promote to production

`.github/workflows/deploy-staging.yaml` starts on pushes to `main`, including
merged pull requests, or a manual run on `main`. Pull requests and other branches
do not deploy. `.github/workflows/publish-site.yaml` is a reusable workflow called
by the staging and production jobs; it has no standalone manual trigger.

The run follows this sequence:

1. **Check and package** runs `npm ci`, `npm run check`, and `npm run build` without AWS credentials
2. The build packages `build/client/`, creates `SHA256SUMS`, and saves both files as one immutable GitHub artifact retained for seven days
3. **Publish and verify staging** downloads that artifact by its numeric ID, verifies the archive against both `SHA256SUMS` and the build job's SHA-256 output, then publishes and verifies staging
4. **Publish and verify production** becomes eligible only after the build and staging jobs succeed, and waits for the production environment's required reviewer
5. After approval, production downloads the same artifact ID, verifies the same SHA-256, and publishes and verifies its contents without rebuilding

Each release ID combines the first 12 characters of the commit SHA, the GitHub
run ID, and the build attempt number. Each environment archives the package under
`releases/RELEASE_ID/`, uploads assets before HTML with the documented cache
headers, and waits for its CloudFront invalidation to finish.

The shared publishing job compares all four page responses, one generated
JavaScript file, one CSS file, `robots.txt`, and `sitemap.xml` with the packaged
files. It checks HTTP status, content type, and cache headers, confirms a missing
asset returns `403` or `404`, and confirms anonymous direct S3 homepage access
returns `403`.

#### Approve and verify a release

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

### Troubleshoot automated deployment

Open the failed job and expand the first failed step before retrying.

| Symptom | What to check |
| --- | --- |
| Missing deployment environment variable | Add the named variable to the failing job's environment using that environment's stack outputs |
| Production is waiting | Complete staging browser checks, then use **Review deployments** to approve or reject the release |
| Later staging runs are pending | Resolve the active run's production approval; the whole promotion shares one queue |
| Branch deployment rejected | Select `main` for manual runs and check both environment branch rules |
| OIDC or `AssumeRoleWithWebIdentity` error | Check `AWS_ROLE_ARN`, audience `sts.amazonaws.com`, exact immutable subject prefix, and the correct environment suffix |
| S3 upload or CloudFront `AccessDenied` | Confirm bucket, distribution, and role variables all belong to the target environment's stack |
| Missing artifact or checksum failure | Start a new run on `main`; both environments require the original verified artifact, which expires after seven days |
| Invalidation waiter times out | Inspect the invalidation ID printed in **Refresh CloudFront** using the command below |
| HTTP verification fails | Check the failing URL, headers, and contents; stale files fail the byte comparison even when the status is `200` |

To inspect an invalidation, replace both placeholders with values from the
failing environment's run:

```sh
aws cloudfront get-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --id INVALIDATION_ID \
  --query 'Invalidation.Status' \
  --output text
```

Failed staging checks block production. A failure after production uploads start
does not trigger automatic rollback: S3 replaces files individually, so a failed
run can leave a partially updated site. Retain the failed run's details, correct
the cause, and deploy a known-good commit through staging and approval again.

Previous hashed assets and release archives remain available. No lifecycle cleanup
is configured, so include retained storage in the monthly cost review. Archives
alone do not establish a tested rollback procedure; the rollback exercise remains
separate work.

### Update an existing stack

For a stack created before `GitHubOidcSubjectPrefix` was added, first follow
[Correct an existing stack's GitHub identity](#correct-an-existing-stacks-github-identity).
Leaving this parameter empty preserves the older name-only trust policy, which
will reject tokens from a repository using immutable subjects.

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

### Correct an existing stack's GitHub identity

Use this procedure if the credential step reports
`Not authorized to perform sts:AssumeRoleWithWebIdentity` and the role's expected
subject differs from GitHub's configured identity. Other authorization failures
can have different causes; compare the identity and audience before changing them.

1. Use the updated `infra/site.yaml` containing `GitHubOidcSubjectPrefix`
2. Set the target stack and read its existing repository parameter

```sh
export AWS_REGION="us-east-1"
export AWS_PAGER=""
export SITE_STACK="static-site-staging"

SITE_REPOSITORY="$(
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$SITE_STACK" \
    --query "Stacks[0].Parameters[?ParameterKey=='GitHubRepository'].ParameterValue | [0]" \
    --output text
)" && export SITE_REPOSITORY
```

3. Repeat the OIDC prefix lookup in step 1 of the setup guide; stop if it fails or returns an empty value
4. Validate the updated template as in step 3, then preview this parameter update

```sh
(
  set -e
  : "${SITE_OIDC_SUBJECT_PREFIX:?Read the GitHub OIDC prefix before continuing}"
  aws cloudformation deploy \
    --region "$AWS_REGION" \
    --stack-name "$SITE_STACK" \
    --template-file infra/site.yaml \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
      GitHubOidcSubjectPrefix="$SITE_OIDC_SUBJECT_PREFIX" \
    --no-execute-changeset
)
```

5. Save the returned change-set ARN as `SITE_CHANGE_SET_ARN` and inspect it using the command in step 4 of the setup guide
6. For this correction alone, expect only `DeployRole` to change, with no replacement; investigate any additional changes before executing
7. Execute the reviewed change set and wait for `UPDATE_COMPLETE` using the commands in **Update an existing stack**
8. In **Actions**, open the failed **Deploy staging** run, choose **Re-run jobs**, then **Re-run failed jobs**
9. Confirm temporary credentials, S3 upload, invalidation, and HTTP verification succeed, then complete the browser checks

Only `GitHubOidcSubjectPrefix` is overridden. CloudFormation preserves the current
values of the other parameters, including ownership of the shared identity
provider. Do not change the GitHub identity format or broaden the trust policy
with wildcards to make authentication pass. If the repository is renamed,
transferred, or changes its OIDC subject configuration, review the returned
prefix and update the stack through a new change set.

### Troubleshooting

#### AWS reports access denied

Check the identity with `aws sts get-caller-identity`. The identity creating
infrastructure needs more permissions than the GitHub role used only to publish
website files.

#### AWS reports that the GitHub identity provider already exists

For a new stack, repeat the identity-provider discovery step and create a new
change set using the discovered ARN. For an existing stack, first check whether
it already owns the provider before changing its parameters.

#### CloudFront returns an error before the first upload

The infrastructure does not include website content. Build the application and
publish its output under `site/`.

#### A stack deployment fails

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

### Resource retention

The S3 bucket and any GitHub identity provider created by the template are
retained when their stack is deleted. Retained files and S3 versions can continue
to incur storage charges. Keep the shared identity provider while other stacks
use it.

### AWS references

- [CloudFront origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront cache policy settings](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-cachepolicy-cachepolicyconfig.html)
- [AWS CLI CloudFormation deployment](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html)
- [GitHub OIDC with AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
