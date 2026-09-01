import type { MetaDescriptor } from 'react-router';

const siteOrigin = 'https://slugify.me';
const socialPreviewUrl = `${siteOrigin}/social-preview.png`;
const socialPreviewAlt =
	'slugify.me, an open source browser-based slug generator';

type PageMetadata = {
	title: string;
	description: string;
	pathname: string;
};

export function createPageMetadata({
	title,
	description,
	pathname,
}: PageMetadata) {
	const canonicalUrl = `${siteOrigin}${pathname}`;

	return [
		{ title },
		{ name: 'description', content: description },
		{
			tagName: 'link',
			rel: 'canonical',
			href: canonicalUrl,
		},
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: 'slugify.me' },
		{ property: 'og:locale', content: 'en_US' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: canonicalUrl },
		{ property: 'og:image', content: socialPreviewUrl },
		{ property: 'og:image:type', content: 'image/png' },
		{ property: 'og:image:width', content: '1200' },
		{ property: 'og:image:height', content: '630' },
		{ property: 'og:image:alt', content: socialPreviewAlt },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description },
		{ name: 'twitter:image', content: socialPreviewUrl },
		{ name: 'twitter:image:alt', content: socialPreviewAlt },
	] satisfies MetaDescriptor[];
}
