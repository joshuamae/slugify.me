import { withConditionalBoundaries } from './operand-markers';
import {
	CONTEXT_PADDING_RE,
	DECIMAL_DIGIT_RE,
	escapeRegExp,
	getCodePointAt,
	getCodePointBefore,
	LINE_BREAK_RE,
	WORD_CHARACTER_RE,
} from './character-context';
import { contextualOperatorMappings } from './data/operator-mappings';
import { SEMANTIC_NUMERIC_OPERAND_BOUNDARY } from './operand-markers';
import { type NotationSpan, replaceNotationSpans } from './notation-spans';
import {
	CLOSING_HTML_LIKE_TAG_RE,
	RAW_TAG_RE,
	RAW_URL_RE,
	VOID_HTML_TAG_NAMES,
} from './protected-spans';
import {
	getBalancedOperandWrapperIndexes,
	LEFT_OPERAND_WRAPPER_RE,
	RIGHT_OPERAND_WRAPPER_RE,
} from './wrappers';

const EXACT_INCREMENT_RE = /(?<!\+)\+\+(?!\+)/g;

const GENERIC_TYPE_NAMES = new Set([
	'array',
	'box',
	'deque',
	'dict',
	'hashmap',
	'hashset',
	'integral_constant',
	'iterator',
	'list',
	'map',
	'observable',
	'option',
	'optional',
	'pair',
	'promise',
	'record',
	'result',
	'set',
	'span',
	'tuple',
	'unique_ptr',
	'shared_ptr',
	'unordered_map',
	'unordered_set',
	'variant',
	'vec',
	'vector',
]);

/** Recognize balanced type arguments without mistaking ordinary comparisons for types. */
export function preserveGenericTypes(value: string): string {
	const closingByOpening = new Map<number, number>();
	const lastClosingTagByName = new Map<string, number>();
	for (const match of value.matchAll(
		new RegExp(CLOSING_HTML_LIKE_TAG_RE.source, 'giu'),
	))
		lastClosingTagByName.set(match[1].toLowerCase(), match.index);
	const openings: number[] = [];
	const invalidPrefix = new Uint32Array(value.length + 1);
	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index) as string;
		const invalid = /[\p{L}\p{N}\s_.$:,*&?()[\]<>='"+/-]/u.test(character)
			? 0
			: 1;
		for (let unit = 1; unit <= character.length; unit += 1)
			invalidPrefix[index + unit] = invalidPrefix[index] + invalid;
		if (
			character === '<' &&
			!/[<=>-]/u.test(value[index + 1] ?? '') &&
			value[index - 1] !== '<'
		)
			openings.push(index);
		else if (
			character === '>' &&
			value[index + 1] !== '=' &&
			value[index - 1] !== '='
		) {
			const opening = openings.pop();
			if (opening !== undefined) closingByOpening.set(opening, index);
		}
		index += character.length;
	}
	const activeClosings: number[] = [];
	const output: string[] = [];
	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index) as string;
		if (/[hfw]/iu.test(character)) {
			RAW_URL_RE.lastIndex = index;
			const url = RAW_URL_RE.exec(value);
			if (url !== null) {
				output.push(url[0]);
				index += url[0].length;
				continue;
			}
		}
		if (activeClosings.at(-1) === index) {
			activeClosings.pop();
			if (WORD_CHARACTER_RE.test(getCodePointAt(value, index + 1) ?? ''))
				output.push('-');
			index += 1;
			continue;
		}
		if (character === '<') {
			RAW_TAG_RE.lastIndex = index;
			const tag = RAW_TAG_RE.exec(value);
			const tagName =
				tag === null
					? ''
					: (/^<\/?([a-z][a-z0-9-]*)/iu
							.exec(tag[0])?.[1]
							.toLowerCase() ?? '');
			if (
				tag !== null &&
				(tag[0].startsWith('</') ||
					tag[0].endsWith('/>') ||
					VOID_HTML_TAG_NAMES.has(tagName) ||
					(lastClosingTagByName.get(tagName) ?? -1) > index)
			) {
				output.push(tag[0]);
				index += tag[0].length;
				continue;
			}
			let identifierStart = index;
			let before = getCodePointBefore(value, identifierStart);
			while (before !== undefined && /^[\p{L}\p{N}_$]$/u.test(before)) {
				identifierStart -= before.length;
				before = getCodePointBefore(value, identifierStart);
			}
			const identifier = value.slice(identifierStart, index);
			const closing = closingByOpening.get(index);
			const looksLikeType =
				activeClosings.length > 0 ||
				/^[A-Z]/u.test(identifier) ||
				GENERIC_TYPE_NAMES.has(identifier.toLowerCase()) ||
				value.slice(identifierStart - 2, identifierStart) === '::';
			if (
				identifier !== '' &&
				looksLikeType &&
				closing !== undefined &&
				closing > index + 1 &&
				invalidPrefix[closing] === invalidPrefix[index + 1]
			) {
				output.push('-of-');
				activeClosings.push(closing);
				index += 1;
				continue;
			}
			if (tag !== null) {
				output.push(tag[0]);
				index += tag[0].length;
				continue;
			}
		}
		output.push(character);
		index += character.length;
	}
	return output.join('');
}

