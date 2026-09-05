import { expect } from 'vitest';
import { slugify } from '../slugify';

export const validSlugPattern = /^(?:[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)?$/u;

export function expectStableSlug(input: string, expected: string): void {
	const actual = slugify(input);

	expect(actual).toBe(expected);
	expect(actual).toMatch(validSlugPattern);
	expect(slugify(actual)).toBe(actual);
}
