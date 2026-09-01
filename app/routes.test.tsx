import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
	createMemoryRouter,
	RouterProvider,
	type MetaFunction,
	type RouteObject,
} from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import App, { links as documentLinks } from './root';
import routeConfig from './routes';

// Render the real route components without a DOM dependency. Browser interactions,
// responsive layout, and production-host rewrites still need browser verification.
const routeModules = import.meta.glob<{
	default: ComponentType;
	meta: MetaFunction;
}>('./routes/*.tsx', { eager: true });

const routes: RouteObject[] = [
	{
		id: 'root',
		Component: App,
		children: routeConfig.map(({ file, path, index }) => {
			const routeModule = routeModules[`./${file}`];
			if (!routeModule) {
				throw new Error(`Missing route module: ${file}`);
			}

			const route = { id: file, Component: routeModule.default };
			return index ? { ...route, index: true } : { ...route, path };
		}),
	},
];

const pages = [
	{
		path: '/',
		file: 'routes/Home.tsx',
		heading: 'Turn text into a URL-friendly slug',
		title: 'Slug Generator | slugify.me',
	},
	{
		path: '/about',
		file: 'routes/About.tsx',
		heading: 'About slugify.me',
		title: 'About | slugify.me',
	},
	{
		path: '/faq',
		file: 'routes/FAQ.tsx',
		heading: 'Frequently asked questions',
		title: 'Frequently Asked Questions | slugify.me',
	},
	{
		path: '/privacy-policy',
		file: 'routes/PrivacyPolicy.tsx',
		heading: 'Privacy Policy',
		title: 'Privacy Policy | slugify.me',
	},
];

const routers: ReturnType<typeof createMemoryRouter>[] = [];

function createSiteRouter(path: string) {
	const router = createMemoryRouter(routes, { initialEntries: [path] });
	routers.push(router);
	return router;
}

function renderSite(router: ReturnType<typeof createMemoryRouter>) {
	expect(router.state.errors).toBeNull();
	return renderToStaticMarkup(<RouterProvider router={router} />);
}

function getLinks(html: string) {
	return Array.from(
		html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g),
		([, attributes, content]) => ({
			href: attributes.match(/\bhref="([^"]*)"/)?.[1],
			name:
				attributes.match(/\baria-label="([^"]*)"/)?.[1] ??
				content.replace(/<[^>]+>/g, '').trim(),
			current: attributes.match(/\baria-current="([^"]*)"/)?.[1],
			className: attributes.match(/\bclass="([^"]*)"/)?.[1] ?? '',
		}),
	);
}

afterEach(() => {
	for (const router of routers) router.dispose();
	routers.length = 0;
});

describe('site routes', () => {
	it.each(pages)('renders $path with the shared site layout', (page) => {
		const router = createSiteRouter(page.path);
		const html = renderSite(router);

		expect(router.state.matches.at(-1)?.route.id).toBe(page.file);
		expect(html.match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1]).toBe(page.heading);
		expect(html.match(/<main\b/g)).toHaveLength(1);
		expect(
			html.match(/<nav\b[^>]*aria-label="primary-navigation"/g),
		).toHaveLength(1);
		expect(
			html.match(/<nav\b[^>]*aria-label="Footer navigation"/g),
		).toHaveLength(1);
		expect(html.match(/<footer\b/g)).toHaveLength(1);
		expect(html.indexOf('<header')).toBeLessThan(html.indexOf('<main'));
		expect(html.indexOf('<main')).toBeLessThan(html.indexOf('<footer'));
		expect(html).toContain(
			'is open source, ad-free, and processes your text entirely in your browser',
		);
	});

	it.each(pages)('exports a title and description for $path', (page) => {
		const router = createSiteRouter(page.path);
		const metadata = routeModules[`./${page.file}`].meta({
			location: router.state.location,
			params: {},
			loaderData: undefined,
			matches: router.state.matches.map((match) => ({
				id: match.route.id.replace(/\.tsx$/, ''),
				pathname: match.pathname,
				params: match.params,
				loaderData: undefined,
				meta: [],
			})),
		});

		expect(metadata).toContainEqual({ title: page.title });
		expect(metadata).toContainEqual({
			name: 'description',
			content: expect.stringMatching(/\S/),
		});
		expect(metadata).toContainEqual({
			tagName: 'link',
			rel: 'canonical',
			href: `https://slugify.me${page.path}`,
		});
		expect(metadata).toContainEqual({
			property: 'og:title',
			content: page.title,
		});
		expect(metadata).toContainEqual({
			property: 'og:url',
			content: `https://slugify.me${page.path}`,
		});
		expect(metadata).toContainEqual({
			property: 'og:image',
			content: 'https://slugify.me/social-preview.png',
		});
		expect(metadata).toContainEqual({
			name: 'twitter:card',
			content: 'summary_large_image',
		});
	});

	it('keeps the labelled generator and live output on the home route', () => {
		const html = renderSite(createSiteRouter('/'));

		expect(html).toMatch(
			/<label\b[^>]*for="text-to-slugify"[^>]*>Text to slugify<\/label>/,
		);
		expect(html).toMatch(/<textarea\b[^>]*id="text-to-slugify"/);
		expect(html).toMatch(
			/<label\b[^>]*for="generated-slug"[^>]*>Generated slug<\/label>/,
		);
		const output = html.match(/<output\b[^>]*>/)?.[0];
		expect(output).toContain('id="generated-slug"');
		expect(output).toContain('for="text-to-slugify"');
		expect(output).toContain('aria-live="polite"');
		expect(output).toContain('aria-atomic="true"');
		expect(html).toContain('aria-label="Copy generated slug"');
	});
});

