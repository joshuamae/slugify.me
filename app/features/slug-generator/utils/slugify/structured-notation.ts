import { withConditionalBoundaries } from './operand-markers';
import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getCodePointBefore,
} from './character-context';
import {
	applyConditionalContexts,
	applyDecrementContexts,
	applyIncrementContexts,
	applyNamedOperatorContexts,
} from './code-notation';
import { applyCurrencyContexts, applyOtherCurrencyContexts } from './currency';
import { removeSingleStarEmphasisDelimiters } from './emphasis';
import { applyEnglishNotation } from './english-notation';
import { applyPostfixTermMappings } from './exceptions';
import {
	BINARY_OPERATOR_START_RE,
	getOperatorStartWithLeftOperand,
	hasUnarySignBefore,
} from './expression-context';
import {
	applyAbsoluteValueContexts,
	applyAlgebraicFactorialContexts,
} from './math-notation';
import {
	applyNumericFactorialContexts,
	applyPercentageContexts,
	applyPostfixStarContexts,
} from './numeric-notation';
import {
	EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_NUMERIC_BOUNDARY,
	EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
	EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import {
	getDateLikeNumericTokenStarts,
	hasProtectedNumericPrefix,
} from './postfix-context';
import {
	silenceHtmlLikeTags,
	silenceSymbols,
	URL_LIKE_RE,
} from './protected-spans';

const GROUPED_NUMBER_RE =
	/(^|[^\p{L}\p{N},])(\p{Nd}{1,3}(?:,\p{Nd}{3})+)(?=$|[^\p{L}\p{N},])/gu;

const DOTTED_NUMBER_RE = /(?<!\p{Nd})\p{Nd}+(?:\.\p{Nd}+)+/gu;

const NUMBER_MARKER_RE =
	/(^|[^\p{L}\p{N}#])#[^\S\r\n\u2028\u2029]*(?=\p{Nd}+(?![\p{L}\p{N}]))/gu;

const APPROXIMATE_NUMBER_RE =
	/(^|[^\p{L}\p{N}~])~[^\S\r\n\u2028\u2029]*(?=\p{Nd})/gu;

const LOGICAL_NOT_PREFIX_RE = withConditionalBoundaries(
	/(^|[-=+*/%^<>&|?@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)!(?=[\p{L}\p{N}])/gu,
);

const UNARY_SIGNED_NUMBER_RE = withConditionalBoundaries(
	/(^|[-=+*/%^<>&|?:,@([{\r\n\u2028\u2029])[^\S\r\n\u2028\u2029]*([+-])[^\S\r\n\u2028\u2029]*(\p{Nd}+(?:\.\p{Nd}+)?)/gu,
);

const EMAIL_ADDRESS_RE =
	/(?:(?<![\p{L}\p{N}._%+-])|(?<=\+)(?=[^+@\s]*@))[\p{L}\p{N}](?:[\p{L}\p{N}_%+-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}_%+-]*[\p{L}\p{N}])?)*@[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?)+(?![\p{L}\p{N}-])/gu;

const SIGNED_SPAN_RE = new RegExp(
	String.raw`([+-])([ \t]*)${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
	'gu',
);

/** Expanded numeric notation still accepts a unary sign in its original position. */
function applySignedSpanContexts(value: string): string {
	return value.replace(
		SIGNED_SPAN_RE,
		(match, sign: '+' | '-', padding: string, offset: number) => {
			if (!hasUnarySignBefore(value, offset + 1 + padding.length, sign))
				return match;
			return `${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${sign === '-' ? 'negative' : 'positive'}-`;
		},
	);
}

export function applyStructuredSymbolContexts(input: string): string {
	const emphasisAwareInput = applyPostfixTermMappings(
		removeSingleStarEmphasisDelimiters(input),
	);
	const notationAwareInput = applyNamedOperatorContexts(
		applyEnglishNotation(
			silenceHtmlLikeTags(
				emphasisAwareInput.replace(URL_LIKE_RE, silenceSymbols),
			),
		),
	);
	const structureAwareInput = applyIncrementContexts(
		applyDecrementContexts(
			applyConditionalContexts(
				applyAlgebraicFactorialContexts(
					applyAbsoluteValueContexts(notationAwareInput),
				),
			),
		),
	);
	const groupedInput = structureAwareInput
		.replace(EMAIL_ADDRESS_RE, (address) =>
			address
				.replaceAll('+', ' plus ')
				.replaceAll('@', ' at ')
				.replaceAll('.', ' dot '),
		)
		.replace(
			NUMBER_MARKER_RE,
			(_match, prefix: string) => `${prefix}number `,
		)
		.replace(
			APPROXIMATE_NUMBER_RE,
			(_match, prefix: string) => `${prefix}approximately `,
		)
		.replace(
			LOGICAL_NOT_PREFIX_RE,
			(_match, prefix: string, padding: string) =>
				`${prefix}${padding ? ' ' : ''}not `,
		)
		.replace(
			GROUPED_NUMBER_RE,
			(_match, prefix: string, value: string) =>
				`${prefix}${value.replaceAll(',', '')}`,
		);
	const currencyAwareInput = applyCurrencyContexts(
		applyOtherCurrencyContexts(applySignedSpanContexts(groupedInput)),
	);
	const postfixOperandAwareInput = applyNumericFactorialContexts(
		applyPercentageContexts(currencyAwareInput),
	);
	const postfixStarAwareInput = applyPostfixStarContexts(
		postfixOperandAwareInput,
	);
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(
		postfixStarAwareInput,
	);
	const structured = postfixStarAwareInput
		.replace(
			UNARY_SIGNED_NUMBER_RE,
			(
				_match,
				prefix: string,
				sign: string,
				value: string,
				offset: number,
				source: string,
			) => {
				const valueStart = offset + _match.length - value.length;
				const prefixEnd = offset + prefix.length;
				const operatorStart =
					prefix && BINARY_OPERATOR_START_RE.test(prefix)
						? getOperatorStartWithLeftOperand(source, prefixEnd)
						: undefined;

				if (
					(prefix &&
						BINARY_OPERATOR_START_RE.test(prefix) &&
						operatorStart === undefined) ||
					hasProtectedNumericPrefix(
						source,
						valueStart,
						dateLikeNumericTokenStarts,
					)
				) {
					return _match;
				}

				const previous = getCodePointBefore(
					source,
					operatorStart ?? offset,
				);
				const paddingAfterPrefix = getCodePointAt(source, prefixEnd);

				if (
					prefix === '+' &&
					sign === '+' &&
					(previous === undefined ||
						!CONTEXT_PADDING_RE.test(previous) ||
						paddingAfterPrefix === undefined ||
						!CONTEXT_PADDING_RE.test(paddingAfterPrefix))
				) {
					return _match;
				}

				const operatorPadding =
					prefix &&
					previous !== undefined &&
					CONTEXT_PADDING_RE.test(previous)
						? ' '
						: '';

				return `${prefix}${operatorPadding}${sign === '+' ? 'positive' : 'negative'}-${value}`;
			},
		)
		.replace(DOTTED_NUMBER_RE, (value) => {
			const parts = value.split('.');
			const separator = parts.length === 2 ? ' point ' : ' dot ';

			return parts.join(separator);
		});

	return structured
		.replaceAll(EMPHASIS_NUMERIC_BOUNDARY, '')
		.replaceAll(EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY, '')
		.replaceAll(EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY, '')
		.replaceAll(EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY, '');
}
