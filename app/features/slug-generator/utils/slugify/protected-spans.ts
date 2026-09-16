import { getCodePointBefore, WHITESPACE_RE } from './character-context';

export const URL_LIKE_RE =
	/(?<![\p{L}\p{N}_])(?:(?:https?|ftp):\/\/|www\.)[^\s]+/gu;

export const OPENING_HTML_LIKE_TAG_RE = /<([a-z][a-z0-9-]*)(?:\s[^<>]*)?\/?>/gu;

export const CLOSING_HTML_LIKE_TAG_RE = /<\/([a-z][a-z0-9-]*)\s*>/gu;

export const VOID_HTML_TAG_NAMES = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

export const RAW_URL_RE = new RegExp(URL_LIKE_RE.source, 'iuy');

export const RAW_TAG_RE = /<\/?[a-z](?:[^<>"']|"[^"]*"|'[^']*')*>/iuy;

export function silenceSymbols(value: string): string {
	return value.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
}

export function silenceHtmlLikeTags(input: string): string {
	const lastClosingTagIndexByName = new Map<string, number>();

	for (const match of input.matchAll(CLOSING_HTML_LIKE_TAG_RE)) {
		if (match.index !== undefined) {
			lastClosingTagIndexByName.set(match[1], match.index);
		}
	}

	return input
		.replace(
			OPENING_HTML_LIKE_TAG_RE,
			(tag, name: string, offset: number) => {
				const previous = getCodePointBefore(input, offset);
				const hasMarkupBoundary =
					previous === undefined ||
					WHITESPACE_RE.test(previous) ||
					previous === '>';
				const hasClosingTag =
					(lastClosingTagIndexByName.get(name) ?? -1) > offset;

				return hasMarkupBoundary ||
					hasClosingTag ||
					tag.endsWith('/>') ||
					VOID_HTML_TAG_NAMES.has(name)
					? silenceSymbols(tag)
					: tag;
			},
		)
		.replace(CLOSING_HTML_LIKE_TAG_RE, silenceSymbols);
}
