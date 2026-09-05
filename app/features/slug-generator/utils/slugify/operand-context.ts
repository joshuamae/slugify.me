import {
	CONTEXT_PADDING_RE,
	CURRENCY_SYMBOL_RE,
	DECIMAL_DIGIT_RE,
	getCodePointAt,
	getCodePointBefore,
	WORD_CHARACTER_RE,
} from './character-context';
import { SUBSCRIPT_RE, SUPERSCRIPT_RE } from './data/notation';
import { type OperatorOperandMode } from './data/operator-mappings';
import {
	EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
	isGeneratedEmphasisBoundary,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import { LEFT_OPERAND_WRAPPER_RE, RIGHT_OPERAND_WRAPPER_RE } from './wrappers';

const SIGNED_NUMERIC_OPERAND_RE =
	/(?:(?:[^\S\r\n\u2028\u2029])|[([{])*(?:positive|negative)-\p{Nd}/uy;

export type BinaryContext = Readonly<{
	left: string;
	right: string;
	leftIsNumeric: boolean;
	rightIsNumeric: boolean;
	padded: boolean;
}>;

export function getWordBefore(value: string, end: number): string {
	let start = end;
	let character = getCodePointBefore(value, start);
	while (
		character !== undefined &&
		WORD_CHARACTER_RE.test(character) &&
		!SUPERSCRIPT_RE.test(character) &&
		!SUBSCRIPT_RE.test(character)
	) {
		start -= character.length;
		character = getCodePointBefore(value, start);
	}
	return value.slice(start, end);
}

export function hasPaddedMinusBefore(value: string, index: number): boolean {
	let cursor = index;
	let character = getCodePointBefore(value, cursor);

	if (character === undefined || !CONTEXT_PADDING_RE.test(character)) {
		return false;
	}

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	if (character !== '-') {
		return false;
	}

	const beforeMinus = getCodePointBefore(value, cursor - character.length);

	return beforeMinus !== undefined && CONTEXT_PADDING_RE.test(beforeMinus);
}

export function hasPaddedMinusAt(value: string, index: number): boolean {
	let cursor = index;
	let character = getCodePointAt(value, cursor);

	if (character === undefined || !CONTEXT_PADDING_RE.test(character)) {
		return false;
	}

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	if (character !== '-') {
		return false;
	}

	const afterMinus = getCodePointAt(value, cursor + character.length);

	return afterMinus !== undefined && CONTEXT_PADDING_RE.test(afterMinus);
}

export function getOperandCodePointBefore(
	value: string,
	index: number,
): string | undefined {
	let cursor = index;
	let character = getCodePointBefore(value, cursor);

	while (
		character !== undefined &&
		(CONTEXT_PADDING_RE.test(character) ||
			LEFT_OPERAND_WRAPPER_RE.test(character) ||
			isGeneratedEmphasisBoundary(character))
	) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	return character;
}

export function getOperandCodePointAt(
	value: string,
	index: number,
): string | undefined {
	let cursor = index;
	let character = getCodePointAt(value, cursor);

	while (
		character !== undefined &&
		(CONTEXT_PADDING_RE.test(character) ||
			RIGHT_OPERAND_WRAPPER_RE.test(character))
	) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	return character;
}

export function getBinaryContext(
	value: string,
	start: number,
	end: number,
): BinaryContext | undefined {
	const immediateLeft = getCodePointBefore(value, start);
	const immediateRight = getCodePointAt(value, end);
	const leftPadded =
		immediateLeft !== undefined && CONTEXT_PADDING_RE.test(immediateLeft);
	const rightPadded =
		immediateRight !== undefined && CONTEXT_PADDING_RE.test(immediateRight);

	if (leftPadded !== rightPadded) {
		return undefined;
	}

	const left = getOperandCodePointBefore(value, start);
	const right = getOperandCodePointAt(value, end);
	const leftIsMarkedNumeric = left === SEMANTIC_NUMERIC_OPERAND_BOUNDARY;
	const rightIsMarkedNumeric = right === SEMANTIC_NUMERIC_OPERAND_BOUNDARY;

	if (
		left === undefined ||
		right === undefined ||
		(!WORD_CHARACTER_RE.test(left) && !leftIsMarkedNumeric) ||
		(!WORD_CHARACTER_RE.test(right) && !rightIsMarkedNumeric)
	) {
		return undefined;
	}

	SIGNED_NUMERIC_OPERAND_RE.lastIndex = end;

	return {
		left,
		right,
		leftIsNumeric: leftIsMarkedNumeric || DECIMAL_DIGIT_RE.test(left),
		rightIsNumeric:
			rightIsMarkedNumeric ||
			DECIMAL_DIGIT_RE.test(right) ||
			SIGNED_NUMERIC_OPERAND_RE.test(value),
		padded: leftPadded,
	};
}

export function supportsOperandMode(
	context: BinaryContext,
	mode: OperatorOperandMode,
): boolean {
	switch (mode) {
		case 'numeric':
			return context.leftIsNumeric && context.rightIsNumeric;
		case 'identifier-right':
			return !context.rightIsNumeric;
		case 'numeric-or-padded':
			return (
				context.padded ||
				(context.leftIsNumeric && context.rightIsNumeric)
			);
		case 'padded':
			return context.padded;
		case 'any':
			return true;
	}
}

export function hasAttachedSignedNumericOperand(
	value: string,
	index: number,
): boolean {
	SIGNED_NUMERIC_OPERAND_RE.lastIndex = index;

	if (SIGNED_NUMERIC_OPERAND_RE.test(value)) {
		return true;
	}

	let cursor = index;
	let sign = getCodePointAt(value, cursor);
	let hasPaddingBeforeSign = false;

	while (sign !== undefined && CONTEXT_PADDING_RE.test(sign)) {
		hasPaddingBeforeSign = true;
		cursor += sign.length;
		sign = getCodePointAt(value, cursor);
	}

	if (sign !== '+' && sign !== '-') {
		return false;
	}

	const signEnd = cursor + sign.length;

	cursor = signEnd;
	let next = getCodePointAt(value, cursor);

	while (next !== undefined && CONTEXT_PADDING_RE.test(next)) {
		cursor += next.length;
		next = getCodePointAt(value, cursor);
	}

	return (
		next !== undefined &&
		DECIMAL_DIGIT_RE.test(next) &&
		(!hasPaddingBeforeSign || cursor === signEnd)
	);
}

export function getRawSignedNumericOperandSign(
	value: string,
	index: number,
	requireOpeningWrapper = false,
): '+' | '-' | undefined {
	let cursor = index;
	let character = getCodePointAt(value, cursor);
	let hasOpeningWrapper = false;

	while (
		character !== undefined &&
		(CONTEXT_PADDING_RE.test(character) ||
			RIGHT_OPERAND_WRAPPER_RE.test(character))
	) {
		hasOpeningWrapper ||= RIGHT_OPERAND_WRAPPER_RE.test(character);
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	if (character !== '+' && character !== '-') {
		return undefined;
	}

	const sign = character;

	cursor += character.length;
	character = getCodePointAt(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	return (!requireOpeningWrapper || hasOpeningWrapper) &&
		character !== undefined &&
		DECIMAL_DIGIT_RE.test(character)
		? sign
		: undefined;
}

export function getSemanticSignedNumericOperandSign(
	value: string,
	index: number,
): '+' | '-' | undefined {
	let cursor = index;
	let character = getCodePointAt(value, cursor);

	while (
		character !== undefined &&
		(CONTEXT_PADDING_RE.test(character) ||
			RIGHT_OPERAND_WRAPPER_RE.test(character))
	) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	for (const [prefix, sign] of [
		['positive-', '+'],
		['negative-', '-'],
	] as const) {
		if (
			value.startsWith(prefix, cursor) &&
			DECIMAL_DIGIT_RE.test(
				getCodePointAt(value, cursor + prefix.length) ?? '',
			)
		) {
			return sign;
		}
	}

	return undefined;
}

export function hasExternalMinusBeforeUnsignedEmphasizedFactorial(
	value: string,
	index: number,
): boolean {
	let cursor = index;
	let character = getCodePointAt(value, cursor);
	let hasPaddingBeforeMinus = false;

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		hasPaddingBeforeMinus = true;
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	if (character !== '-') {
		return false;
	}

	cursor += character.length;
	character = getCodePointAt(value, cursor);
	let hasPaddingAfterMinus = false;

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		hasPaddingAfterMinus = true;
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	if (character === undefined || !DECIMAL_DIGIT_RE.test(character)) {
		return false;
	}

	do {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	} while (character !== undefined && DECIMAL_DIGIT_RE.test(character));

	if (character !== undefined && LEFT_OPERAND_WRAPPER_RE.test(character)) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	return (
		hasPaddingBeforeMinus &&
		hasPaddingAfterMinus &&
		character === '!' &&
		getCodePointAt(value, cursor + character.length) ===
			EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY
	);
}

export function hasCurrencyLikeNumericOperand(
	value: string,
	index: number,
): boolean {
	let cursor = index;
	let character = getCodePointAt(value, cursor);
	let hasCurrencySymbol = false;

	while (
		character !== undefined &&
		(CONTEXT_PADDING_RE.test(character) ||
			character === '+' ||
			character === '-' ||
			CURRENCY_SYMBOL_RE.test(character))
	) {
		hasCurrencySymbol ||= CURRENCY_SYMBOL_RE.test(character);
		cursor += character.length;
		character = getCodePointAt(value, cursor);
	}

	return (
		hasCurrencySymbol &&
		character !== undefined &&
		DECIMAL_DIGIT_RE.test(character)
	);
}
