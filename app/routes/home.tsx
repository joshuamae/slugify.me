import type { Route } from './+types/home';
import SlugGenerator from '../features/slug-generator/components/SlugGenerator';

export function meta(_args: Route.MetaArgs) {
	return [{ title: 'slugify.me' }];
}

export default function Home() {
	return (
		<main>
			<h1 className="sr-only">Slug generator</h1>
			<SlugGenerator />
		</main>
	);
}
