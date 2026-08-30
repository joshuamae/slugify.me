import type { Route } from './+types/FAQ';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/components/ui/accordion';

const frequentlyAskedQuestions = [
	{
		id: 'what-is-a-slug',
		question: 'What is a slug?',
		answer: 'A slug is a short, readable version of text commonly used in URLs. For example, “My First Blog Post” becomes “my-first-blog-post.”',
	},
	{
		id: 'how-slugs-are-generated',
		question: 'How does slugify.me generate slugs?',
		answer: 'Text is converted to lowercase, accents are normalized, and punctuation or whitespace is replaced with hyphens. Repeated and surrounding hyphens are removed automatically.',
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
		answer: 'A run of punctuation, symbols, whitespace, or emoji becomes a single hyphen. Apostrophes are removed without separating the word, so “don’t” becomes “dont.”',
	},
	{
		id: 'empty-slug',
		question: 'Why did the generator return an empty slug?',
		answer: 'Input containing only punctuation, emoji, whitespace, or other separators has no letters or numbers to preserve, so the result is empty.',
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
		answer: 'Yes. slugify.me is free, has no ads, and is open-source under the GNU Affero General Public License.',
	},
];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: 'Frequently Asked Questions | slugify.me' },
		{
			name: 'description',
			content:
				'Learn how slugify.me generates slugs, handles different characters, and keeps your text private',
		},
	];
}

export default function FAQ() {
	return (
		<main className="flex flex-1 px-4 py-10 sm:px-6 sm:py-18">
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

				<Accordion defaultExpandedKeys={['what-is-a-slug']}>
					{frequentlyAskedQuestions.map(
						({ id, question, answer }) => (
							<AccordionItem key={id} id={id}>
								<AccordionTrigger>{question}</AccordionTrigger>
								<AccordionContent>{answer}</AccordionContent>
							</AccordionItem>
						),
					)}
				</Accordion>
			</div>
		</main>
	);
}
