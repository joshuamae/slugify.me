import { withConditionalBoundaries } from './operand-markers';
import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getCodePointBefore,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	BINARY_OPERATOR_START_RE,
	getOperatorStartWithLeftOperand,
	type RawPostfixOperandContext,
} from './expression-context';
import { isNumericOne } from './number-format';
import { type NotationSpan, replaceNotationSpans } from './notation-spans';
import { SEMANTIC_NUMERIC_OPERAND_BOUNDARY } from './operand-markers';
import {
	getNumericPostfixOperandIndexes,
	getPostfixStarOperandIndexes,
} from './postfix-context';
import { getBalancedOperandWrapperIndexes } from './wrappers';

const CURRENCY_AMOUNT_RE =
	/\$(?:[^\S\r\n\u2028\u2029]*([+-])[^\S\r\n\u2028\u2029]*|[^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;

const ATTACHED_PREFIX_SIGNED_CURRENCY_RE =
	/(?<![+-])([+-])\$[^\S\r\n\u2028\u2029]*([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;

const PREFIX_SIGNED_CURRENCY_RE = withConditionalBoundaries(
	/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)([+-])([^\S\r\n\u2028\u2029]*)\$([^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu,
);

const PREFIX_CURRENCY_SIGN_RE = withConditionalBoundaries(
	/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)\$([^\S\r\n\u2028\u2029]*)([+-])([^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu,
);

function formatCurrencyAmount(amount: string, sign = ''): string {
	const [whole, fraction] = amount.split('.');
	const spokenAmount = fraction ? `${whole}-point-${fraction}` : whole;
	const spokenSign =
		sign === '+' ? 'positive-' : sign === '-' ? 'negative-' : '';
	const isOneDollar = isNumericOne(amount);

	return `${spokenSign}${spokenAmount}-${isOneDollar ? 'dollar' : 'dollars'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
}

// Names identify the written currency symbol, without inferring a country or exchange rate.
const currencyNames: Readonly<Record<string, readonly [string, string]>> = {
	'£': ['pound', 'pounds'],
	'€': ['euro', 'euros'],
	'¢': ['cent', 'cents'],
	'¥': ['yen', 'yen'],
	'₹': ['rupee', 'rupees'],
	'₩': ['won', 'won'],
	'₽': ['ruble', 'rubles'],
	'₿': ['bitcoin', 'bitcoin'],
	'₺': ['lira', 'lira'],
	'₴': ['hryvnia', 'hryvnias'],
	'₪': ['shekel', 'shekels'],
	'₫': ['dong', 'dong'],
	'฿': ['baht', 'baht'],
	'₱': ['peso', 'pesos'],
	'₦': ['naira', 'naira'],
	'₡': ['colon', 'colones'],
	'₲': ['guarani', 'guaranies'],
	'₭': ['kip', 'kip'],
	'₮': ['tugrik', 'tugriks'],
	'₵': ['cedi', 'cedis'],
	'₸': ['tenge', 'tenge'],
	'₼': ['manat', 'manats'],
	'₾': ['lari', 'lari'],
	'៛': ['riel', 'riel'],
	'؋': ['afghani', 'afghanis'],
	'֏': ['dram', 'drams'],
	'৳': ['taka', 'taka'],
};

const CURRENCY_NAME_PATTERN = Object.keys(currencyNames).join('');

const OTHER_PREFIX_CURRENCY_RE = new RegExp(
	`(?<![\\p{L}\\p{N}\\p{Sc}.,])([+-]?)([${CURRENCY_NAME_PATTERN}])[ \\t]*([+-]?)[ \\t]*([0-9]+(?:\\.[0-9]+)?)(?![\\p{L}\\p{N}.,])`,
	'gu',
);

const OTHER_SUFFIX_CURRENCY_RE = new RegExp(
	`(?<![\\p{L}\\p{N}\\p{Sc}.,])([+-]?)([0-9]+(?:\\.[0-9]+)?)[ \\t]*([${CURRENCY_NAME_PATTERN}])(?![\\p{L}\\p{N}\\p{Sc}])`,
	'gu',
);

const OTHER_CURRENCY_RE = new RegExp(
	`${OTHER_PREFIX_CURRENCY_RE.source}|${OTHER_SUFFIX_CURRENCY_RE.source}`,
	'gu',
);

/** Recognize amounts against one source, retaining operators outside each amount span. */
export function applyOtherCurrencyContexts(value: string): string {
	const spans: NotationSpan[] = [];
	const rawPostfixContext = getRawPostfixContext(value);
	for (const match of value.matchAll(OTHER_CURRENCY_RE)) {
		const [
			,
			prefixSign,
			prefixSymbol,
			amountSign,
			prefixAmount,
			suffixSign,
			suffixAmount,
			suffixSymbol,
		] = match;
		if (prefixSign && amountSign) continue;
		const sign = prefixSign || amountSign || suffixSign;
		const previous = getCodePointBefore(value, match.index);
		if (previous !== undefined && /[+−-]/u.test(previous)) {
			if (
				(previous === '+' && sign === '+') ||
				getOperatorStartWithLeftOperand(
					value,
					match.index,
					rawPostfixContext,
				) === undefined
			)
				continue;
		}
		const amount = prefixAmount ?? suffixAmount;
		const symbol = prefixSymbol ?? suffixSymbol;
		const unit = currencyNames[symbol][isNumericOne(amount) ? 0 : 1];
		spans.push({
			kind: 'numeric',
			start: match.index,
			end: match.index + match[0].length,
			reading: `${amount.replace('.', '-point-')}-${unit}`,
			sign: sign === '+' || sign === '-' ? sign : undefined,
		});
	}
	return replaceNotationSpans(value, spans);
}

function getRawPostfixContext(source: string): RawPostfixOperandContext {
	return {
		balancedWrappers: getBalancedOperandWrapperIndexes(source),
		numericPostfixOperandIndexes: getNumericPostfixOperandIndexes(source),
		postfixStarOperandIndexes: getPostfixStarOperandIndexes(source),
	};
}

export function applyCurrencyContexts(input: string): string {
	const prefixSignedContext = getRawPostfixContext(input);

	const prefixSigned = input.replace(
		PREFIX_SIGNED_CURRENCY_RE,
		(
			match,
			prefix: string,
			paddingBeforeSign: string,
			sign: string,
			paddingAfterSign: string,
			_dollarPadding: string,
			amount: string,
			offset: number,
			source: string,
		) => {
			const prefixEnd = offset + prefix.length;
			const operatorStart =
				prefix && BINARY_OPERATOR_START_RE.test(prefix)
					? getOperatorStartWithLeftOperand(
							source,
							prefixEnd,
							prefixSignedContext,
						)
					: undefined;
			const previous = getCodePointBefore(
				source,
				operatorStart ?? offset,
			);
			const next = getCodePointAt(source, offset + match.length);
			const prefixHasLeftOperand =
				prefix !== '' && operatorStart !== undefined;
			const hasUnambiguousBinaryPlus =
				previous !== undefined &&
				CONTEXT_PADDING_RE.test(previous) &&
				paddingBeforeSign !== '';

			if (
				(prefix &&
					BINARY_OPERATOR_START_RE.test(prefix) &&
					!prefixHasLeftOperand) ||
				(prefix === '+' &&
					sign === '+' &&
					prefixHasLeftOperand &&
					!hasUnambiguousBinaryPlus) ||
				(prefix === '*' &&
					prefixHasLeftOperand &&
					previous !== undefined &&
					!CONTEXT_PADDING_RE.test(previous) &&
					paddingBeforeSign !== '' &&
					paddingAfterSign !== '')
			) {
				return match;
			}

			const operatorPadding =
				prefix &&
				previous !== undefined &&
				CONTEXT_PADDING_RE.test(previous)
					? ' '
					: '';
			const trailingSeparator =
				next !== undefined && WORD_CHARACTER_RE.test(next) ? ' ' : '';

			return `${prefix}${operatorPadding}${formatCurrencyAmount(amount, sign)}${trailingSeparator}`;
		},
	);
	// Every replacement pass inspects a single source; its indexes belong to that source.
	const amountSignedContext = getRawPostfixContext(prefixSigned);
	return prefixSigned
		.replace(
			PREFIX_CURRENCY_SIGN_RE,
			(
				match,
				prefix: string,
				_prefixPadding: string,
				_dollarPadding: string,
				sign: string,
				_signPadding: string,
				amount: string,
				offset: number,
				source: string,
			) => {
				const prefixEnd = offset + prefix.length;
				const operatorStart =
					prefix && BINARY_OPERATOR_START_RE.test(prefix)
						? getOperatorStartWithLeftOperand(
								source,
								prefixEnd,
								amountSignedContext,
							)
						: undefined;
				const previous = getCodePointBefore(
					source,
					operatorStart ?? offset,
				);
				const next = getCodePointAt(source, offset + match.length);

				if (
					prefix &&
					BINARY_OPERATOR_START_RE.test(prefix) &&
					operatorStart === undefined
				) {
					return match;
				}

				const operatorPadding =
					prefix &&
					previous !== undefined &&
					CONTEXT_PADDING_RE.test(previous)
						? ' '
						: '';
				const trailingSeparator =
					next !== undefined && WORD_CHARACTER_RE.test(next)
						? ' '
						: '';

				return `${prefix}${operatorPadding}${formatCurrencyAmount(amount, sign)}${trailingSeparator}`;
			},
		)
		.replace(
			ATTACHED_PREFIX_SIGNED_CURRENCY_RE,
			(
				match,
				sign: string,
				amount: string,
				offset: number,
				source: string,
			) => {
				const previous = getCodePointBefore(source, offset);

				if (
					previous !== undefined &&
					!CONTEXT_PADDING_RE.test(previous)
				) {
					return match;
				}

				let cursor = offset;
				let beforePadding = previous;

				while (
					beforePadding !== undefined &&
					CONTEXT_PADDING_RE.test(beforePadding)
				) {
					cursor -= beforePadding.length;
					beforePadding = getCodePointBefore(source, cursor);
				}

				if (
					beforePadding !== undefined &&
					BINARY_OPERATOR_START_RE.test(beforePadding)
				) {
					return match;
				}

				const next = getCodePointAt(source, offset + match.length);
				const trailingSeparator =
					next !== undefined && WORD_CHARACTER_RE.test(next)
						? ' '
						: '';

				return `${formatCurrencyAmount(amount, sign)}${trailingSeparator}`;
			},
		)
		.replace(
			CURRENCY_AMOUNT_RE,
			(
				match,
				sign: string | undefined,
				amount: string,
				offset: number,
				source: string,
			) => {
				const previous = getCodePointBefore(source, offset);

				if (previous === '$') {
					return match;
				}

				const next = getCodePointAt(source, offset + match.length);
				const leadingSeparator =
					previous !== undefined && WORD_CHARACTER_RE.test(previous)
						? ' '
						: '';
				const trailingSeparator =
					next !== undefined && WORD_CHARACTER_RE.test(next)
						? ' '
						: '';

				return `${leadingSeparator}${formatCurrencyAmount(amount, sign)}${trailingSeparator}`;
			},
		);
}
