import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const publicDirectory = resolve(process.cwd(), 'public');

function readPublicFile(filename: string) {
	return readFileSync(resolve(publicDirectory, filename), 'utf8');
}

function readPngDimensions(filename: string) {
	const image = readFileSync(resolve(publicDirectory, filename));
	const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	expect(image.subarray(0, 8)).toEqual(pngSignature);

	return {
		width: image.readUInt32BE(16),
		height: image.readUInt32BE(20),
	};
}

describe('public discovery files', () => {
	it('allows public pages and advertises the sitemap', () => {
		expect(readPublicFile('robots.txt')).toBe(
			'User-agent: *\nAllow: /\n\nSitemap: https://slugify.me/sitemap.xml\n',
		);
	});

	it('lists every public page with canonical URLs and no last-modified dates', () => {
		const sitemap = readPublicFile('sitemap.xml');
		const locations = Array.from(
			sitemap.matchAll(/<loc>([^<]+)<\/loc>/g),
			([, location]) => location,
		);

		expect(locations).toEqual([
			'https://slugify.me/',
			'https://slugify.me/about',
			'https://slugify.me/faq',
			'https://slugify.me/privacy-policy',
		]);
		expect(sitemap).not.toContain('<lastmod>');
	});
});

describe('browser and social images', () => {
	it('provides a standard Apple touch icon', () => {
		expect(readPngDimensions('apple-touch-icon.png')).toEqual({
			width: 180,
			height: 180,
		});
	});

	it('provides a large social preview image', () => {
		expect(readPngDimensions('social-preview.png')).toEqual({
			width: 1200,
			height: 630,
		});
	});
});
