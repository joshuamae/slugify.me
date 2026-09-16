import {
	CONTEXT_PADDING_RE,
	DECIMAL_DIGIT_RE,
	getCodePointAt,
	getCodePointBefore,
	LINE_BREAK_RE,
	WHITESPACE_RE,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	getBinaryContext,
	getOperandCodePointAt,
	getOperandCodePointBefore,
	hasAttachedSignedNumericOperand,
	hasCurrencyLikeNumericOperand,
} from './operand-context';
import {
	EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_NUMERIC_BOUNDARY,
	EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY,
} from './operand-markers';
import {
	getNumericPostfixOperandIndexes,
	getPostfixStarOperandIndexes,
	getPostfixStarOperandKindBefore,
	hasNumericPostfixOperandBefore,
	NUMERIC_STRUCTURE_SEPARATOR_RE,
} from './postfix-context';
import {
	CLOSING_HTML_LIKE_TAG_RE,
	OPENING_HTML_LIKE_TAG_RE,
	URL_LIKE_RE,
	VOID_HTML_TAG_NAMES,
} from './protected-spans';
import {
	type BalancedOperandWrapperIndexes,
	getBalancedOperandWrapperIndexes,
} from './wrappers';

const EMPHASIZED_NUMERIC_FACTORIAL_RE =
	/(?<!\*)\*[^\S\r\n\u2028\u2029]*([+-]?)[^\S\r\n\u2028\u2029]*(?:\p{Nd}{1,3}(?:,\p{Nd}{3})+|\p{Nd}+)[^\S\r\n\u2028\u2029]*![^\S\r\n\u2028\u2029]*(?=\*(?!\*))/gu;

function hasMarkedNumericOperand(value: string, index: number): boolean {
	let cursor = index;
	let marker = getCodePointAt(value, cursor);

	while (marker !== undefined && CONTEXT_PADDING_RE.test(marker)) {
		cursor += marker.length;
		marker = getCodePointAt(value, cursor);
	}

	if (marker !== '#' && marker !== '~') {
		return false;
	}

	cursor += marker.length;
	let next = getCodePointAt(value, cursor);

	while (next !== undefined && CONTEXT_PADDING_RE.test(next)) {
		cursor += next.length;
		next = getCodePointAt(value, cursor);
	}

	return next !== undefined && DECIMAL_DIGIT_RE.test(next);
}

function hasLogicalNotOperand(value: string, index: number): boolean {
	let cursor = index;
	let marker = getCodePointAt(value, cursor);

	while (marker !== undefined && CONTEXT_PADDING_RE.test(marker)) {
		cursor += marker.length;
		marker = getCodePointAt(value, cursor);
	}

	if (marker !== '!') {
		return false;
	}

	const next = getCodePointAt(value, cursor + marker.length);

	return next !== undefined && WORD_CHARACTER_RE.test(next);
}

function hasClearStructuredStarOperator(
	value: string,
	index: number,
	balancedWrappers: BalancedOperandWrapperIndexes,
	numericPostfixOperandIndexes: ReadonlySet<number>,
	hasAdditionalLeftOperand = false,
): boolean {
	const immediateLeft = getCodePointBefore(value, index);
	const immediateRight = getCodePointAt(value, index + 1);
	const leftPadded =
		immediateLeft !== undefined && CONTEXT_PADDING_RE.test(immediateLeft);
	const rightPadded =
		immediateRight !== undefined && CONTEXT_PADDING_RE.test(immediateRight);

	if (leftPadded !== rightPadded) {
		return false;
	}

	const left = getOperandCodePointBefore(value, index);
	const right = getOperandCodePointAt(value, index + 1);
	const hasLeftOperand =
		(left !== undefined && WORD_CHARACTER_RE.test(left)) ||
		hasAdditionalLeftOperand ||
		hasNumericPostfixOperandBefore(
			value,
			index,
			balancedWrappers,
			numericPostfixOperandIndexes,
		);
	const hasRightOperand =
		(right !== undefined && WORD_CHARACTER_RE.test(right)) ||
		hasAttachedSignedNumericOperand(value, index + 1) ||
		hasCurrencyLikeNumericOperand(value, index + 1) ||
		hasMarkedNumericOperand(value, index + 1) ||
		hasLogicalNotOperand(value, index + 1);

	return hasLeftOperand && hasRightOperand;
}

