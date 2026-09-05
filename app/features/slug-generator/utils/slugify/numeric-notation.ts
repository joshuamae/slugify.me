import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getNonWhitespaceCodePointAt,
	getNonWhitespaceCodePointBefore,
	LINE_BREAK_RE,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	hasBinaryOperatorBefore,
	hasCompleteOperatorContinuation,
	hasUnarySignBefore,
	type RawPostfixOperandContext,
} from './expression-context';
import { isNumericOne } from './number-format';
import {
	getBinaryContext,
	getRawSignedNumericOperandSign,
	getSemanticSignedNumericOperandSign,
	hasAttachedSignedNumericOperand,
	hasExternalMinusBeforeUnsignedEmphasizedFactorial,
	hasPaddedMinusAt,
	hasPaddedMinusBefore,
} from './operand-context';
import {
	EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_NUMERIC_BOUNDARY,
	EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import {
	A_STAR_TERM_RE,
	getDateLikeNumericTokenStarts,
	getNumericPostfixOperandIndexes,
	getPostfixStarOperandIndexes,
	hasProtectedNumericPrefix,
	hasValidPrecedingStarOperator,
	NUMERIC_FACTORIAL_RE,
	NUMERIC_STAR_RATING_RE,
	PERCENTAGE_RE,
	shouldDeferPostfixStar,
} from './postfix-context';
import {
	getBalancedOperandWrapperIndexes,
	hasNumericOnlyWrappingBefore,
	RIGHT_OPERAND_WRAPPER_RE,
} from './wrappers';

const FACTORIAL_RIGHT_CONTEXT_RE = /^[+*/%^<>=&|)\]}]$/u;

