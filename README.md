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
- Reviewed exception mappings are applied once after normalization and lowercasing with Unicode-aware, case-insensitive matching; replacement text is not matched again during the same pass
- Term-mode exceptions use Unicode letter-and-number boundaries, so they match at string boundaries and beside punctuation or symbols, but not inside a larger letter-or-number token
- Literal-mode exceptions are reserved for reviewed cases that intentionally match inside larger tokens; no current production mapping uses literal mode
- Reviewed names retain meaningful symbols: `C++` becomes `cpp`, `C#` becomes `c-sharp`, `F#` becomes `f-sharp`, `.NET` becomes `dot-net`, and `Notepad++` becomes `notepad-plus-plus`
- Additional reviewed names include C++ editions 98, 03, 11, 14, 17, 20, 23, and 26; g++, clang++, libstdc++, libc++, GTK+, LGBT+, LGBTQ+, LGBTQIA+, Disney+, Paramount+, and Apple TV+
- Specialist terms preserve their distinguishing symbols: `D* Lite`, `D* algorithm`, `IDA*`, `LPA*`, `RRT*`, C*/W*/B* algebras, and B+/B* trees; algebra and tree names accept singular/plural nouns and a space or hyphen
- Musical note letters A–G retain Unicode sharps, flats, naturals, double sharps, double flats, and optional octave numbers; `B♭ minor` becomes `b-flat-minor` and `F𝄪4` becomes `f-double-sharp-4`
- ASCII sharp notes also match before musical words such as major, minor, scale, and chord; grades and blood types require a nearby context word, so `A+ student` becomes `a-plus-student`, `grade B−` becomes `grade-b-minus`, and `blood type O-` becomes `blood-type-o-negative`
- A single trailing plus on an unsigned integer is retained at the end of input or before a full word: `18+` becomes `18-plus` and `30+ recipes` becomes `30-plus-recipes`
- Every printable ASCII punctuation key has deterministic behavior: a reviewed spoken context or an intentional silent fallback
- Strong numeric contexts are spoken: `#1` becomes `number-1`, `$25` becomes `25-dollars`, `-$5` becomes `negative-5-dollars`, `50%` becomes `50-percent`, `12.5` becomes `12-point-5`, and a rating such as `5*` becomes `5-stars`
- Amounts with 27 additional currency signs retain their units and signs, including `€5`, `£1`, `50¢`, `¥10`, and `₹10`; `-€5.25` becomes `negative-5-point-25-euros`, and no country or exchange rate is inferred
- Per-mille, per-ten-thousand, and degree suffixes retain their meaning: `50‰` becomes `50-per-mille`, `2‱` becomes `2-per-ten-thousand`, and `30°` becomes `30-degrees`
- Well-formed numeric comma groups are joined, multi-part numeric dots use `dot`, and one numeric dot uses `point`: `1,234` becomes `1234` and `127.0.0.1` becomes `127-dot-0-dot-0-dot-1`
- Binary operators require clear same-line operands and normally matching horizontal spacing on both sides: `1+1=2` becomes `1-plus-1-equals-2`, `x >= 5` becomes `x-greater-than-or-equal-to-5`, and `a&&b` becomes `a-and-b`
- An explicit signed numeric or dollar right operand accepts common compact and padded variations, so `2==-5`, `2 == -5`, `2== -5`, and `2 ==-$5` retain the operator and speak the sign
- An unpaired single postfix `*` names the A-star term or a numeric rating when it is not part of a clear operator: `A* algorithm` becomes `a-star-algorithm`, `5*` becomes `5-stars`, and `1*` becomes `1-star`
- Recognized same-line paired single-star emphasis markers that do not overlap a clear operator remain silent, so `*rated 5*` becomes `rated-5`; double and repeated decorative stars also remain silent
- Postfix-star attachment is intentional: `rated 5* today` uses rating notation, `5*2` and `5 * 2` are multiplication, an attached signed operand such as `5* -2` remains multiplication, and the half-spaced numeric form `5* 2` falls back silently as ambiguous
- Compact `/` is division only between numbers; spaced `/` and `-` support numeric expressions and single-letter algebra, while full English words on both sides indicate prose separators (`input / output` becomes `input-output` and `Hello - world` becomes `hello-world`)
- Compact `-` remains a slug separator, numeric `%` between operands is modulo, and numeric `^` is exponentiation
- Reviewed slash phrases retain their prose meaning beside context words: `24/7 support`, `open 24/7`, `9/11 memorial`, and `4/4 time` become `24-7-support`, `open-24-7`, `9-11-memorial`, and `4-4-time`; bare `24/7` remains division
- Unicode vulgar fractions retain their value before normalization, including mixed quantities: `½ cup` becomes `one-half-cup` and `1½ cups` becomes `1-and-one-half-cups`
- Unicode fraction slashes retain their ratio; ASCII fractions and leading-dot decimals are recognized before common cooking, length, and time units (`1 1/2 cups` becomes `1-and-one-half-cups`, `5/16-inch` becomes `5-over-16-inch`, and `.5 cup` becomes `0-point-5-cup`), while bare `1/2` remains division
- Celsius and Fahrenheit degree suffixes are spoken: `20°C` and `20℃` both become `20-degrees-celsius`
- Unicode arithmetic signs `×`, `÷`, `−`, `≤`, `≥`, and `±` retain their meaning in expressions; negated comparisons are protected before accent removal, so both `x ≠ y` and its decomposed spelling become `x-not-equals-y`
- Mathematical symbols and arrows have explicit English readings across the Mathematical Operators, Supplemental Mathematical Operators, Miscellaneous Mathematical Symbols A/B, Arrows, Supplemental Arrows A/B/C, and reviewed APL ranges; obscure symbols use their Unicode names, including Unicode 17 reaction arrows
- Set membership, quantifiers, logic, sums, integrals, and roots retain their distinctions: `x∉S` becomes `x-not-an-element-of-s`, `∀x∈ℝ` becomes `for-all-x-element-of-real-numbers`, and `√x/2` becomes `square-root-x-divided-by-2`
- Superscripts and subscripts are preserved before normalization: `x²` becomes `x-to-the-power-of-2`, `xₙ` becomes `x-subscript-n`, and `log₂(x)` becomes `log-base-2-x`; numeric subscripts inside identifiers and formulas such as `H₂O` and `CO₂` retain their ordinary spelling
- Bounded mathematical alphabet symbols name their sets, including ℕ, ℤ, ℚ, ℝ, ℂ, ℍ, and 𝔽; surrounding prose remains intact, so `ℝandom` becomes `random`
- Unicode primes distinguish derivatives and related notation: `f″(x)` becomes `f-double-prime-x`; paired height notation such as `5′10″` becomes `5-feet-10-inches`
- Paired floors, ceilings, and compact absolute-value or norm bars retain their names: `⌊x⌋` becomes `floor-x`, `|x|` becomes `absolute-value-x`, and `‖v‖` becomes `norm-v`; padded prose pipes remain separators
- Bounded algebraic factorials retain their names: `n!`, `n!!`, and `(n+1)!` become `n-factorial`, `n-double-factorial`, and `n-plus-1-factorial`; ordinary exclamations such as `Amazing!` and `I!` remain prose
- Reviewed compound forms include equality, comparison, logical and assignment operators, shifts, nullish coalescing, optional chaining, scope resolution, arrows, floor division, and numeric ranges; longer operators take precedence over prefixes, so `a>>>=b` becomes `a-unsigned-right-shift-equals-b`
- Operator names are retained in explicit operator contexts: `?? operator` becomes `nullish-coalescing-operator` and `std::operator<<` becomes `std-scope-operator-left-shift`
- Balanced generic types preserve type arguments: `std::vector<int>` becomes `std-scope-vector-of-int` and `Map<K, List<V>>` becomes `map-of-k-list-of-v`; ordinary comparisons and HTML retain their existing rules
- Paired same-line ternaries retain both branches, including nesting: `a?b:c` becomes `a-then-b-else-c`; unmatched questions, quoted colons, and ordinary prose do not create a conditional operator
- Exact `++` remaining after protected terms are resolved means `increment` when only one side is an operand, while two-sided and otherwise ambiguous plus runs fall back silently
- Attached postfix `--` denotes decrement; prefix decrement requires an expression position or a single-letter operand at the start, preserving ordinary CLI flags such as `--help`
- Unary signs, numeric approximation, logical negation in expression position, and numeric factorials are spoken only in bounded contexts
- Line breaks reset expression context, preventing binary operators from joining unrelated lines while allowing prefix notation to start a new line
- Text connectors and email addresses are recognized in context: `rock & roll` becomes `rock-and-roll` and `user@example.com` becomes `user-at-example-dot-com`
- Only the common `M/D/YYYY` and `YYYY/M/D` slash shapes are protected as dates; `9/2/2026` becomes `9-2-2026`, while `1/2/3` is treated as chained division
- Recognized HTTP, HTTPS, FTP, and `www` URL-like spans and HTML-like tags keep their symbols structural rather than speaking them as operators
- Apostrophes and quotation marks are removed without splitting words (`don't` becomes `dont`); modifier apostrophes and discretionary soft hyphens between Latin ASCII letters are also removed (`donʼt` becomes `dont`)
- Ordinary sentence punctuation, periods outside numeric or email contexts, structural delimiters, unsupported compound operators, ambiguous symbols, whitespace, and emoji fall back to a single hyphen (`-`); `Hello, world!` remains `hello-world`
- Leading and trailing hyphens are removed. Input containing only separators produces an empty slug