const namedOperatorReadings: Readonly<Record<string, string>> = {
	...Object.fromEntries(
		contextualOperatorMappings.map(({ source, replacement }) => [
			source,
			replacement,
		]),
	),
	'++': 'increment',
	'--': 'decrement',
	'!': 'logical-not',
	'~': 'bitwise-not',
	'^': 'xor',
	'%': 'modulo',
	'*': 'asterisk',
	'?:': 'conditional',
	'[]': 'subscript',
	'()': 'call',
	'...': 'spread',
	'&': 'ampersand',
};

const NAMED_OPERATOR_RE = new RegExp(
	`(?<![\\p{L}\\p{N}])(${Object.keys(namedOperatorReadings)
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp)
		.join('|')})(?=[ \\t]+operators?\\b)`,
	'gu',
);

const OVERLOADED_OPERATOR_RE = new RegExp(
	`\\boperator(${Object.keys(namedOperatorReadings)
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp)
		.join('|')})(?![\\p{L}\\p{N}_+*/%<>=&|?:.-])`,
	'gu',
);

export function applyNamedOperatorContexts(value: string): string {
	return value
		.replace(
			NAMED_OPERATOR_RE,
			(match, operator: string, offset: number, source: string) => {
				if (
					(operator === '-' || operator === '/') &&
					offset > 0 &&
					!/(?:^|\s)(?:the|a|an)[ \t]+$/iu.test(
						source.slice(Math.max(0, offset - 8), offset),
					)
				)
					return match;
				return namedOperatorReadings[operator];
			},
		)
		.replace(
			OVERLOADED_OPERATOR_RE,
			(_match, operator: string) =>
				`operator-${namedOperatorReadings[operator]}`,
		);
}

/** A question and colon at the same wrapper depth form one conditional operator. */
export function applyConditionalContexts(value: string): string {
	const questions: { index: number; depth: number }[] = [];
	const replacements: NotationSpan[] = [];
	let depth = 0;
	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		if (LINE_BREAK_RE.test(character)) {
			questions.length = 0;
			depth = 0;
			continue;
		}
		if (character === '"' || character === "'") {
			let end = index + 1;
			while (end < value.length && !LINE_BREAK_RE.test(value[end])) {
				if (value[end] === '\\') end += 2;
				else if (value[end] === character) break;
				else end += 1;
			}
			// An unterminated quoted span consumes the rest of its line. Retrying
			// every escaped quote would otherwise repeatedly scan the same suffix.
			index = value[end] === character ? end : end - 1;
			continue;
		}
		if (RIGHT_OPERAND_WRAPPER_RE.test(character)) depth += 1;
		if (LEFT_OPERAND_WRAPPER_RE.test(character)) {
			while ((questions.at(-1)?.depth ?? -1) >= depth) questions.pop();
			depth = Math.max(0, depth - 1);
		}
		if (character !== '?' && character !== ':') continue;
		const previous = value[index - 1] ?? '';
		const next = value[index + 1] ?? '';
		if (
			(character === '?' && (previous === '?' || /[?.=]/u.test(next))) ||
			(character === ':' && (previous === ':' || /[:=]/u.test(next)))
		)
			continue;
		let left = index;
		let right = index + 1;
		while (left > 0 && CONTEXT_PADDING_RE.test(value[left - 1])) left -= 1;
		while (right < value.length && CONTEXT_PADDING_RE.test(value[right]))
			right += 1;
		const leftPadded = left < index;
		const rightPadded = right > index + 1;
		const leftOperand = getCodePointBefore(value, left) ?? '';
		const rightOperand = getCodePointAt(value, right) ?? '';
		if (
			leftPadded !== rightPadded ||
			(!/[\p{L}\p{N})\]}"'%!]/u.test(leftOperand) &&
				leftOperand !== SEMANTIC_NUMERIC_OPERAND_BOUNDARY) ||
			(!/[\p{L}\p{N}([{!+\-"']/u.test(rightOperand) &&
				rightOperand !== SEMANTIC_NUMERIC_OPERAND_BOUNDARY)
		)
			continue;
		if (character === '?') questions.push({ index, depth });
		else if (questions.at(-1)?.depth === depth) {
			const question = questions.pop() as {
				index: number;
				depth: number;
			};
			replacements.push(
				{
					kind: 'conditional',
					start: question.index,
					end: question.index + 1,
					branch: 'then',
				},
				{
					kind: 'conditional',
					start: index,
					end: index + 1,
					branch: 'else',
				},
			);
		}
	}
	return replaceNotationSpans(value, replacements);
}

const DECREMENT_PREFIX_RE = withConditionalBoundaries(
	/[(=,:;+*/%<>&|!?][ \t]*$/u,
);

/** Postfix updates are unambiguous; prefix decrements need an expression context to protect CLI flags. */
export function applyDecrementContexts(value: string): string {
	return value.replace(/(?<!-)--(?!-)/gu, (match, index: number) => {
		const before = getCodePointBefore(value, index);
		const after = getCodePointAt(value, index + 2);
		const left = before !== undefined && /[\p{L}\p{N})\]}]/u.test(before);
		const right = after !== undefined && /[\p{L}_$([{]/u.test(after);
		if (left === right) return match;
		if (left) {
			if (after !== undefined && !/[\s;,.)\]}+*/%<>=&|!?]/u.test(after))
				return match;
			return '-decrement-';
		}
		const prefix = value.slice(Math.max(0, index - 8), index);
		const identifier = /^[\p{L}_$][\p{L}\p{N}_$]*/u.exec(
			value.slice(index + 2),
		)?.[0];
		if (
			DECREMENT_PREFIX_RE.test(prefix) ||
			(index === 0 &&
				identifier !== undefined &&
				Array.from(identifier).length === 1)
		)
			return 'decrement-';
		return match;
	});
}

