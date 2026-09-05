import { withConditionalBoundaries } from './operand-markers';
import {
	CONTEXT_PADDING_RE,
	DECIMAL_DIGIT_RE,
	getCodePointAt,
	getCodePointBefore,
	LINE_BREAK_RE,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	compiledContextualOperatorMappings,
	contextualOperatorMappingsByInitial,
} from './data/operator-mappings';
import {
	type BinaryContext,
	getOperandCodePointAt,
	getOperandCodePointBefore,
	getRawSignedNumericOperandSign,
	hasAttachedSignedNumericOperand,
	supportsOperandMode,
} from './operand-context';
import {
	isConditionalBoundary,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import {
	getPostfixStarOperandKindBefore,
	hasNumericPostfixOperandBefore,
} from './postfix-context';
import {
	type BalancedOperandWrapperIndexes,
	RIGHT_OPERAND_WRAPPER_RE,
} from './wrappers';

export const BINARY_OPERATOR_START_RE =
	withConditionalBoundaries(/^[-+*/%^<>=&|@?:.]$/u);

export type RawPostfixOperandContext = Readonly<{
	balancedWrappers: BalancedOperandWrapperIndexes;
	numericPostfixOperandIndexes: ReadonlySet<number>;
	postfixStarOperandIndexes: ReadonlySet<number>;
}>;

export function getOperatorStartWithLeftOperand(
	value: string,
	end: number,
	rawPostfixContext?: RawPostfixOperandContext,
): number | undefined {
	// These boundaries were produced only by a paired, same-line ternary.
	if (isConditionalBoundary(value[end - 1])) return end - 1;
	for (const mapping of compiledContextualOperatorMappings) {
		const start = end - mapping.source.length;

		if (start < 0 || !value.startsWith(mapping.source, start)) {
			continue;
		}

		const left = getOperandCodePointBefore(value, start);
		const leftIsMarkedNumeric = left === SEMANTIC_NUMERIC_OPERAND_BOUNDARY;
		const hasRawNumericPostfixOperand =
			rawPostfixContext !== undefined &&
			hasNumericPostfixOperandBefore(
				value,
				start,
				rawPostfixContext.balancedWrappers,
				rawPostfixContext.numericPostfixOperandIndexes,
			);
		const rawPostfixStarKind =
			rawPostfixContext === undefined
				? undefined
				: getPostfixStarOperandKindBefore(
						value,
						start,
						rawPostfixContext.balancedWrappers,
						rawPostfixContext.postfixStarOperandIndexes,
					);
		const rawPostfixKind = hasRawNumericPostfixOperand
			? 'numeric'
			: rawPostfixStarKind;

		if (
			(left === undefined || !WORD_CHARACTER_RE.test(left)) &&
			!leftIsMarkedNumeric &&
			rawPostfixKind === undefined
		) {
			continue;
		}

		const immediateLeft = getCodePointBefore(value, start);
		const contextualLeft =
			rawPostfixKind === 'numeric'
				? '0'
				: rawPostfixKind === 'word'
					? 'a'
					: (left as string);
		const context: BinaryContext = {
			left: contextualLeft,
			right: '0',
			leftIsNumeric:
				leftIsMarkedNumeric ||
				rawPostfixKind === 'numeric' ||
				DECIMAL_DIGIT_RE.test(contextualLeft),
			rightIsNumeric: true,
			padded:
				immediateLeft !== undefined &&
				CONTEXT_PADDING_RE.test(immediateLeft),
		};

		if (supportsOperandMode(context, mapping.operandMode ?? 'any')) {
			return start;
		}
	}

	for (const operator of ['%', '^'] as const) {
		const start = end - operator.length;

		if (start < 0 || !value.startsWith(operator, start)) {
			continue;
		}

		const left = getOperandCodePointBefore(value, start);
		const leftIsMarkedNumeric = left === SEMANTIC_NUMERIC_OPERAND_BOUNDARY;
		const hasRawNumericPostfixOperand =
			rawPostfixContext !== undefined &&
			hasNumericPostfixOperandBefore(
				value,
				start,
				rawPostfixContext.balancedWrappers,
				rawPostfixContext.numericPostfixOperandIndexes,
			);
		const rawPostfixStarKind =
			rawPostfixContext === undefined
				? undefined
				: getPostfixStarOperandKindBefore(
						value,
						start,
						rawPostfixContext.balancedWrappers,
						rawPostfixContext.postfixStarOperandIndexes,
					);
		const hasRawNumericLeft =
			hasRawNumericPostfixOperand || rawPostfixStarKind === 'numeric';

		if (
			((left !== undefined && WORD_CHARACTER_RE.test(left)) ||
				leftIsMarkedNumeric ||
				hasRawNumericLeft) &&
			(operator === '^' ||
				leftIsMarkedNumeric ||
				hasRawNumericLeft ||
				(left !== undefined && DECIMAL_DIGIT_RE.test(left)))
		) {
			return start;
		}
	}

	return undefined;
}

export function hasUnarySignBefore(
	value: string,
	index: number,
	sign: '+' | '-',
	rawPostfixContext?: RawPostfixOperandContext,
): boolean {
	let cursor = index;
	let character = getCodePointBefore(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	if (character !== sign) {
		return false;
	}

	cursor -= character.length;
	character = getCodePointBefore(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	if (character === undefined || LINE_BREAK_RE.test(character)) {
		return true;
	}

	if (RIGHT_OPERAND_WRAPPER_RE.test(character)) {
		return true;
	}

	return (
		BINARY_OPERATOR_START_RE.test(character) &&
		getOperatorStartWithLeftOperand(value, cursor, rawPostfixContext) !==
			undefined
	);
}

export function hasBinaryOperatorBefore(
	value: string,
	index: number,
	rawPostfixContext?: RawPostfixOperandContext,
): boolean {
	let operatorEnd = index;
	let character = getCodePointBefore(value, operatorEnd);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		operatorEnd -= character.length;
		character = getCodePointBefore(value, operatorEnd);
	}

	if (character === undefined || !BINARY_OPERATOR_START_RE.test(character)) {
		return false;
	}

	const operatorStart = getOperatorStartWithLeftOperand(
		value,
		operatorEnd,
		rawPostfixContext,
	);

	if (operatorStart === undefined) {
		return false;
	}

	const immediateLeft = getCodePointBefore(value, operatorStart);
	const leftPadded =
		immediateLeft !== undefined && CONTEXT_PADDING_RE.test(immediateLeft);
	const rightPadded = operatorEnd < index;

	return leftPadded === rightPadded;
}

export function hasCompleteOperatorContinuation(
	value: string,
	start: number,
): boolean {
	let operatorStart = start;
	let initial = getCodePointAt(value, operatorStart);

	while (initial !== undefined && CONTEXT_PADDING_RE.test(initial)) {
		operatorStart += initial.length;
		initial = getCodePointAt(value, operatorStart);
	}

	if (initial === undefined) {
		return false;
	}

	const leftPadded = operatorStart > start;
	const getContinuationContext = (
		operatorEnd: number,
	): BinaryContext | undefined => {
		const immediateRight = getCodePointAt(value, operatorEnd);
		const rightPadded =
			immediateRight !== undefined &&
			CONTEXT_PADDING_RE.test(immediateRight);

		if (leftPadded !== rightPadded) {
			return undefined;
		}

		const right = getOperandCodePointAt(value, operatorEnd);
		const hasSignedRight =
			hasAttachedSignedNumericOperand(value, operatorEnd) ||
			getRawSignedNumericOperandSign(value, operatorEnd) !== undefined;

		if (
			(right === undefined || !WORD_CHARACTER_RE.test(right)) &&
			!hasSignedRight
		) {
			return undefined;
		}

		const contextualRight = hasSignedRight ? '0' : (right as string);

		return {
			left: '0',
			right: contextualRight,
			leftIsNumeric: true,
			rightIsNumeric: DECIMAL_DIGIT_RE.test(contextualRight),
			padded: leftPadded,
		};
	};

	for (const mapping of contextualOperatorMappingsByInitial.get(initial) ??
		[]) {
		if (!value.startsWith(mapping.source, operatorStart)) {
			continue;
		}

		const end = operatorStart + mapping.source.length;
		const context = getContinuationContext(end);

		if (
			context !== undefined &&
			supportsOperandMode(context, mapping.operandMode ?? 'any')
		) {
			return true;
		}
	}

	if (
		(initial === '%' || initial === '^') &&
		getCodePointAt(value, operatorStart + initial.length) !== '='
	) {
		const context = getContinuationContext(operatorStart + initial.length);

		return (
			context !== undefined && (initial === '^' || context.rightIsNumeric)
		);
	}

	return false;
}