These rules preserve recognizable notation; they do not evaluate expressions or
parse every programming language, LaTeX command, unit convention, or possible
meaning of an overloaded symbol. Ordinary English words need no dictionary lookup.
Ambiguous compact forms retain the documented fallback: `x-y` stays `x-y`,
`1e-3` stays `1e-3`, and a bare `24/7` remains division. Slugs are deterministic and
idempotent, but are not reversible or guaranteed unique.

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

- Symbol interpretation is a bounded deterministic grammar, not natural-language or programming-language parsing; ambiguous, malformed, unsupported, and half-spaced forms deliberately fall back to normal separator cleanup
- Reviewed term-level exceptions cover the names listed above; lookalikes embedded in larger Unicode letter-or-number tokens follow the general separator rules, so `.NET` becomes `dot-net` while `ASP.NET` remains `asp-net`
- English notation is recognized through explicit terms and nearby context words, not a dictionary or language model; unsupported names, currencies, units, fraction contexts, and ambiguous suffixes retain the general fallback behavior
- Accented English words and loanwords normalize without a vocabulary lookup, while distinct Unicode letters such as `æ` and `œ` are preserved rather than broadly transliterated
- The project is distributed from source; no npm package or release binaries are provided

## License

Licensed under the [GNU Affero General Public License, version 3 or later](LICENSE)
