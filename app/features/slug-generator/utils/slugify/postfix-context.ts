import {
	CONTEXT_PADDING_RE,
	DECIMAL_DIGIT_RE,
	getCodePointBefore,
	getNonWhitespaceCodePointAt,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	getBinaryContext,
	hasAttachedSignedNumericOperand,
	hasCurrencyLikeNumericOperand,
} from './operand-context';
import {
	EMPHASIS_NUMERIC_BOUNDARY,
	EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
	isGeneratedEmphasisBoundary,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import {
	type BalancedOperandWrapperIndexes,
	hasNumericOnlyWrappingBefore,
	LEFT_OPERAND_WRAPPER_RE,
	RIGHT_OPERAND_WRAPPER_RE,
} from './wrappers';

export const NUMERIC_STRUCTURE_SEPARATOR_RE = /^[,./:\u066b\u066c]$/u;

export const DATE_LIKE_RE =
	/(?<!\p{Nd})(?:\p{Nd}{4}\/\p{Nd}{1,2}\/\p{Nd}{1,2}|\p{Nd}{1,2}\/\p{Nd}{1,2}\/\p{Nd}{4})(?!\p{Nd})/gu;

export const PERCENTAGE_RE =
	/(?<!\p{Nd})(\p{Nd}+(?:\.\p{Nd}+)?)[^\S\r\n\u2028\u2029]*%(?![^\S\r\n\u2028\u2029]*\p{Nd})(?!=(?:$|[^=]))/gu;

export const NUMERIC_FACTORIAL_RE =
	/(?<![\p{L}\p{N}])(\p{Nd}+)([)\]}]*)[^\S\r\n\u2028\u2029]*!/gu;

export const A_STAR_TERM_RE = /(?<![\p{L}\p{N}])a\*(?!\*|=(?!=))/gu;

export const NUMERIC_STAR_RATING_RE =
	/(?<![\p{L}\p{N}\p{Sc}])(\p{Nd}+(?:\.\p{Nd}+)?)\*(?!\*|=(?!=))/gu;

export function hasValidPrecedingStarOperator(
	value: string,
	operandStart: number,
): boolean {
	if (getCodePointBefore(value, operandStart) !== '*') {
		return true;
	}

	for (const operator of ['**', '*'] as const) {
		const operatorStart = operandStart - operator.length;

		if (
			operatorStart >= 0 &&
			value.startsWith(operator, operatorStart) &&
			getBinaryContext(value, operatorStart, operandStart) !== undefined
		) {
			return true;
		}
	}

	return false;
}

export function hasNumericPostfixOperandBefore(
	value: string,
	index: number,
	balancedWrappers: BalancedOperandWrapperIndexes,
	numericPostfixOperandIndexes: ReadonlySet<number>,
): boolean {
	let cursor = index;
	let character: string | undefined;

	while (true) {
		character = getCodePointBefore(value, cursor);

		if (character === undefined) {
			break;
		}

		const characterStart = cursor - character.length;

		if (
			CONTEXT_PADDING_RE.test(character) ||
			isGeneratedEmphasisBoundary(character) ||
			(LEFT_OPERAND_WRAPPER_RE.test(character) &&
				balancedWrappers.closings.has(characterStart))
		) {
			cursor = characterStart;
			continue;
		}

		break;
	}

	return (
		(character === '!' || character === '%') &&
		numericPostfixOperandIndexes.has(cursor - character.length)
	);
}

export function getPostfixStarOperandKindBefore(
	value: string,
	index: number,
	balancedWrappers: BalancedOperandWrapperIndexes,
	postfixStarOperandIndexes: ReadonlySet<number>,
): 'numeric' | 'word' | undefined {
	let cursor = index;
	let character: string | undefined;

	while (true) {
		character = getCodePointBefore(value, cursor);

		if (character === undefined) {
			break;
		}

		const characterStart = cursor - character.length;

		if (
			CONTEXT_PADDING_RE.test(character) ||
			isGeneratedEmphasisBoundary(character) ||
			(LEFT_OPERAND_WRAPPER_RE.test(character) &&
				balancedWrappers.closings.has(characterStart))
		) {
			cursor = characterStart;
			continue;
		}

		break;
	}

	if (
		character !== '*' ||
		!postfixStarOperandIndexes.has(cursor - character.length)
	) {
		return undefined;
	}

	const beforeStar = getCodePointBefore(value, cursor - character.length);

	return beforeStar !== undefined && DECIMAL_DIGIT_RE.test(beforeStar)
		? 'numeric'
		: 'word';
}

export function getDateLikeNumericTokenStarts(
	value: string,
): ReadonlySet<number> {
	const starts = new Set<number>();

	for (const match of value.matchAll(DATE_LIKE_RE)) {
		if (match.index === undefined) {
			continue;
		}

		for (let offset = 0; offset < match[0].length; offset += 1) {
			if (match[0][offset] === '/') {
				starts.add(match.index + offset + 1);
			}
		}
	}

	return starts;
}

