import {
	isRouteErrorResponse,
	Links,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';
import SiteHeader from '~/components/layouts/SiteHeader';
import SiteFooter from '~/components/layouts/SiteFooter';

const socialPreviewUrl = 'https://slugify.me/social-preview.png';
const socialPreviewAlt =
	'slugify.me logo beside the text “Clean URL slugs, instantly”';

export const links: Route.LinksFunction = () => [
	{
		rel: 'icon',
		type: 'image/vnd.microsoft.icon',
		href: '/favicon.ico',
		sizes: '16x16 32x32 48x48 256x256',
	},
	{
		rel: 'icon',
		type: 'image/svg+xml',
		href: '/slug-logo-v2.svg',
		sizes: 'any',
	},
	{
		rel: 'apple-touch-icon',
		href: '/apple-touch-icon.png',
		sizes: '180x180',
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" prefix="og: https://ogp.me/ns#">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<meta property="og:type" content="website" />
				<meta property="og:site_name" content="slugify.me" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:image" content={socialPreviewUrl} />
				<meta property="og:image:type" content="image/png" />
				<meta property="og:image:width" content="1200" />
				<meta property="og:image:height" content="630" />
				<meta property="og:image:alt" content={socialPreviewAlt} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:image" content={socialPreviewUrl} />
				<meta name="twitter:image:alt" content={socialPreviewAlt} />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<div className="flex min-h-svh flex-col">
			<SiteHeader />
			<Outlet />
			<SiteFooter />
		</div>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'Oops!';
	let details = 'An unexpected error occurred.';
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error';
		details =
			error.status === 404
				? 'The requested page could not be found.'
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
