const WORD_CHARACTER_RE = /^[\p{L}\p{N}]$/u;
const DECIMAL_DIGIT_RE = /^\p{Nd}$/u;
const CURRENCY_SYMBOL_RE = /^\p{Sc}$/u;
const WHITESPACE_RE = /^\s$/u;
const CONTEXT_PADDING_RE = /^[^\S\r\n\u2028\u2029]$/u;
const LINE_BREAK_RE = /^[\r\n\u2028\u2029]$/u;
const NUMERIC_STRUCTURE_SEPARATOR_RE = /^[,./:\u066b\u066c]$/u;
const EMPHASIS_NUMERIC_BOUNDARY = '\u0000';
const SEMANTIC_NUMERIC_OPERAND_BOUNDARY = '\u0001';
const EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY = '\u0002';
const EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY = '\u0003';
const EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY = '\u0004';
const EMPHASIS_NUMERIC_BOUNDARY_ESCAPE = '\ufffd';
const VALID_REPLACEMENT_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const GROUPED_NUMBER_RE =
	/(^|[^\p{L}\p{N},])(\p{Nd}{1,3}(?:,\p{Nd}{3})+)(?=$|[^\p{L}\p{N},])/gu;
const CURRENCY_AMOUNT_RE =
	/\$(?:[^\S\r\n\u2028\u2029]*([+-])[^\S\r\n\u2028\u2029]*|[^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;
const ATTACHED_PREFIX_SIGNED_CURRENCY_RE =
	/(?<![+-])([+-])\$[^\S\r\n\u2028\u2029]*([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;
const PREFIX_SIGNED_CURRENCY_RE =
	/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)([+-])([^\S\r\n\u2028\u2029]*)\$([^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;
const PREFIX_CURRENCY_SIGN_RE =
	/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)\$([^\S\r\n\u2028\u2029]*)([+-])([^\S\r\n\u2028\u2029]*)([0-9]+(?:\.[0-9]+)?)(?![\p{Nd}.,\u066b\u066c])/gu;
const DOTTED_NUMBER_RE = /(?<!\p{Nd})\p{Nd}+(?:\.\p{Nd}+)+/gu;
const DATE_LIKE_RE =
	/(?<!\p{Nd})(?:\p{Nd}{4}\/\p{Nd}{1,2}\/\p{Nd}{1,2}|\p{Nd}{1,2}\/\p{Nd}{1,2}\/\p{Nd}{4})(?!\p{Nd})/gu;
const NUMBER_MARKER_RE =
	/(^|[^\p{L}\p{N}#])#[^\S\r\n\u2028\u2029]*(?=\p{Nd}+(?![\p{L}\p{N}]))/gu;
const APPROXIMATE_NUMBER_RE =
	/(^|[^\p{L}\p{N}~])~[^\S\r\n\u2028\u2029]*(?=\p{Nd})/gu;
const LOGICAL_NOT_PREFIX_RE =
	/(^|[-=+*/%^<>&|?@([{\r\n\u2028\u2029])([^\S\r\n\u2028\u2029]*)!(?=[\p{L}\p{N}])/gu;
const UNARY_SIGNED_NUMBER_RE =
	/(^|[-=+*/%^<>&|?:,@([{\r\n\u2028\u2029])[^\S\r\n\u2028\u2029]*([+-])[^\S\r\n\u2028\u2029]*(\p{Nd}+(?:\.\p{Nd}+)?)/gu;
const PERCENTAGE_RE =
	/(?<!\p{Nd})(\p{Nd}+(?:\.\p{Nd}+)?)[^\S\r\n\u2028\u2029]*%(?![^\S\r\n\u2028\u2029]*\p{Nd})(?!=(?:$|[^=]))/gu;
const NUMERIC_FACTORIAL_RE =
	/(?<![\p{L}\p{N}])(\p{Nd}+)([)\]}]*)[^\S\r\n\u2028\u2029]*!/gu;
const EMPHASIZED_NUMERIC_FACTORIAL_RE =
	/(?<!\*)\*[^\S\r\n\u2028\u2029]*([+-]?)[^\S\r\n\u2028\u2029]*(?:\p{Nd}{1,3}(?:,\p{Nd}{3})+|\p{Nd}+)[^\S\r\n\u2028\u2029]*![^\S\r\n\u2028\u2029]*(?=\*(?!\*))/gu;
const EMAIL_ADDRESS_RE =
	/(?:(?<![\p{L}\p{N}._%+-])|(?<=\+)(?=[^+@\s]*@))[\p{L}\p{N}](?:[\p{L}\p{N}_%+-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}_%+-]*[\p{L}\p{N}])?)*@[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?)+(?![\p{L}\p{N}-])/gu;
const URL_LIKE_RE = /(?<![\p{L}\p{N}_])(?:(?:https?|ftp):\/\/|www\.)[^\s]+/gu;
const OPENING_HTML_LIKE_TAG_RE = /<([a-z][a-z0-9-]*)(?:\s[^<>]*)?\/?>/gu;
const CLOSING_HTML_LIKE_TAG_RE = /<\/([a-z][a-z0-9-]*)\s*>/gu;
const VOID_HTML_TAG_NAMES = new Set([
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
const EXACT_INCREMENT_RE = /(?<!\+)\+\+(?!\+)/g;
const A_STAR_TERM_RE = /(?<![\p{L}\p{N}])a\*(?!\*|=(?!=))/gu;
const NUMERIC_STAR_RATING_RE =
	/(?<![\p{L}\p{N}\p{Sc}])(\p{Nd}+(?:\.\p{Nd}+)?)\*(?!\*|=(?!=))/gu;
const NUMERIC_COLLATOR = new Intl.Collator('en', { numeric: true });
const LEFT_OPERAND_WRAPPER_RE = /^[)\]}]$/u;
const RIGHT_OPERAND_WRAPPER_RE = /^[([{]$/u;
const FACTORIAL_RIGHT_CONTEXT_RE = /^[+*/%^<>=&|)\]}]$/u;
const BINARY_OPERATOR_START_RE = /^[-+*/%^<>=&|@]$/u;
const SIGNED_NUMERIC_OPERAND_RE =
	/(?:(?:[^\S\r\n\u2028\u2029])|[([{])*(?:positive|negative)-\p{Nd}/uy;
const MATCHING_OPENING_WRAPPER = {
	')': '(',
	']': '[',
	'}': '{',
} as const;
const MATCHING_CLOSING_WRAPPER = {
	'(': ')',
	'[': ']',
	'{': '}',
} as const;

function isGeneratedEmphasisBoundary(character: string): boolean {
	return (
		character === EMPHASIS_NUMERIC_BOUNDARY ||
		character === EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY ||
		character === EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY ||
		character === EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY
	);
}

export type ExceptionMatchMode = 'term' | 'literal';

export type ExceptionMapping = Readonly<{
	source: string;
	replacement: string;
	mode: ExceptionMatchMode;
}>;

type CompiledExceptionMapping = Readonly<{
	replacement: string;
	mode: ExceptionMatchMode;
	matcher: RegExp;
	length: number;
	declarationIndex: number;
}>;

type OperatorOperandMode = 'any' | 'numeric-or-padded' | 'padded';

type ContextualOperatorMapping = Readonly<{
	source: string;
	replacement: string;
	operandMode?: OperatorOperandMode;
}>;

type CompiledContextualOperatorMapping = ContextualOperatorMapping &
	Readonly<{ declarationIndex: number }>;

type BinaryContext = Readonly<{
	left: string;
	right: string;
	leftIsNumeric: boolean;
	rightIsNumeric: boolean;
	padded: boolean;
}>;

type BalancedOperandWrapperIndexes = Readonly<{
	openings: ReadonlySet<number>;
	closings: ReadonlySet<number>;
}>;

type RawPostfixOperandContext = Readonly<{
	balancedWrappers: BalancedOperandWrapperIndexes;
	numericPostfixOperandIndexes: ReadonlySet<number>;
	postfixStarOperandIndexes: ReadonlySet<number>;
}>;

type WrapperFrame = Readonly<{
	opening: keyof typeof MATCHING_CLOSING_WRAPPER;
	openingIndex: number;
	wordCountAtOpen: number;
}>;

const exceptionMappings = [
	{ source: 'C++', replacement: 'cpp', mode: 'term' },
	{ source: 'C#', replacement: 'c-sharp', mode: 'term' },
	{ source: '.NET', replacement: 'dot-net', mode: 'term' },
] as const satisfies readonly ExceptionMapping[];

const contextualOperatorMappings = [
	{ source: '===', replacement: 'strictly-equals' },
	{ source: '!==', replacement: 'strictly-not-equals' },
	{ source: '**=', replacement: 'to-the-power-of-equals' },
	{ source: '==', replacement: 'equals' },
	{ source: '!=', replacement: 'not-equals' },
	{ source: '<>', replacement: 'not-equals' },
	{ source: '<=', replacement: 'less-than-or-equal-to' },
	{ source: '>=', replacement: 'greater-than-or-equal-to' },
	{ source: '&&', replacement: 'and' },
	{ source: '||', replacement: 'or' },
	{ source: '**', replacement: 'to-the-power-of' },
	{ source: '+=', replacement: 'plus-equals' },
	{ source: '-=', replacement: 'minus-equals' },
	{ source: '*=', replacement: 'times-equals' },
	{ source: '/=', replacement: 'divided-by-equals' },
	{ source: '%=', replacement: 'modulo-equals' },
	{ source: '&=', replacement: 'and-equals' },
	{ source: '|=', replacement: 'or-equals' },
	{ source: '^=', replacement: 'xor-equals' },
	{ source: '+', replacement: 'plus' },
	{ source: '=', replacement: 'equals' },
	{ source: '*', replacement: 'times' },
	{ source: '&', replacement: 'and' },
	{ source: '|', replacement: 'or' },
	{ source: '<', replacement: 'less-than' },
	{ source: '>', replacement: 'greater-than' },
	{ source: '@', replacement: 'at' },
	{
		source: '/',
		replacement: 'divided-by',
		operandMode: 'numeric-or-padded',
	},
	{ source: '-', replacement: 'minus', operandMode: 'padded' },
] as const satisfies readonly ContextualOperatorMapping[];

const compiledContextualOperatorMappings = contextualOperatorMappings
	.map<CompiledContextualOperatorMapping>((mapping, declarationIndex) => ({
		...mapping,
		declarationIndex,
	}))
	.sort(
		(left, right) =>
			right.source.length - left.source.length ||
			left.declarationIndex - right.declarationIndex,
	);

const contextualOperatorMappingsByInitial = new Map<
	string,
	readonly CompiledContextualOperatorMapping[]
>();

for (const mapping of compiledContextualOperatorMappings) {
	const initial = mapping.source[0];
	const mappings = contextualOperatorMappingsByInitial.get(initial) ?? [];

	contextualOperatorMappingsByInitial.set(initial, [...mappings, mapping]);
}

function normalizeForSlug(value: string): string {
	return normalizeUnicode(value).toLowerCase();
}

function normalizeUnicode(value: string): string {
	return value.normalize('NFKD').replace(/\p{M}+/gu, '');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCodePointAt(value: string, index: number): string | undefined {
	const codePoint = value.codePointAt(index);
	return codePoint === undefined
		? undefined
		: String.fromCodePoint(codePoint);
}

function getCodePointBefore(value: string, index: number): string | undefined {
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

function getNonWhitespaceCodePointBefore(
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

function getNonWhitespaceCodePointAt(
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

function hasPaddedMinusBefore(value: string, index: number): boolean {
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

function hasPaddedMinusAt(value: string, index: number): boolean {
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

function getOperatorStartWithLeftOperand(
	value: string,
	end: number,
	rawPostfixContext?: RawPostfixOperandContext,
): number | undefined {
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

function hasUnarySignBefore(
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

function hasBinaryOperatorBefore(
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

function getOperandCodePointBefore(
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

function getOperandCodePointAt(
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

function getBinaryContext(
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

function supportsOperandMode(
	context: BinaryContext,
	mode: OperatorOperandMode,
): boolean {
	switch (mode) {
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

function hasCompleteOperatorContinuation(
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

function hasTermBoundaries(value: string, start: number, end: number): boolean {
	const previous = getCodePointBefore(value, start);
	const next = getCodePointAt(value, end);

	return (
		(previous === undefined || !WORD_CHARACTER_RE.test(previous)) &&
		(next === undefined || !WORD_CHARACTER_RE.test(next))
	);
}

function compileExceptionMappings(
	mappings: readonly ExceptionMapping[],
): readonly CompiledExceptionMapping[] {
	const compiledMappings: CompiledExceptionMapping[] = [];

	for (const [declarationIndex, mapping] of mappings.entries()) {
		if (mapping.mode !== 'term' && mapping.mode !== 'literal') {
			throw new Error(
				`Exception mapping at index ${declarationIndex} has an invalid mode`,
			);
		}

		const source = normalizeForSlug(mapping.source);

		if (!source) {
			throw new Error(
				`Exception mapping at index ${declarationIndex} must have a non-empty source`,
			);
		}

		// Unicode lowercasing is context-sensitive, so retain `i` for
		// equivalent single-code-point forms such as Greek sigma (`σ`/`ς`).
		const matcher = new RegExp(escapeRegExp(source), 'iuy');
		const hasDuplicateSource = compiledMappings.some((compiledMapping) => {
			compiledMapping.matcher.lastIndex = 0;
			const match = compiledMapping.matcher.exec(source);

			return match?.[0].length === source.length;
		});

		if (hasDuplicateSource) {
			throw new Error(
				`Duplicate canonical exception source: ${JSON.stringify(source)}`,
			);
		}

		if (
			normalizeForSlug(mapping.replacement) !== mapping.replacement ||
			!VALID_REPLACEMENT_RE.test(mapping.replacement)
		) {
			throw new Error(
				`Exception replacement must be a normalized slug fragment: ${JSON.stringify(mapping.replacement)}`,
			);
		}

		compiledMappings.push({
			replacement: mapping.replacement,
			mode: mapping.mode,
			matcher,
			length: Array.from(source).length,
			declarationIndex,
		});
	}

	return compiledMappings.sort(
		(left, right) =>
			right.length - left.length ||
			left.declarationIndex - right.declarationIndex,
	);
}

/**
 * Creates a one-pass exception mapper.
 *
 * @internal Exported for focused validation and precedence tests.
 */
export function createExceptionMappingApplier(
	mappings: readonly ExceptionMapping[],
): (input: string) => string {
	const compiledMappings = compileExceptionMappings(mappings);

	return (input) => {
		const normalized = normalizeForSlug(input);

		if (compiledMappings.length === 0) {
			return normalized;
		}

		const output: string[] = [];

		for (let index = 0; index < normalized.length;) {
			let applied = false;

			for (const mapping of compiledMappings) {
				mapping.matcher.lastIndex = index;
				const match = mapping.matcher.exec(normalized);

				if (!match) {
					continue;
				}

				const end = index + match[0].length;

				if (
					mapping.mode === 'term' &&
					!hasTermBoundaries(normalized, index, end)
				) {
					continue;
				}

				output.push(mapping.replacement);
				index = end;
				applied = true;
				break;
			}

			if (applied) {
				continue;
			}

			const character = getCodePointAt(normalized, index);

			if (character === undefined) {
				break;
			}

			output.push(character);
			index += character.length;
		}

		return output.join('');
	};
}

const applyExceptionMappings = createExceptionMappingApplier(exceptionMappings);

function silenceSymbols(value: string): string {
	return value.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
}

function silenceHtmlLikeTags(input: string): string {
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

function getBalancedOperandWrapperIndexes(
	value: string,
): BalancedOperandWrapperIndexes {
	const openings = new Set<number>();
	const closings = new Set<number>();
	const stack: WrapperFrame[] = [];
	let wordCount = 0;

	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index);

		if (character === undefined) {
			break;
		}

		if (WORD_CHARACTER_RE.test(character)) {
			wordCount += 1;
		}

		if (RIGHT_OPERAND_WRAPPER_RE.test(character)) {
			stack.push({
				opening: character as keyof typeof MATCHING_CLOSING_WRAPPER,
				openingIndex: index,
				wordCountAtOpen: wordCount,
			});
		} else if (LEFT_OPERAND_WRAPPER_RE.test(character)) {
			const frame = stack.at(-1);

			if (
				frame !== undefined &&
				MATCHING_CLOSING_WRAPPER[frame.opening] === character
			) {
				stack.pop();

				if (wordCount > frame.wordCountAtOpen) {
					openings.add(frame.openingIndex);
					closings.add(index);
				}
			} else {
				stack.length = 0;
			}
		}

		index += character.length;
	}

	return { openings, closings };
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

function applyIncrementContexts(input: string): string {
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

function formatCurrencyAmount(amount: string, sign = ''): string {
	const [whole, fraction] = amount.split('.');
	const spokenAmount = fraction ? `${whole}-point-${fraction}` : whole;
	const spokenSign =
		sign === '+' ? 'positive-' : sign === '-' ? 'negative-' : '';
	const isOneDollar = isNumericOne(amount);

	return `${spokenSign}${spokenAmount}-${isOneDollar ? 'dollar' : 'dollars'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
}

function applyCurrencyContexts(input: string): string {
	const rawPostfixContext: RawPostfixOperandContext = {
		balancedWrappers: getBalancedOperandWrapperIndexes(input),
		numericPostfixOperandIndexes: getNumericPostfixOperandIndexes(input),
		postfixStarOperandIndexes: getPostfixStarOperandIndexes(input),
	};

	return input
		.replace(
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
								rawPostfixContext,
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
					next !== undefined && WORD_CHARACTER_RE.test(next)
						? ' '
						: '';

				return `${prefix}${operatorPadding}${formatCurrencyAmount(amount, sign)}${trailingSeparator}`;
			},
		)
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
								rawPostfixContext,
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

function hasValidPrecedingStarOperator(
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

function hasNumericPostfixOperandBefore(
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

function getPostfixStarOperandKindBefore(
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

function removeSingleStarEmphasisDelimiters(input: string): string {
	const value = input
		.replaceAll(EMPHASIS_NUMERIC_BOUNDARY, EMPHASIS_NUMERIC_BOUNDARY_ESCAPE)
		.replaceAll(
			SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
			EMPHASIS_NUMERIC_BOUNDARY_ESCAPE,
		)
		.replaceAll(
			EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY,
			EMPHASIS_NUMERIC_BOUNDARY_ESCAPE,
		)
		.replaceAll(
			EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY,
			EMPHASIS_NUMERIC_BOUNDARY_ESCAPE,
		)
		.replaceAll(
			EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY,
			EMPHASIS_NUMERIC_BOUNDARY_ESCAPE,
		);
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

function getDateLikeNumericTokenStarts(value: string): ReadonlySet<number> {
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

function hasProtectedNumericPrefix(
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

function hasNumericOnlyWrappingBefore(
	value: string,
	numericStart: number,
	closingWrappers: string,
): boolean {
	if (!closingWrappers) {
		return true;
	}

	let cursor = numericStart;
	let character = getCodePointBefore(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	if (character === '+' || character === '-') {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);

		while (
			character !== undefined &&
			CONTEXT_PADDING_RE.test(character)
		) {
			cursor -= character.length;
			character = getCodePointBefore(value, cursor);
		}
	}

	for (const closingWrapper of closingWrappers) {
		if (
			character !==
			MATCHING_OPENING_WRAPPER[
				closingWrapper as keyof typeof MATCHING_OPENING_WRAPPER
			]
		) {
			return false;
		}

		cursor -= character.length;
		character = getCodePointBefore(value, cursor);

		while (
			character !== undefined &&
			CONTEXT_PADDING_RE.test(character)
		) {
			cursor -= character.length;
			character = getCodePointBefore(value, cursor);
		}
	}

	return true;
}

function getNumericPostfixOperandIndexes(value: string): ReadonlySet<number> {
	const indexes = new Set<number>();
	const dateLikeNumericTokenStarts = getDateLikeNumericTokenStarts(value);

	for (const match of value.matchAll(NUMERIC_FACTORIAL_RE)) {
		if (match.index === undefined) {
			continue;
		}

		const closingWrappers = match[2];
		const hasValidClosingWrappers =
			hasNumericOnlyWrappingBefore(
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

function hasAttachedSignedNumericOperand(
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

function getRawSignedNumericOperandSign(
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

function getSemanticSignedNumericOperandSign(
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

function hasExternalMinusBeforeUnsignedEmphasizedFactorial(
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

function hasCurrencyLikeNumericOperand(value: string, index: number): boolean {
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

function isNumericOne(value: string): boolean {
	const [whole, fraction] = value.split('.');

	return (
		NUMERIC_COLLATOR.compare(whole, '1') === 0 &&
		(fraction === undefined ||
			NUMERIC_COLLATOR.compare(fraction, '0') === 0)
	);
}

function shouldDeferPostfixStar(value: string, starIndex: number): boolean {
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
		(DECIMAL_DIGIT_RE.test(next) || RIGHT_OPERAND_WRAPPER_RE.test(next))
	);
}

function getPostfixStarOperandIndexes(value: string): ReadonlySet<number> {
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

function applyPostfixStarContexts(input: string): string {
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

function applyNumericFactorialContexts(input: string): string {
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

function applyPercentageContexts(input: string): string {
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

function applyStructuredSymbolContexts(input: string): string {
	const emphasisAwareInput = removeSingleStarEmphasisDelimiters(input);
	const structureAwareInput = applyIncrementContexts(
		silenceHtmlLikeTags(
			emphasisAwareInput.replace(URL_LIKE_RE, silenceSymbols),
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
	const currencyAwareInput = applyCurrencyContexts(groupedInput);
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

function getNumericSlashIndexes(value: string): ReadonlySet<number> {
	const indexes = new Set<number>();

	for (const match of value.matchAll(DATE_LIKE_RE)) {
		if (match.index === undefined) {
			continue;
		}

		for (let offset = 0; offset < match[0].length; offset += 1) {
			if (match[0][offset] === '/') {
				indexes.add(match.index + offset);
			}
		}
	}

	return indexes;
}

function getPercentReplacement(
	value: string,
	index: number,
): string | undefined {
	const context = getBinaryContext(value, index, index + 1);

	if (
		context !== undefined &&
		context.leftIsNumeric &&
		context.rightIsNumeric
	) {
		return 'modulo';
	}

	const left = getOperandCodePointBefore(value, index);
	const leftIsNumeric =
		left === SEMANTIC_NUMERIC_OPERAND_BOUNDARY ||
		(left !== undefined && DECIMAL_DIGIT_RE.test(left));

	if (
		leftIsNumeric &&
		getSemanticSignedNumericOperandSign(value, index + 1) !== undefined
	) {
		return 'modulo';
	}

	return undefined;
}

function getCaretReplacement(
	value: string,
	index: number,
): string | undefined {
	const context = getBinaryContext(value, index, index + 1);

	if (context === undefined) {
		return undefined;
	}

	const looksLikeExponentiation =
		context.rightIsNumeric &&
		(context.leftIsNumeric || !context.padded);

	return looksLikeExponentiation ? 'to-the-power-of' : 'xor';
}

function applyContextualSymbolMappings(input: string): string {
	const structured = applyStructuredSymbolContexts(input);
	const numericSlashIndexes = getNumericSlashIndexes(structured);
	const output: string[] = [];

	for (let index = 0; index < structured.length;) {
		const character = getCodePointAt(structured, index);

		if (character === undefined) {
			break;
		}

		if (character === SEMANTIC_NUMERIC_OPERAND_BOUNDARY) {
			index += character.length;
			continue;
		}

		if (character === '%') {
			const replacement = getPercentReplacement(structured, index);

			if (replacement !== undefined) {
				output.push(` ${replacement} `);
				index += 1;
				continue;
			}
		}

		if (character === '^') {
			const replacement = getCaretReplacement(structured, index);

			if (replacement !== undefined) {
				output.push(` ${replacement} `);
				index += 1;
				continue;
			}
		}

		let matchedOperator = false;

		for (const mapping of contextualOperatorMappingsByInitial.get(
			character,
		) ?? []) {
			if (!structured.startsWith(mapping.source, index)) {
				continue;
			}

			if (mapping.source === '/' && numericSlashIndexes.has(index)) {
				continue;
			}

			const end = index + mapping.source.length;
			const context = getBinaryContext(structured, index, end);

			if (
				context === undefined ||
				!supportsOperandMode(context, mapping.operandMode ?? 'any')
			) {
				continue;
			}

			output.push(` ${mapping.replacement} `);
			index = end;
			matchedOperator = true;
			break;
		}

		if (matchedOperator) {
			continue;
		}

		output.push(character);
		index += character.length;
	}

	return output.join('');
}

/**
 * Converts text to a lowercase, hyphen-separated slug.
 */
export function slugify(input: string): string {
	return applyContextualSymbolMappings(applyExceptionMappings(input))
		.replace(/['’‘"“”`]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