export function hasProtectedNumericPrefix(
	value: string,
	start: number,
	dateLikeNumericTokenStarts: ReadonlySet<number>,
): boolean {
	let cursor = start;
	let previous = getCodePointBefore(value, cursor);
	let hasDecimalSeparator = false;
	let hasOnlySlashSeparators = true;
	let separatorCount = 0;

	if (
		previous !== undefined &&
		NUMERIC_STRUCTURE_SEPARATOR_RE.test(previous)
	) {
		do {
			hasDecimalSeparator ||= previous === '.' || previous === '\u066b';
			hasOnlySlashSeparators &&= previous === '/';
			separatorCount += 1;
			cursor -= previous.length;
			previous = getCodePointBefore(value, cursor);
		} while (
			previous !== undefined &&
			NUMERIC_STRUCTURE_SEPARATOR_RE.test(previous)
		);

		if (
			previous === EMPHASIS_NUMERIC_BOUNDARY ||
			previous === EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY
		) {
			return false;
		}

		const isRootedInNumericOperand =
			previous === SEMANTIC_NUMERIC_OPERAND_BOUNDARY ||
			(previous !== undefined && DECIMAL_DIGIT_RE.test(previous));

		const separators = value.slice(cursor, start);
		if (
			isRootedInNumericOperand &&
			(separators === '//' || separators === '..' || separators === '...')
		)
			return false;

		if (
			hasOnlySlashSeparators &&
			separatorCount === 1 &&
			isRootedInNumericOperand
		) {
			return dateLikeNumericTokenStarts.has(start);
		}

		if (hasDecimalSeparator) {
			return (
				isRootedInNumericOperand ||
				previous === undefined ||
				!WORD_CHARACTER_RE.test(previous)
			);
		}

		return isRootedInNumericOperand;
	}

	if (previous !== '+' && previous !== '-') {
		return false;
	}

	do {
		cursor -= previous.length;
		previous = getCodePointBefore(value, cursor);
	} while (previous === '+' || previous === '-');

	const marker = previous;

	if (marker === undefined) {
		return false;
	}

	const beforeMarker = getCodePointBefore(value, cursor - marker.length);

	return (
		beforeMarker !== undefined &&
		((marker === 'e' && DECIMAL_DIGIT_RE.test(beforeMarker)) ||
			((marker === 'x' || marker === 'b' || marker === 'o') &&
				beforeMarker === '0'))
	);
}

export function getNumericPostfixOperandIndexes(
	value: string,
): ReadonlySet<number> {
	const indexes = new Set<number>();
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(value);

	for (const match of value.matchAll(NUMERIC_FACTORIAL_RE)) {
		if (match.index === undefined) {
			continue;
		}

		const closingWrappers = match[2];
		const hasValidClosingWrappers = hasNumericOnlyWrappingBefore(
			value,
			match.index,
			closingWrappers,
		);

		if (
			hasProtectedNumericPrefix(
				value,
				match.index,
				dateLikeNumericTokenStarts,
			) ||
			!hasValidClosingWrappers
		) {
			continue;
		}

		indexes.add(match.index + match[0].lastIndexOf('!'));
	}

	for (const match of value.matchAll(PERCENTAGE_RE)) {
		if (
			match.index !== undefined &&
			!hasProtectedNumericPrefix(
				value,
				match.index,
				dateLikeNumericTokenStarts,
			)
		) {
			indexes.add(match.index + match[0].lastIndexOf('%'));
		}
	}

	return indexes;
}

export function shouldDeferPostfixStar(
	value: string,
	starIndex: number,
): boolean {
	if (getBinaryContext(value, starIndex, starIndex + 1) !== undefined) {
		return true;
	}

	if (hasAttachedSignedNumericOperand(value, starIndex + 1)) {
		return true;
	}

	if (hasCurrencyLikeNumericOperand(value, starIndex + 1)) {
		return true;
	}

	const next = getNonWhitespaceCodePointAt(value, starIndex + 1);

	return (
		next !== undefined &&
		(DECIMAL_DIGIT_RE.test(next) ||
			next === SEMANTIC_NUMERIC_OPERAND_BOUNDARY ||
			RIGHT_OPERAND_WRAPPER_RE.test(next))
	);
}

export function getPostfixStarOperandIndexes(
	value: string,
): ReadonlySet<number> {
	const indexes = new Set<number>();
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(value);

	for (const match of value.matchAll(NUMERIC_STAR_RATING_RE)) {
		if (match.index === undefined) {
			continue;
		}

		const starIndex = match.index + match[0].length - 1;

		if (
			hasValidPrecedingStarOperator(value, match.index) &&
			!hasProtectedNumericPrefix(
				value,
				match.index,
				dateLikeNumericTokenStarts,
			) &&
			!shouldDeferPostfixStar(value, starIndex)
		) {
			indexes.add(starIndex);
		}
	}

	for (const match of value.matchAll(A_STAR_TERM_RE)) {
		if (match.index === undefined) {
			continue;
		}

		const starIndex = match.index + match[0].length - 1;

		if (
			hasValidPrecedingStarOperator(value, match.index) &&
			!shouldDeferPostfixStar(value, starIndex)
		) {
			indexes.add(starIndex);
		}
	}

	return indexes;
}
