import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/components/ui/accordion';

const pageTitle = 'Frequently Asked Questions | slugify.me';
const pageDescription =
	'Learn how slugify.me generates slugs, handles different characters, and keeps your text private';
const canonicalUrl = 'https://slugify.me/faq';

const frequentlyAskedQuestions = [
	{
		id: 'what-is-a-slug',
		question: 'What is a slug?',
		answer: 'A slug is a short, readable version of text commonly used in URLs. For example, “My First Blog Post” becomes “my-first-blog-post.”',
	},
	{
		id: 'how-slugs-are-generated',
		question: 'How does slugify.me generate slugs?',
		answer: 'Text is converted to lowercase, accents are normalized, and high-confidence symbol contexts are spoken. Ordinary punctuation, ambiguous symbols, and whitespace become hyphens. Repeated and surrounding hyphens are removed automatically.',
	},
	{
		id: 'privacy',
		question: 'Does slugify.me send or store my text?',
		answer: 'No. Slug generation happens entirely in your browser. Your text is not uploaded or stored by slugify.me.',
	},
	{
		id: 'non-english-text',
		question: 'Does it support non-English text?',
		answer: 'Yes. Unicode letters and numbers are preserved. Accented characters are normalized when possible, so “Crème brûlée” becomes “creme-brulee,” while “東京 2026” becomes “東京-2026.”',
	},
	{
		id: 'punctuation-and-emoji',
		question: 'How are punctuation and emoji handled?',
		answer: 'Clear symbol contexts retain their meaning: “#1” becomes “number-1,” “F#” becomes “f-sharp,” “B♭ minor” becomes “b-flat-minor,” and “1½ cups” becomes “1-and-one-half-cups.” Arithmetic such as “1+1=2” becomes “1-plus-1-equals-2,” while prose such as “input / output” becomes “input-output.” Reviewed names, musical notes, grades, blood types, and some other English expressions have specific rules. Unsupported or ambiguous notation, ordinary punctuation, whitespace, and emoji use the general separator rules. Apostrophes and quotation marks are removed without splitting words.',
	},
	{
		id: 'math-and-code',
		question: 'Does it preserve mathematical and programming notation?',
		answer: 'Yes. Roots, powers, subscripts, primes, sets, logic, integrals, arrows, and many specialist symbols have English readings. For example, “√2” becomes “square-root-2,” “x²” becomes “x-to-the-power-of-2,” and “x∉S” becomes “x-not-an-element-of-s.” Code notation includes shifts, nullish coalescing, optional chaining, generic types, and ternaries: “a??b” becomes “a-nullish-coalescing-b.” This is a text formatter, not an expression evaluator or a parser for every programming language or LaTeX command. Ambiguous forms use the documented fallback rules.',
	},
	{
		id: 'empty-slug',
		question: 'Why did the generator return an empty slug?',
		answer: 'Input containing only whitespace, emoji, or punctuation without a recognized meaning produces an empty slug. Recognized mathematical symbols can produce words by themselves: “∞” becomes “infinity.”',
	},
	{
		id: 'unique-slugs',
		question: 'Are generated slugs guaranteed to be unique?',
		answer: 'No. slugify.me formats text but does not check your website, database, or filesystem for existing values. Add a unique identifier when your project requires one.',
	},
	{
		id: 'other-uses',
		question: 'Can I use the result for something other than a URL?',
		answer: 'Yes. Slugs can also be useful for filenames, document identifiers, and similar text labels. Check the rules of the system where you plan to use them.',
	},
	{
		id: 'free-and-open-source',
		question: 'Is slugify.me free?',
		answer: 'Yes. slugify.me is free, has no ads, and is open source under the GNU Affero General Public License.',
	},
];

export default function FAQ() {
	return (
		<main className="flex flex-1 px-4 py-10 sm:px-6 sm:py-18">
			<title>{pageTitle}</title>
			<meta name="description" content={pageDescription} />
			<link rel="canonical" href={canonicalUrl} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={pageDescription} />
			<meta property="og:url" content={canonicalUrl} />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:description" content={pageDescription} />

			<div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Frequently asked questions
					</h1>
					<p className="text-muted-foreground">
						Everything you need to know about generating slugs with
						slugify.me
					</p>
				</header>

				<section aria-labelledby="questions-heading">
					<h2 id="questions-heading" className="sr-only">
						Questions and answers
					</h2>
					<Accordion defaultExpandedKeys={['what-is-a-slug']}>
						{frequentlyAskedQuestions.map(
							({ id, question, answer }) => (
								<AccordionItem key={id} id={id}>
									<AccordionTrigger>
										{question}
									</AccordionTrigger>
									<AccordionContent>
										{answer}
									</AccordionContent>
								</AccordionItem>
							),
						)}
					</Accordion>
				</section>
			</div>
		</main>
	);
}