function addStarIndexes(
	value: string,
	start: number,
	indexes: Set<number>,
): void {
	for (let offset = 0; offset < value.length; offset += 1) {
		if (value[offset] === '*') {
			indexes.add(start + offset);
		}
	}
}

function getProtectedEmphasisStarIndexes(value: string): Readonly<{
	indexes: ReadonlySet<number>;
	urlClosingCandidates: ReadonlySet<number>;
}> {
	const indexes = new Set<number>();
	const urlClosingCandidates = new Set<number>();
	const lastClosingTagIndexByName = new Map<string, number>();

	for (const match of value.matchAll(URL_LIKE_RE)) {
		if (match.index !== undefined) {
			addStarIndexes(match[0], match.index, indexes);

			const finalStarOffset = match[0].lastIndexOf('*');
			const trailingCharacters = match[0].slice(finalStarOffset + 1);

			if (
				finalStarOffset >= 0 &&
				/^[^\p{L}\p{N}\s*]*$/u.test(trailingCharacters)
			) {
				urlClosingCandidates.add(match.index + finalStarOffset);
			}
		}
	}

	for (const match of value.matchAll(CLOSING_HTML_LIKE_TAG_RE)) {
		if (match.index === undefined) {
			continue;
		}

		lastClosingTagIndexByName.set(match[1], match.index);
		addStarIndexes(match[0], match.index, indexes);
	}

	for (const match of value.matchAll(OPENING_HTML_LIKE_TAG_RE)) {
		if (match.index === undefined) {
			continue;
		}

		const tag = match[0];
		const name = match[1];
		const previous = getCodePointBefore(value, match.index);
		const hasMarkupBoundary =
			previous === undefined ||
			WHITESPACE_RE.test(previous) ||
			previous === '>';
		const hasClosingTag =
			(lastClosingTagIndexByName.get(name) ?? -1) > match.index;

		if (
			hasMarkupBoundary ||
			hasClosingTag ||
			tag.endsWith('/>') ||
			VOID_HTML_TAG_NAMES.has(name)
		) {
			addStarIndexes(tag, match.index, indexes);
		}
	}

	return { indexes, urlClosingCandidates };
}

function getNumericFactorialEmphasisSigns(
	value: string,
): ReadonlyMap<
	number,
	Readonly<{ openingIndex: number; sign: '' | '+' | '-' }>
> {
	const signs = new Map<
		number,
		Readonly<{ openingIndex: number; sign: '' | '+' | '-' }>
	>();

	for (const match of value.matchAll(EMPHASIZED_NUMERIC_FACTORIAL_RE)) {
		if (match.index !== undefined) {
			signs.set(match.index + match[0].length, {
				openingIndex: match.index,
				sign: match[1] as '' | '+' | '-',
			});
		}
	}

	return signs;
}

