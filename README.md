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

The template prepares hosting resources and a GitHub deployment role. Uploading
the website and adding the deployment workflow are subsequent steps. Each stack
uses a generated CloudFront address; custom domains and a production cutover are
separate changes. The current Netlify configuration remains the existing hosting
setup until a cutover is completed.

### Existing budget

Use the account's existing AWS budget. This template does not create or modify
budgets. Budget notifications do not automatically stop AWS charges.

### Before you start

Run commands from the repository root in Bash or Zsh. You need:

- AWS CLI installed and signed in
- AWS permissions to create the S3, CloudFront, and IAM resources in the template
- Node.js 24 and npm for building the website
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

### File layout and caching

Use this S3 layout when implementing publishing and rollback:

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

When adding the deployment workflow, create GitHub environments named `staging`
and `production`. Add these variables to each environment using its stack outputs:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | Deployment region |
| `AWS_ROLE_ARN` | `DeployRoleArn` |
| `S3_BUCKET` | `BucketName` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |
| `SITE_URL` | `SiteUrl` |

Restrict environment deployments to the intended branch. Configure production
approval where your GitHub plan supports it. The environment restrictions enforce
the branch policy because the AWS trust rule identifies the repository and
environment, rather than a branch.

The deployment workflow must request `id-token: write` permission and use the
matching GitHub environment to assume the role. The role grants file publishing
and cache invalidation permissions; infrastructure changes use the operator's
separate AWS identity.

### Create production after staging works

First, save the shared identity provider ARN from staging:

```sh
SITE_OIDC_ARN="$(
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name static-site-staging \
    --query "Stacks[0].Outputs[?OutputKey=='OidcProviderArn'].OutputValue | [0]" \
    --output text
)"
```

Confirm the command succeeded and returned an ARN before continuing:

```sh
export SITE_OIDC_ARN
export SITE_ENVIRONMENT="production"
export SITE_STACK="static-site-production"
```

Repeat steps 4–6 for the new production stack. Save its new change-set ARN before
execution. The production stack reuses the identity provider from staging.

### Update an existing stack

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