function getProtectedNumericIncrementIndexes(
	value: string,
): ReadonlySet<number> {
	const indexes = new Set<number>();

	for (let index = 0; index < value.length;) {
		const marker = getCodePointAt(value, index);

		if (marker === undefined) {
			break;
		}

		const beforeMarker = getCodePointBefore(value, index);
		const startsNumericSignRun =
			beforeMarker !== undefined &&
			((marker === 'e' && DECIMAL_DIGIT_RE.test(beforeMarker)) ||
				((marker === 'x' || marker === 'b' || marker === 'o') &&
					beforeMarker === '0'));

		if (!startsNumericSignRun) {
			index += marker.length;
			continue;
		}

		let cursor = index + marker.length;
		let sign = getCodePointAt(value, cursor);

		while (sign === '+' || sign === '-') {
			const previous = getCodePointBefore(value, cursor);
			const next = getCodePointAt(value, cursor + sign.length);
			const afterNext =
				next === undefined
					? undefined
					: getCodePointAt(value, cursor + sign.length + next.length);

			if (
				sign === '+' &&
				next === '+' &&
				previous !== '+' &&
				afterNext !== '+'
			) {
				indexes.add(cursor);
			}

			cursor += sign.length;
			sign = getCodePointAt(value, cursor);
		}

		index = cursor;
	}

	return indexes;
}

export function applyIncrementContexts(input: string): string {
	const balancedWrappers = getBalancedOperandWrapperIndexes(input);
	const protectedNumericIncrementIndexes =
		getProtectedNumericIncrementIndexes(input);

	return input.replace(
		EXACT_INCREMENT_RE,
		(match, offset: number, source: string) => {
			if (protectedNumericIncrementIndexes.has(offset)) {
				return match;
			}

			const immediateLeft = getCodePointBefore(source, offset);
			const immediateRight = getCodePointAt(
				source,
				offset + match.length,
			);
			const hasLeftOperand =
				(immediateLeft !== undefined &&
					WORD_CHARACTER_RE.test(immediateLeft)) ||
				(immediateLeft !== undefined &&
					LEFT_OPERAND_WRAPPER_RE.test(immediateLeft) &&
					balancedWrappers.closings.has(
						offset - immediateLeft.length,
					));
			const hasRightOperand =
				(immediateRight !== undefined &&
					WORD_CHARACTER_RE.test(immediateRight)) ||
				(immediateRight !== undefined &&
					RIGHT_OPERAND_WRAPPER_RE.test(immediateRight) &&
					balancedWrappers.openings.has(offset + match.length));

			if (hasLeftOperand === hasRightOperand) {
				return match;
			}

			return hasLeftOperand ? ' increment' : 'increment ';
		},
	);
}
