const charReplacements = new Map<string, string>([
	['c++', 'cpp'],
	['c#', 'c-sharp'],
	['c++', 'cpp'],
]);

/**
 * Slugs a given string using the below steps:
 *
 * @param input - The text to convert
 * @returns The generated slug
 *
 * @example
 * slugify("Learn C++ Today!")
 * // Returns "learn-cpp-today"
 */
export function slugify(input: string): string {
	// Normalize, accent deletion, and lowercase
	let slug = input
		.normalize('NFKD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase();

	// Special cases
	for (const [match, replacement] of charReplacements) {
		slug = slug.replaceAll(match, replacement);
	}

	return (
		slug
			// Keep words joined when quotes appear within them: "don't" becomes "dont"
			.replace(/['’‘"“”`]/g, '')
			// Convert spaces, punctuation, symbols, and unmapped emojis into single dashes
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			// Prevent the completed slug from starting or ending with a dash
			.replace(/^-+|-+$/g, '')
	);
}
