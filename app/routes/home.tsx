import type { Route } from './+types/home';
import SlugGenerator from '../features/slug-generator/components/SlugGenerator';
export function meta(_args: Route.MetaArgs) {}

export default function Home() {
	return <SlugGenerator />;
}
