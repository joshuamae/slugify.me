import type { Route } from './+types/Home';
import SlugGenerator from '../features/slug-generator/components/SlugGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { createPageMetadata } from '~/lib/siteMetadata';

export function meta(_args: Route.MetaArgs) {
	return createPageMetadata({
		title: 'Slug Generator | slugify.me',
		description:
			'Turn text into clean, URL-friendly slugs instantly with a free, open source, ad-free web app',
		pathname: '/',
	});
}

export default function Home() {
	return (
		<main className="flex flex-1 items-center px-4 py-10 sm:px-6 sm:py-18">
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