export function removeSingleStarEmphasisDelimiters(value: string): string {
	const openingIndexes: number[] = [];
	const delimiterIndexes = new Set<number>();
	const closingIndexes = new Set<number>();
	const openingIndexByClosing = new Map<number, number>();
	const balancedWrappers = getBalancedOperandWrapperIndexes(value);
	const protectedStars = getProtectedEmphasisStarIndexes(value);
	const numericPostfixOperandIndexes = getNumericPostfixOperandIndexes(value);
	const postfixStarOperandIndexes = getPostfixStarOperandIndexes(value);
	const numericFactorialEmphasisSigns =
		getNumericFactorialEmphasisSigns(value);
	const numericFactorialEmphasisOpeningIndexes = new Set(
		Array.from(
			numericFactorialEmphasisSigns.values(),
			({ openingIndex }) => openingIndex,
		),
	);

	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index);

		if (character === undefined) {
			break;
		}

		if (character !== '*') {
			if (LINE_BREAK_RE.test(character)) {
				openingIndexes.length = 0;
			}

			index += character.length;
			continue;
		}

		if (
			protectedStars.indexes.has(index) &&
			(!protectedStars.urlClosingCandidates.has(index) ||
				openingIndexes.length === 0)
		) {
			index += character.length;
			continue;
		}

		const previous = getCodePointBefore(value, index);
		const next = getCodePointAt(value, index + character.length);
		const leftOperand = getOperandCodePointBefore(value, index);
		const isSingleStar = previous !== '*' && next !== '*';
		const isProtectedUrlClosingCandidate =
			protectedStars.urlClosingCandidates.has(index) &&
			openingIndexes.length > 0;
		let leftCursor = index;
		let leftCharacter = getCodePointBefore(value, leftCursor);

		while (
			leftCharacter !== undefined &&
			CONTEXT_PADDING_RE.test(leftCharacter)
		) {
			leftCursor -= leftCharacter.length;
			leftCharacter = getCodePointBefore(value, leftCursor);
		}

		const leftStarIndex =
			leftCharacter === '*' ? leftCursor - leftCharacter.length : -1;
		const hasClosedEmphasisLeft = closingIndexes.has(leftStarIndex);
		const isClearOperator =
			!isProtectedUrlClosingCandidate &&
			(hasClearStructuredStarOperator(
				value,
				index,
				balancedWrappers,
				numericPostfixOperandIndexes,
				hasClosedEmphasisLeft,
			) ||
				(value.startsWith('*=', index) &&
					(getBinaryContext(value, index, index + 2) !== undefined ||
						hasClosedEmphasisLeft ||
						hasNumericPostfixOperandBefore(
							value,
							index,
							balancedWrappers,
							numericPostfixOperandIndexes,
						) ||
						getPostfixStarOperandKindBefore(
							value,
							index,
							balancedWrappers,
							postfixStarOperandIndexes,
						) !== undefined)) ||
				(previous !== undefined &&
					!WHITESPACE_RE.test(previous) &&
					leftOperand !== undefined &&
					WORD_CHARACTER_RE.test(leftOperand) &&
					hasAttachedSignedNumericOperand(
						value,
						index + character.length,
					)));
		const numericFactorialClosingMetadata =
			numericFactorialEmphasisSigns.get(index);
		const isExactNumericFactorialClosing =
			numericFactorialClosingMetadata !== undefined &&
			openingIndexes.at(-1) ===
				numericFactorialClosingMetadata.openingIndex;
		const canClose =
			isSingleStar &&
			!isClearOperator &&
			(isExactNumericFactorialClosing ||
				(previous !== undefined && !WHITESPACE_RE.test(previous))) &&
			(next === undefined ||
				WHITESPACE_RE.test(next) ||
				!WORD_CHARACTER_RE.test(next));

		if (canClose && openingIndexes.length > 0) {
			const openingIndex = openingIndexes.pop() as number;

			delimiterIndexes.add(openingIndex);
			delimiterIndexes.add(index);
			closingIndexes.add(index);
			openingIndexByClosing.set(index, openingIndex);

			index += character.length;
			continue;
		}

		const canOpen =
			isSingleStar &&
			!isClearOperator &&
			(numericFactorialEmphasisOpeningIndexes.has(index) ||
				(next !== undefined && !WHITESPACE_RE.test(next))) &&
			(previous === undefined ||
				WHITESPACE_RE.test(previous) ||
				!WORD_CHARACTER_RE.test(previous));

		if (canOpen) {
			openingIndexes.push(index);
		}

		index += character.length;
	}

	if (delimiterIndexes.size === 0) {
		return value;
	}

	const output: string[] = [];

	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index);

		if (character === undefined) {
			break;
		}

		if (delimiterIndexes.has(index)) {
			const previous = getCodePointBefore(value, index);
			const next = getCodePointAt(value, index + character.length);

			if (
				closingIndexes.has(index) &&
				(previous === '!' ||
					(next === '!' &&
						getCodePointAt(value, index + character.length + 1) !==
							'=') ||
					(next !== undefined &&
						NUMERIC_STRUCTURE_SEPARATOR_RE.test(next)))
			) {
				const emphasizedNumericMetadata =
					numericFactorialEmphasisSigns.get(index);
				const emphasizedNumericSign =
					emphasizedNumericMetadata !== undefined &&
					emphasizedNumericMetadata.openingIndex ===
						openingIndexByClosing.get(index)
						? emphasizedNumericMetadata.sign
						: undefined;

				output.push(
					emphasizedNumericSign === '+'
						? EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY
						: emphasizedNumericSign === '-'
							? EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY
							: emphasizedNumericSign === ''
								? EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY
								: EMPHASIS_NUMERIC_BOUNDARY,
				);
			}
		} else {
			output.push(character);
		}

		index += character.length;
	}

	return output.join('');
}
