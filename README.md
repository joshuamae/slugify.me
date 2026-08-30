# slugify.me

slugify.me is a simple, open-source, no-ads web app for turning text into URL-friendly slugs in real time.

## Features

- Converts user input to a slug as it is typed.
- Useful for URL paths, filenames, and other text identifiers.
- Runs in the browser with no ads or backend required for its current functionality.

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

The project is currently distributed from source; no npm package or release binaries are provided.

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

slugify.me will be deployed using [Netlify](https://www.netlify.com/).

## License

Licensed under the [GNU Affero General Public License, version 3 or later](LICENSE).
