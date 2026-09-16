# Develop and test slugify.me

Use this guide to run the app, understand its structure and verify changes.
Slug generation runs entirely in the browser and updates on every input change.
The app is distributed from source; no npm package or release binaries are provided.

## Before you start

- Node.js 24 and npm, matching the GitHub Actions environment
- GNU tar 1.28 or newer for release packaging tests included in `npm test` and `npm run check`

On macOS, install GNU tar with Homebrew:

```sh
brew install gnu-tar
gtar --version
```

The release tool checks `gtar` first, then `tar`. The built-in macOS BSD tar does
not support the archive normalization options these tests need. Ubuntu GitHub
runners provide GNU tar. Running the app locally does not require AWS access.

## Run the app

1. Clone or download the repository
2. From the repository root, install the locked dependencies and start the server

    ```sh
    npm ci
    npm run dev
    ```

3. Open the local URL printed in your terminal
4. Enter text in **Text to slugify** and confirm that **Generated slug** updates as you type

## Build and preview

Run these commands from the repository root:

```sh
npm run build
npm run preview
```

The production site is generated in `build/client/`. Open the preview URL printed
in your terminal to check the build. There is no checked-in root `index.html`;
React Router generates the HTML during the build.

For hosting setup, see [Set up AWS hosting](aws-hosting.md). For the existing
staging and production pipeline, see [Deploy infrastructure and website changes](infrastructure-delivery.md).

## Project structure

The app uses React, React Router Framework Mode, TypeScript and Vite. React Router
runs with `ssr: false` and pre-renders the public routes at build time.

| Path                           | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `app/root.tsx`                 | Document shell, shared header, route outlet and footer             |
| `app/routes.ts`                | Route registration                                                 |
| `app/routes/`                  | Page components and metadata                                       |
| `app/components/layouts/`      | Shared header and footer                                           |
| `app/features/slug-generator/` | Generator UI, pure conversion logic and tests                      |
| `app/routes.test.tsx`          | Route rendering, metadata, layout and navigation tests             |
| `public/`                      | Favicons, social images and search discovery files                 |
| `react-router.config.ts`       | Client runtime and build-time pre-rendering                        |
| `scripts/`                     | Release tooling, infrastructure validation and operational helpers |
| `infra/`                       | CloudFormation templates and deployment settings                   |

### Pages and navigation

| Route             | Page                       | Purpose                                          |
| ----------------- | -------------------------- | ------------------------------------------------ |
| `/`               | Slug Generator             | Real-time conversion and copying                 |
| `/about`          | About                      | Project background and design principles         |
| `/faq`            | Frequently Asked Questions | Slug rules, supported characters and common uses |
| `/privacy-policy` | Privacy Policy             | Local processing and hosting disclosures         |

The shared header links to the generator, About, FAQ and GitHub. The footer also
links to the Privacy Policy. Each page defines its own title and description.
The privacy notice covers local conversion, clipboard use, AWS hosting and
monitoring, disabled visitor access logs and session storage for scroll positions.

## Slug rules

The pure conversion function is in
[`app/features/slug-generator/utils/slugify.ts`](../app/features/slug-generator/utils/slugify.ts).

- Lowercase conversion
- Unicode normalization and removal of combining diacritic marks, such as `Crème brûlée` → `creme-brulee`
- Preservation of Unicode letters and numbers, such as `東京 2026` → `東京-2026`
- Removal of apostrophes and quotation marks without splitting words, such as `don't` → `dont`
- A single hyphen for each run of whitespace, remaining punctuation, symbols, separators or emoji
- Removal of leading and trailing hyphens, with an empty result for input containing only separators
- Explicit replacements for `C++` → `cpp` and `C#` → `c-sharp`

Other symbol-heavy terms follow the general separator rules. Generated slugs are
not guaranteed to be unique; the app does not check for existing values.

## Check changes

Run the complete set of application checks from the repository root:

```sh
npm run check
```

A successful run completes type checking, ESLint, Prettier and Vitest without
errors. Individual checks and formatting commands are also available:

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run typecheck`    | Generate route types and run TypeScript     |
| `npm run lint`         | Check JavaScript, TypeScript and React code |
| `npm run lint:fix`     | Apply supported lint fixes                  |
| `npm run format:check` | Check formatting                            |
| `npm run format`       | Apply formatting                            |
| `npm test`             | Run Vitest tests                            |

Tests cover slug conversion, route rendering with an in-memory router, shared
layout, navigation, metadata and release tooling. Keep conversion coverage for
empty input, whitespace, punctuation, repeated separators, casing,
already-slugified text and supported non-ASCII input.

Node-based tests do not simulate keyboard input, screen readers, browser
hydration, responsive layouts or the hosting platform's fallback behavior.
For UI changes, verify the following in a browser:

1. Type, paste, edit and clear text, checking the generated slug after every change
2. Use the keyboard to reach the input and **Copy generated slug** control, then confirm the copied text
3. Check that a screen reader announces the field labels, generated value and copy status
4. Check narrow and wide layouts and navigate between pages
5. Load and refresh every public route directly, including on the deployed site when verifying a release

For infrastructure changes, use the additional
[infrastructure validators](infrastructure-delivery.md#run-the-same-validators-locally).

## Maintain search and browser metadata

- `public/robots.txt` — Public crawler access and the production sitemap location
- `public/sitemap.xml` — Canonical HTTPS URLs for every public page
- `public/apple-touch-icon.png` — 180×180 home-screen and bookmark icon derived from the favicon
- `public/social-preview.png` — 1200×630 Open Graph and Twitter preview image

Each route uses React document metadata elements for its canonical URL, title,
description and social metadata. Pre-rendering places these in the initial HTML
without requiring JavaScript. The document shell publishes shared social image
metadata and links the ICO, SVG and Apple touch icons.

When you add, rename or remove a public route, update `public/sitemap.xml` in the
same change. Use the production site's canonical HTTPS origin and include only
real public routes. Omit `<lastmod>` unless accurate modification dates can be
maintained. Update `public/robots.txt` only when the sitemap location or crawler
policy changes.

The site has no `site.webmanifest` because it is not offered as an installable or
offline-capable app. Adding that capability requires a product-scope decision,
installable icons and related testing.

## Troubleshooting

- **Release tests report a GNU tar error:** Install GNU tar 1.28 or newer and confirm `gtar --version` or `tar --version` identifies it as GNU tar
- **Preview is missing or outdated:** Run `npm run build` before `npm run preview`
- **Type checking reports missing route types:** Use `npm run typecheck` so React Router generates types before TypeScript runs
