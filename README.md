# slugify.me

Turn text into URL-friendly slugs as you type. Free, open source and ad-free.
Your text stays in your browser; the app does not upload or save it.

**[Use slugify.me](https://slugify.me)** · [FAQ](https://slugify.me/faq) · [Report a bug](https://github.com/joshuamae/slugify.me/issues)

## Features

- Instant conversion as you type or paste
- One-click copying of the generated slug
- Accented text normalization and support for Unicode letters and numbers
- Useful for URL paths, filenames and other text identifiers

| Input           | Slug           |
| --------------- | -------------- |
| `Hello, World!` | `hello-world`  |
| `Crème brûlée`  | `creme-brulee` |
| `東京 2026`     | `東京-2026`    |

See the [slug rules](docs/development.md#slug-rules) for punctuation and special cases.

## Run locally

Built with React, React Router, TypeScript and Vite. Use Node.js 24 and npm.

1. Clone or download this repository
2. From the repository root, install dependencies and start the development server

    ```sh
    npm ci
    npm run dev
    ```

3. Open the local URL printed in your terminal

Enter text in **Text to slugify**. **Generated slug** updates immediately.

| Command           | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `npm run check`   | Run type checking, linting, formatting checks and tests |
| `npm run build`   | Create the production site in `build/client/`           |
| `npm run preview` | Serve the production build locally                      |

The full test suite also requires GNU tar 1.28 or newer. See the
[development setup](docs/development.md#before-you-start) for details.

## Contributing

Bug reports, documentation improvements and pull requests are welcome.
[Open an issue](https://github.com/joshuamae/slugify.me/issues) to report a problem
or discuss a proposed feature. Keep changes focused and run `npm run check`
before submitting a pull request against `main`.

See the [development guide](docs/development.md) for project structure,
conversion rules and verification steps.

## Documentation

- [Develop and test the app](docs/development.md)
- [Set up AWS hosting and recover releases](docs/aws-hosting.md)
- [Deploy infrastructure and website changes](docs/infrastructure-delivery.md)
- [Monitor hosting and review costs](docs/aws-operations.md)
- [Rehearse recovery from a missing staging asset](docs/aws-staging-failure-exercise.md)
- [Privacy policy](https://slugify.me/privacy-policy)

## License

[GNU Affero General Public License, version 3 or later](LICENSE).
