export const WORD_CHARACTER_RE = /^[\p{L}\p{N}]$/u;

export const DECIMAL_DIGIT_RE = /^\p{Nd}$/u;

export const CURRENCY_SYMBOL_RE = /^\p{Sc}$/u;

export const WHITESPACE_RE = /^\s$/u;

export const CONTEXT_PADDING_RE = /^[^\S\r\n\u2028\u2029]$/u;

export const LINE_BREAK_RE = /^[\r\n\u2028\u2029]$/u;

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getCodePointAt(
	value: string,
	index: number,
): string | undefined {
	const codePoint = value.codePointAt(index);
	return codePoint === undefined
		? undefined
		: String.fromCodePoint(codePoint);
}

export function getCodePointBefore(
	value: string,
	index: number,
): string | undefined {
	if (index <= 0) {
		return undefined;
	}

	const lastCodeUnit = value.charCodeAt(index - 1);
	const previousCodeUnit = value.charCodeAt(index - 2);
	const hasSurrogatePair =
		index >= 2 &&
		lastCodeUnit >= 0xdc00 &&
		lastCodeUnit <= 0xdfff &&
		previousCodeUnit >= 0xd800 &&
		previousCodeUnit <= 0xdbff;

	return value.slice(hasSurrogatePair ? index - 2 : index - 1, index);
}

export function getNonWhitespaceCodePointBefore(
	value: string,
	index: number,
): string | undefined {
	let cursor = index;
	let character = getCodePointBefore(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	return character;
}

export function getNonWhitespaceCodePointAt(
	value: string,
	index: number,
): string | undefined {
	let cursor = index;
	let character = getCodePointAt(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	return character;
}
