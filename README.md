[![Netlify Status](https://api.netlify.com/api/v1/badges/939a795d-2add-4f4c-ab04-ca986d843ae6/deploy-status)](https://app.netlify.com/projects/slugify-me/deploys)
# slugify.me

slugify.me is a simple, open-source, no-ads web app for turning text into URL-friendly slugs in real time

## Features

- Converts user input to a slug as it is typed
- Useful for URL paths, filenames, and other text identifiers
- Runs in the browser with no ads or backend required for its current functionality

## Pages and navigation

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Slug Generator | Converts text immediately as you type or paste, with a copy button for the result |
| `/about` | About | Project background, design principles, and open-source information |
| `/faq` | Frequently Asked Questions | Answers about slug rules, supported characters, privacy, common uses, and the leaf sheep icon and logo |
| `/privacy-policy` | Privacy Policy | Privacy information and hosting-related disclosures |

The shared header links the **slugify.me** brand back to the generator and provides
About, FAQ, and GitHub links. The shared footer includes About, FAQ, Privacy Policy,
and GitHub links, together with the project's open-source, ad-free, browser-local
processing statement. Each page defines its own title and description.

Slug generation happens locally in your browser. Text entered into the generator
is not uploaded or saved by the application, and there are no ads. The Privacy
Policy describes hosting-related request information separately. A shadcn TL;DR
card appears before the policy heading and summarizes browser-local processing,
open-source verification, Netlify Observability logging, and the absence of ads
or tracking added by the project.

## Site structure

- `app/root.tsx` — Document shell and shared header, route outlet, and footer
- `app/routes.ts` — Route registration
- `app/routes/` — Home, About, FAQ, and Privacy Policy page components and metadata
- `app/components/layouts/` — Shared `SiteHeader` and `SiteFooter` components
- `app/features/slug-generator/` — Generator UI, pure slug conversion logic, and slug tests
- `app/routes.test.tsx` — Route rendering, metadata, shared layout, and navigation tests
- `public/` — Static assets

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

Netlify deployment settings and SPA fallback routing are defined in `netlify.toml`.

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