export function applyPostfixStarContexts(input: string): string {
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(input);
	const ratingAwareValue = input.replace(
		NUMERIC_STAR_RATING_RE,
		(match, numericValue: string, offset: number, source: string) => {
			const starIndex = offset + match.length - 1;

			if (
				!hasValidPrecedingStarOperator(source, offset) ||
				hasProtectedNumericPrefix(
					source,
					offset,
					dateLikeNumericTokenStarts,
				) ||
				shouldDeferPostfixStar(source, starIndex)
			) {
				return match;
			}

			const unit = isNumericOne(numericValue) ? 'star' : 'stars';

			return `${numericValue}-${unit}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
		},
	);

	return ratingAwareValue.replace(
		A_STAR_TERM_RE,
		(match, offset: number, source: string) => {
			const starIndex = offset + match.length - 1;

			return !hasValidPrecedingStarOperator(source, offset) ||
				shouldDeferPostfixStar(source, starIndex)
				? match
				: 'a-star';
		},
	);
}

function resolveEmphasizedFactorialSigns(value: string): string {
	const output: string[] = [];

	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index);

		if (character === undefined) {
			break;
		}

		const sign =
			character === EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY
				? '+'
				: character === EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY
					? '-'
					: undefined;

		if (sign === undefined) {
			output.push(character);
			index += character.length;
			continue;
		}

		while (
			output.length > 0 &&
			CONTEXT_PADDING_RE.test(output.at(-1) as string)
		) {
			output.pop();
		}

		if (output.at(-1) === sign) {
			output.pop();
			output.push(sign === '+' ? 'positive-' : 'negative-');
		}

		index += character.length;
	}

	return output.join('');
}

export function applyNumericFactorialContexts(input: string): string {
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(input);
	const rawPostfixContext: RawPostfixOperandContext = {
		balancedWrappers: getBalancedOperandWrapperIndexes(input),
		numericPostfixOperandIndexes: getNumericPostfixOperandIndexes(input),
		postfixStarOperandIndexes: getPostfixStarOperandIndexes(input),
	};

	const factorialAware = input.replace(
		NUMERIC_FACTORIAL_RE,
		(
			match,
			value: string,
			closingWrappers: string,
			offset: number,
			source: string,
		) => {
			const hasValidClosingWrappers = hasNumericOnlyWrappingBefore(
				source,
				offset,
				closingWrappers,
			);
			const rawContinuationStart = offset + match.length;
			const emphasisBoundary = getCodePointAt(
				source,
				rawContinuationStart,
			);
			const hasEmphasisBoundary =
				emphasisBoundary === EMPHASIS_NUMERIC_BOUNDARY ||
				emphasisBoundary === EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY ||
				emphasisBoundary ===
					EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY ||
				emphasisBoundary ===
					EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY;
			const startsEmphasizedNumericExpression =
				emphasisBoundary === EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY ||
				emphasisBoundary ===
					EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY ||
				emphasisBoundary ===
					EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY;
			const emphasizedSignBoundary =
				emphasisBoundary ===
					EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY ||
				emphasisBoundary ===
					EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY
					? emphasisBoundary
					: '';
			const continuationStart = hasEmphasisBoundary
				? rawContinuationStart + EMPHASIS_NUMERIC_BOUNDARY.length
				: rawContinuationStart;
			const immediateNext = getCodePointAt(source, continuationStart);
			const continuesExpression = hasCompleteOperatorContinuation(
				source,
				continuationStart,
			);
			const hasStrictEqualityContinuation =
				source.startsWith('===', continuationStart) &&
				continuesExpression;

			if (
				(immediateNext === '=' && !hasStrictEqualityContinuation) ||
				hasProtectedNumericPrefix(
					source,
					offset,
					dateLikeNumericTokenStarts,
				) ||
				!hasValidClosingWrappers
			) {
				return match;
			}

			const previous = getNonWhitespaceCodePointBefore(source, offset);
			const next = getNonWhitespaceCodePointAt(source, continuationStart);
			const hasSubtractionBefore = hasPaddedMinusBefore(source, offset);
			const hasUnaryMinus = hasUnarySignBefore(
				source,
				offset,
				'-',
				rawPostfixContext,
			);
			const hasUnaryPlus = hasUnarySignBefore(
				source,
				offset,
				'+',
				rawPostfixContext,
			);
			const hasOperatorBefore = hasBinaryOperatorBefore(
				source,
				offset,
				rawPostfixContext,
			);
			const hasSubtractionAfter = hasPaddedMinusAt(
				source,
				continuationStart,
			);

			const startsLikeExpression =
				startsEmphasizedNumericExpression ||
				previous === undefined ||
				LINE_BREAK_RE.test(previous) ||
				RIGHT_OPERAND_WRAPPER_RE.test(previous) ||
				hasOperatorBefore ||
				hasUnaryMinus ||
				hasUnaryPlus ||
				hasSubtractionBefore;
			const endsLikeExpression =
				hasEmphasisBoundary ||
				next === undefined ||
				LINE_BREAK_RE.test(next) ||
				FACTORIAL_RIGHT_CONTEXT_RE.test(next) ||
				hasSubtractionAfter;

			return (startsLikeExpression && endsLikeExpression) ||
				continuesExpression
				? `${emphasizedSignBoundary}${value}${closingWrappers}-factorial${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`
				: match;
		},
	);

	return resolveEmphasizedFactorialSigns(factorialAware);
}

export function applyPercentageContexts(input: string): string {
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(input);

	return input.replace(
		PERCENTAGE_RE,
		(_match, value: string, offset: number, source: string) => {
			if (
				hasProtectedNumericPrefix(
					source,
					offset,
					dateLikeNumericTokenStarts,
				)
			) {
				return _match;
			}

			const percentEnd = offset + _match.length;
			const percentIndex = percentEnd - 1;
			const binaryContext = getBinaryContext(
				source,
				percentIndex,
				percentEnd,
			);

			if (
				binaryContext !== undefined &&
				binaryContext.leftIsNumeric &&
				binaryContext.rightIsNumeric
			) {
				return _match;
			}

			let cursor = percentEnd;
			let sign = getCodePointAt(source, cursor);

			while (sign !== undefined && CONTEXT_PADDING_RE.test(sign)) {
				cursor += sign.length;
				sign = getCodePointAt(source, cursor);
			}

			const hasExternalSubtractionBeforeEmphasizedFactorial =
				hasExternalMinusBeforeUnsignedEmphasizedFactorial(
					source,
					percentEnd,
				);

			if (
				!hasExternalSubtractionBeforeEmphasizedFactorial &&
				((sign === '-' &&
					hasAttachedSignedNumericOperand(source, percentEnd)) ||
					getRawSignedNumericOperandSign(source, percentEnd, true) ===
						'-' ||
					getSemanticSignedNumericOperandSign(source, percentEnd) ===
						'-')
			) {
				return _match;
			}

			const next = getCodePointAt(source, offset + _match.length);
			const trailingSeparator =
				next !== undefined && WORD_CHARACTER_RE.test(next) ? ' ' : '';

			return `${value}-percent${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${trailingSeparator}`;
		},
	);
}