describe('document asset links', () => {
	it('keeps the existing favicons and adds an Apple touch icon', () => {
		expect(documentLinks()).toEqual([
			expect.objectContaining({
				rel: 'icon',
				href: '/favicon.ico',
			}),
			expect.objectContaining({
				rel: 'icon',
				href: '/slug-logo-v2.svg',
			}),
			expect.objectContaining({
				rel: 'apple-touch-icon',
				href: '/apple-touch-icon.png',
				sizes: '180x180',
			}),
		]);
	});
});

describe('site navigation', () => {
	it.each(pages)(
		'keeps home and supporting pages reachable from $path',
		(page) => {
			const html = renderSite(createSiteRouter(page.path));
			const header =
				html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? '';
			const footer =
				html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? '';
			const headerLinks = getLinks(header);
			const footerLinks = getLinks(footer);

			expect(headerLinks).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ href: '/', name: 'slugify.me' }),
					expect.objectContaining({ href: '/about', name: 'About' }),
					expect.objectContaining({ href: '/faq', name: 'FAQ' }),
				]),
			);
			expect(footerLinks).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ href: '/about', name: 'About' }),
					expect.objectContaining({ href: '/faq', name: 'FAQ' }),
					expect.objectContaining({
						href: '/privacy-policy',
						name: 'Privacy Policy',
					}),
				]),
			);
			for (const links of [headerLinks, footerLinks]) {
				expect(links).toContainEqual(
					expect.objectContaining({
						href: 'https://github.com/joshuamae/slugify.me',
						name: 'View source on GitHub',
					}),
				);
			}
		},
	);

	it.each(['/about', '/faq', '/about?source=nav#details', '/faq/'])(
		'marks only the matching primary link current at %s',
		(path) => {
			const html = renderSite(createSiteRouter(path));
			const header =
				html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? '';
			const links = getLinks(header);
			const currentLinks = links.filter(
				(link) => link.current === 'page',
			);
			const expectedHref = path.startsWith('/about') ? '/about' : '/faq';

			expect(currentLinks).toHaveLength(1);
			expect(currentLinks[0].href).toBe(expectedHref);
			expect(currentLinks[0].className.split(' ')).toContain(
				'bg-secondary',
			);
			const otherLink = links.find(
				(link) =>
					['/about', '/faq'].includes(link.href ?? '') &&
					link.href !== expectedHref,
			);
			expect(otherLink).toBeDefined();
			expect(otherLink?.current).toBeUndefined();
			expect(otherLink?.className.split(' ')).not.toContain(
				'bg-secondary',
			);
		},
	);

	it('navigates between pages and restores the previous route on back', async () => {
		const router = createSiteRouter('/');

		for (const path of ['/about', '/faq', '/privacy-policy', '/']) {
			const link = getLinks(renderSite(router)).find(
				(item) => item.href === path,
			);
			if (!link?.href) {
				throw new Error(`Missing navigation link to ${path}`);
			}
			await router.navigate(link.href);
			expect(router.state.location.pathname).toBe(path);
			expect(
				renderSite(router).match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1],
			).toBe(pages.find((page) => page.path === path)?.heading);
		}

		await router.navigate(-1);
		expect(router.state.location.pathname).toBe('/privacy-policy');
		expect(renderSite(router)).toContain('Privacy Policy');
	});
});
