import { Link } from 'react-router';

import { LinkButton, buttonVariants } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

const pageTitle = 'About | slugify.me';
const pageDescription =
	'Learn about slugify.me, a focused, open source, no-ads tool for generating URL-friendly slugs';
const canonicalUrl = 'https://slugify.me/about';

const principles = [
	{
		title: 'Instant',
		description: 'Updates as you type',
		content:
			'Generate a clean slug without submitting a form or waiting for a response.',
	},
	{
		title: 'Browser-based',
		description: 'Your text stays with you',
		content:
			'Slug generation runs locally in your browser without requiring a backend.',
	},
	{
		title: 'Open source',
		description: 'Built in the open',
		content:
			'Inspect the source, report issues, or contribute improvements on GitHub.',
	},
];

export default function About() {
	return (
		<main className="flex flex-1 mx-auto w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-18">
			<title>{pageTitle}</title>
			<meta name="description" content={pageDescription} />
			<link rel="canonical" href={canonicalUrl} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={pageDescription} />
			<meta property="og:url" content={canonicalUrl} />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:description" content={pageDescription} />

			<header className="flex max-w-2xl flex-col gap-3">
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					About slugify.me
				</h1>
				<p className="text-lg text-muted-foreground">
					A simple tool for turning text into clean, URL-friendly
					slugs
				</p>
				<p>
					slugify.me converts titles, phrases, filenames, and other
					text identifiers in real time. It is designed to be fast,
					distraction-free, and easy to understand.
				</p>
			</header>

			<section
				aria-labelledby="why-it-was-built-heading"
				className="flex max-w-2xl flex-col gap-3"
			>
				<h2
					id="why-it-was-built-heading"
					className="font-heading text-2xl font-semibold tracking-tight"
				>
					Why it was built
				</h2>
				<p className="text-muted-foreground">
					I built this because I like generating slug names for my
					files, folders, and technical documentation URLs. Whenever I
					needed a slug, all the online options were obscure websites
					that were mini tools and part of a larger product or had ads
					(I have an ad blocker, but that is beside the point). I
					could always make a Python script or call an API, but I
					wanted to make something better than the tools I found on
					the internet. I came across this domain, and it was
					available. So, I thought it would be perfect to build a
					simple tool that makes slugs, has no ads, is open source,
					and easy to use.
				</p>
			</section>

			<section
				aria-labelledby="principles-heading"
				className="flex flex-col gap-4"
			>
				<h2
					id="principles-heading"
					className="font-heading text-2xl font-semibold tracking-tight"
				>
					Simple by design
				</h2>

				<div className="grid gap-4 sm:grid-cols-3">
					{principles.map(({ title, description, content }) => (
						<Card key={title}>
							<CardHeader>
								<CardTitle>{title}</CardTitle>
								<CardDescription>{description}</CardDescription>
							</CardHeader>
							<CardContent>
								<p>{content}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			<Separator />

			<section
				aria-labelledby="how-it-works-heading"
				className="flex max-w-2xl flex-col gap-3"
			>
				<h2
					id="how-it-works-heading"
					className="font-heading text-2xl font-semibold tracking-tight"
				>
					How it works
				</h2>
				<p className="text-muted-foreground">
					Your text is normalized, converted to lowercase, and
					separated with clean hyphens. Unicode letters and numbers
					are preserved, while repeated punctuation and whitespace are
					reduced to a single separator.
				</p>
			</section>

			<Separator />

			<section
				aria-labelledby="open-source-heading"
				className="flex max-w-2xl flex-col items-start gap-4"
			>
				<div className="flex flex-col gap-3">
					<h2
						id="open-source-heading"
						className="font-heading text-2xl font-semibold tracking-tight"
					>
						Open source
					</h2>
					<p className="text-muted-foreground">
						slugify.me is open source software licensed under the
						GNU Affero General Public License v3.0. You can inspect
						the source, report an issue, or contribute on GitHub.
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Link
						to="/"
						className={buttonVariants({
							variant: 'default',
						})}
					>
						Generate a slug
					</Link>

					<LinkButton
						href="https://github.com/joshuamae/slugify.me"
						target="_blank"
						rel="noreferrer"
						variant="outline"
					>
						View source on GitHub
					</LinkButton>
				</div>
			</section>
		</main>
	);
}
