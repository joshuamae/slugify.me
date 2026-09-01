import SlugGenerator from '../features/slug-generator/components/SlugGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

const pageTitle = 'Slug Generator | slugify.me';
const pageDescription =
	'Turn text into clean, URL-friendly slugs instantly with a free, open source, ad-free web app';
const canonicalUrl = 'https://slugify.me/';

export default function Home() {
	return (
		<main className="flex flex-1 items-center px-4 py-10 sm:px-6 sm:py-18">
			<title>{pageTitle}</title>
			<meta name="description" content={pageDescription} />
			<link rel="canonical" href={canonicalUrl} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={pageDescription} />
			<meta property="og:url" content={canonicalUrl} />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:description" content={pageDescription} />

			<Card className="mx-auto w-full max-w-2xl">
				<CardHeader>
					<CardTitle>
						<h1>Turn text into a URL-friendly slug</h1>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<SlugGenerator />
				</CardContent>
			</Card>
		</main>
	);
}
