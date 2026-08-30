[![Netlify Status](https://api.netlify.com/api/v1/badges/939a795d-2add-4f4c-ab04-ca986d843ae6/deploy-status)](https://app.netlify.com/projects/slugify-me/deploys)
# slugify.me

slugify.me is a simple, open-source, no-ads web app for turning text into URL-friendly slugs in real time

## Features

- Converts user input to a slug as it is typed
- Useful for URL paths, filenames, and other text identifiers
- Runs in the browser with no ads or backend required for its current functionality

## Slug rules

Generated slugs follow these rules:

- Text is converted to lowercase.
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
```

## Deployment

slugify.me is deployed as a static single-page application using
[Netlify](https://www.netlify.com/). The repository's [`netlify.toml`](netlify.toml)
runs `npm run build`, publishes `build/client`, and rewrites unmatched requests to
the generated `index.html` so React Router can handle client-side routes.

### Connect the repository

1. Sign in to Netlify and select **Add new project**
2. Select **Import an existing project**, then choose GitHub
3. Authorize Netlify to access `joshuamae/slugify.me` and select the repository
4. Select `main` as the production branch
5. Confirm that Netlify reads `npm run build` and `build/client` from `netlify.toml`
6. Publish the project to create the first production deployment

After the repository is connected, each push to `main` triggers a production
deployment using the committed Netlify configuration.

### Connect a custom domain

In the Netlify project, open **Domain management**, select **Add a domain**, and
follow the prompts to connect an existing domain or register a new one.

The current client-side application does not require deployment secrets. Never
commit Netlify tokens, credentials, API keys, or sensitive environment files. If a
future build requires secrets, store them in Netlify's environment variable
settings.

## Known limitations

- Character-specific replacements currently cover only `C++` and `C#`; other symbol-heavy terms follow the general separator rules
- The project is distributed from source; no npm package or release binaries are provided

## License

Licensed under the [GNU Affero General Public License, version 3 or later](LICENSE)
