export function normalizeForSlug(value: string): string {
	return normalizeUnicode(value).toLowerCase();
}

function normalizeUnicode(value: string): string {
	return value.normalize('NFKD').replace(/\p{M}+/gu, '');
}

/** Render the resolved notation as a lowercase slug using the existing cleanup rules. */
export function finalizeSlug(value: string): string {
	return value
		.replace(/['’‘"“”`]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
