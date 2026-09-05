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
const BINARY_OPERATOR_START_RE = /^[-+*/%^<>=&|@?:.]$/u;
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

type OperatorOperandMode =
	'any' | 'numeric' | 'identifier-right' | 'numeric-or-padded' | 'padded';

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
	...['98', '03', '11', '14', '17', '20', '23', '26'].map((edition) => ({
		source: `C++${edition}`,
		replacement: `cpp-${edition}`,
		mode: 'term' as const,
	})),
	{ source: '.NET', replacement: 'dot-net', mode: 'term' },
	{ source: 'F#', replacement: 'f-sharp', mode: 'term' },
	{ source: 'Notepad++', replacement: 'notepad-plus-plus', mode: 'term' },
	{ source: 'g++', replacement: 'g-plus-plus', mode: 'term' },
	{ source: 'clang++', replacement: 'clang-plus-plus', mode: 'term' },
	{ source: 'libstdc++', replacement: 'libstdc-plus-plus', mode: 'term' },
	{ source: 'libc++', replacement: 'libc-plus-plus', mode: 'term' },
	{ source: 'GTK+', replacement: 'gtk-plus', mode: 'term' },
	{ source: 'LGBT+', replacement: 'lgbt-plus', mode: 'term' },
	{ source: 'LGBTQ+', replacement: 'lgbtq-plus', mode: 'term' },
	{ source: 'LGBTQIA+', replacement: 'lgbtqia-plus', mode: 'term' },
	{ source: 'Disney+', replacement: 'disney-plus', mode: 'term' },
	{ source: 'Paramount+', replacement: 'paramount-plus', mode: 'term' },
	{ source: 'Apple TV+', replacement: 'apple-tv-plus', mode: 'term' },
	{ source: 'D* Lite', replacement: 'd-star-lite', mode: 'term' },
	{ source: 'D* algorithm', replacement: 'd-star-algorithm', mode: 'term' },
	{ source: 'IDA*', replacement: 'ida-star', mode: 'term' },
	{ source: 'LPA*', replacement: 'lpa-star', mode: 'term' },
	{ source: 'RRT*', replacement: 'rrt-star', mode: 'term' },
	...['C', 'W', 'B'].flatMap((letter) =>
		['algebra', 'algebras'].flatMap((noun) =>
			['-', ' '].map((separator) => ({
				source: `${letter}*${separator}${noun}`,
				replacement: `${letter.toLowerCase()}-star-${noun}`,
				mode: 'term' as const,
			})),
		),
	),
	...['+', '*'].flatMap((symbol) =>
		['tree', 'trees'].flatMap((noun) =>
			['-', ' '].map((separator) => ({
				source: `B${symbol}${separator}${noun}`,
				replacement: `b-${symbol === '+' ? 'plus' : 'star'}-${noun}`,
				mode: 'term' as const,
			})),
		),
	),
] as const satisfies readonly ExceptionMapping[];

const contextualOperatorMappings = [
	{ source: '>>>=', replacement: 'unsigned-right-shift-equals' },
	{ source: '>>>', replacement: 'unsigned-right-shift' },
	{ source: '<<=', replacement: 'left-shift-equals' },
	{ source: '>>=', replacement: 'right-shift-equals' },
	{ source: '<<', replacement: 'left-shift' },
	{ source: '>>', replacement: 'right-shift' },
	{ source: '&&=', replacement: 'and-equals' },
	{ source: '||=', replacement: 'or-equals' },
	{ source: '??=', replacement: 'nullish-coalescing-equals' },
	{ source: '??', replacement: 'nullish-coalescing' },
	{
		source: '?.',
		replacement: 'optional-chain',
		operandMode: 'identifier-right',
	},
	{ source: '::', replacement: 'scope', operandMode: 'identifier-right' },
	{ source: ':=', replacement: 'assigned-to' },
	{ source: '<=>', replacement: 'three-way-compare' },
	{ source: '<->', replacement: 'bidirectional-arrow' },
	{ source: '->', replacement: 'arrow' },
	{ source: '<-', replacement: 'left-arrow' },
	{ source: '=>', replacement: 'arrow' },
	{ source: '=~', replacement: 'matches' },
	{ source: '!~', replacement: 'does-not-match' },
	{ source: '//=', replacement: 'floor-divided-by-equals' },
	{
		source: '//',
		replacement: 'floor-divided-by',
		operandMode: 'numeric-or-padded',
	},
	{ source: '..=', replacement: 'inclusive-range', operandMode: 'numeric' },
	{ source: '..<', replacement: 'exclusive-range', operandMode: 'numeric' },
	{ source: '...', replacement: 'ellipsis', operandMode: 'numeric' },
	{ source: '..', replacement: 'range', operandMode: 'numeric' },
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
	{ source: '×', replacement: 'times' },
	{ source: '÷', replacement: 'divided-by' },
	{ source: '−', replacement: 'minus' },
	{ source: '≤', replacement: 'less-than-or-equal-to' },
	{ source: '≥', replacement: 'greater-than-or-equal-to' },
	{ source: '±', replacement: 'plus-or-minus' },
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

// Unicode mathematical, arrow, and APL names, with conventional readings.
// Unicode 16 data plus the Unicode 17 reaction arrows below.
// https://www.unicode.org/charts/nameslist/n_2200.html
// https://www.unicode.org/charts/nameslist/n_2A00.html
// https://www.unicode.org/charts/nameslist/n_1F800.html
const unicodeMathNames: Readonly<Record<string, string>> = {
	'🣐': 'long-rightwards-arrow-over-long-leftwards-arrow',
	'🣑': 'long-rightwards-harpoon-over-long-leftwards-harpoon',
	'🣒': 'long-rightwards-harpoon-above-short-leftwards-harpoon',
	'🣓': 'short-rightwards-harpoon-above-long-leftwards-harpoon',
	'🣔': 'long-leftwards-harpoon-above-short-rightwards-harpoon',
	'🣕': 'short-leftwards-harpoon-above-long-rightwards-harpoon',
	'🣖': 'long-rightwards-arrow-through-x',
	'🣗': 'long-rightwards-arrow-with-double-slash',
	'🣘': 'long-left-right-arrow-with-dependent-lobe',
	'¬': 'not',
	ℵ: 'aleph',
	ℶ: 'beth',
	ℷ: 'gimel',
	ℸ: 'daleth',
	'←': 'left-arrow',
	'↑': 'upwards-arrow',
	'→': 'to',
	'↓': 'downwards-arrow',
	'↔': 'left-right-arrow',
	'↕': 'up-down-arrow',
	'↖': 'north-west-arrow',
	'↗': 'north-east-arrow',
	'↘': 'south-east-arrow',
	'↙': 'south-west-arrow',
	'↚': 'leftwards-arrow-with-stroke',
	'↛': 'does-not-map-to',
	'↜': 'leftwards-wave-arrow',
	'↝': 'rightwards-wave-arrow',
	'↞': 'leftwards-two-headed-arrow',
	'↟': 'upwards-two-headed-arrow',
	'↠': 'rightwards-two-headed-arrow',
	'↡': 'downwards-two-headed-arrow',
	'↢': 'leftwards-arrow-with-tail',
	'↣': 'right-arrow-with-tail',
	'↤': 'leftwards-arrow-from-bar',
	'↥': 'upwards-arrow-from-bar',
	'↦': 'maps-to',
	'↧': 'downwards-arrow-from-bar',
	'↨': 'up-down-arrow-with-base',
	'↩': 'leftwards-arrow-with-hook',
	'↪': 'right-arrow-with-hook',
	'↫': 'leftwards-arrow-with-loop',
	'↬': 'rightwards-arrow-with-loop',
	'↭': 'left-right-wave-arrow',
	'↮': 'left-right-arrow-with-stroke',
	'↯': 'downwards-zigzag-arrow',
	'↰': 'upwards-arrow-with-tip-leftwards',
	'↱': 'upwards-arrow-with-tip-rightwards',
	'↲': 'downwards-arrow-with-tip-leftwards',
	'↳': 'downwards-arrow-with-tip-rightwards',
	'↴': 'rightwards-arrow-with-corner-downwards',
	'↵': 'downwards-arrow-with-corner-leftwards',
	'↶': 'anticlockwise-top-semicircle-arrow',
	'↷': 'clockwise-top-semicircle-arrow',
	'↸': 'north-west-arrow-to-long-bar',
	'↹': 'leftwards-arrow-to-bar-over-rightwards-arrow-to-bar',
	'↺': 'anticlockwise-open-circle-arrow',
	'↻': 'clockwise-open-circle-arrow',
	'↼': 'leftwards-harpoon-with-barb-upwards',
	'↽': 'leftwards-harpoon-with-barb-downwards',
	'↾': 'upwards-harpoon-with-barb-rightwards',
	'↿': 'upwards-harpoon-with-barb-leftwards',
	'⇀': 'rightwards-harpoon-with-barb-upwards',
	'⇁': 'rightwards-harpoon-with-barb-downwards',
	'⇂': 'downwards-harpoon-with-barb-rightwards',
	'⇃': 'downwards-harpoon-with-barb-leftwards',
	'⇄': 'rightwards-arrow-over-leftwards-arrow',
	'⇅': 'upwards-arrow-leftwards-of-downwards-arrow',
	'⇆': 'leftwards-arrow-over-rightwards-arrow',
	'⇇': 'leftwards-paired-arrows',
	'⇈': 'upwards-paired-arrows',
	'⇉': 'rightwards-paired-arrows',
	'⇊': 'downwards-paired-arrows',
	'⇋': 'leftwards-harpoon-over-rightwards-harpoon',
	'⇌': 'rightwards-harpoon-over-leftwards-harpoon',
	'⇍': 'is-not-implied-by',
	'⇎': 'not-if-and-only-if',
	'⇏': 'does-not-imply',
	'⇐': 'is-implied-by',
	'⇑': 'upwards-double-arrow',
	'⇒': 'implies',
	'⇓': 'downwards-double-arrow',
	'⇔': 'if-and-only-if',
	'⇕': 'up-down-double-arrow',
	'⇖': 'north-west-double-arrow',
	'⇗': 'north-east-double-arrow',
	'⇘': 'south-east-double-arrow',
	'⇙': 'south-west-double-arrow',
	'⇚': 'leftwards-triple-arrow',
	'⇛': 'rightwards-triple-arrow',
	'⇜': 'leftwards-squiggle-arrow',
	'⇝': 'rightwards-squiggle-arrow',
	'⇞': 'upwards-arrow-with-double-stroke',
	'⇟': 'downwards-arrow-with-double-stroke',
	'⇠': 'leftwards-dashed-arrow',
	'⇡': 'upwards-dashed-arrow',
	'⇢': 'rightwards-dashed-arrow',
	'⇣': 'downwards-dashed-arrow',
	'⇤': 'leftwards-arrow-to-bar',
	'⇥': 'rightwards-arrow-to-bar',
	'⇦': 'leftwards-white-arrow',
	'⇧': 'upwards-white-arrow',
	'⇨': 'rightwards-white-arrow',
	'⇩': 'downwards-white-arrow',
	'⇪': 'upwards-white-arrow-from-bar',
	'⇫': 'upwards-white-arrow-on-pedestal',
	'⇬': 'upwards-white-arrow-on-pedestal-with-horizontal-bar',
	'⇭': 'upwards-white-arrow-on-pedestal-with-vertical-bar',
	'⇮': 'upwards-white-double-arrow',
	'⇯': 'upwards-white-double-arrow-on-pedestal',
	'⇰': 'rightwards-white-arrow-from-wall',
	'⇱': 'north-west-arrow-to-corner',
	'⇲': 'south-east-arrow-to-corner',
	'⇳': 'up-down-white-arrow',
	'⇴': 'right-arrow-with-small-circle',
	'⇵': 'downwards-arrow-leftwards-of-upwards-arrow',
	'⇶': 'three-rightwards-arrows',
	'⇷': 'leftwards-arrow-with-vertical-stroke',
	'⇸': 'rightwards-arrow-with-vertical-stroke',
	'⇹': 'left-right-arrow-with-vertical-stroke',
	'⇺': 'leftwards-arrow-with-double-vertical-stroke',
	'⇻': 'rightwards-arrow-with-double-vertical-stroke',
	'⇼': 'left-right-arrow-with-double-vertical-stroke',
	'⇽': 'leftwards-open-headed-arrow',
	'⇾': 'rightwards-open-headed-arrow',
	'⇿': 'left-right-open-headed-arrow',
	'∀': 'for-all',
	'∁': 'complement',
	'∂': 'partial-derivative',
	'∃': 'there-exists',
	'∄': 'there-does-not-exist',
	'∅': 'empty-set',
	'∆': 'delta',
	'∇': 'nabla',
	'∈': 'element-of',
	'∉': 'not-an-element-of',
	'∊': 'small-element-of',
	'∋': 'contains-as-member',
	'∌': 'does-not-contain-as-member',
	'∍': 'small-contains-as-member',
	'∎': 'end-of-proof',
	'∏': 'product',
	'∐': 'coproduct',
	'∑': 'sum',
	'∓': 'minus-or-plus',
	'∔': 'dot-plus',
	'∕': 'divided-by',
	'∖': 'set-minus',
	'∗': 'asterisk-operator',
	'∘': 'composition',
	'∙': 'dot',
	'√': 'square-root',
	'∛': 'cube-root',
	'∜': 'fourth-root',
	'∝': 'proportional-to',
	'∞': 'infinity',
	'∟': 'right-angle',
	'∠': 'angle',
	'∡': 'measured-angle',
	'∢': 'spherical-angle',
	'∣': 'divides',
	'∤': 'does-not-divide',
	'∥': 'parallel-to',
	'∦': 'not-parallel-to',
	'∧': 'and',
	'∨': 'or',
	'∩': 'intersection',
	'∪': 'union',
	'∫': 'integral',
	'∬': 'double-integral',
	'∭': 'triple-integral',
	'∮': 'contour-integral',
	'∯': 'surface-integral',
	'∰': 'volume-integral',
	'∱': 'clockwise-integral',
	'∲': 'clockwise-contour-integral',
	'∳': 'anticlockwise-contour-integral',
	'∴': 'therefore',
	'∵': 'because',
	'∶': 'ratio',
	'∷': 'proportion',
	'∸': 'dot-minus',
	'∹': 'excess',
	'∺': 'geometric-proportion',
	'∻': 'homothetic',
	'∼': 'similar-to',
	'∽': 'reversed-tilde',
	'∾': 'inverted-lazy-s',
	'∿': 'sine-wave',
	'≀': 'wreath-product',
	'≁': 'not-similar-to',
	'≂': 'minus-tilde',
	'≃': 'asymptotically-equals',
	'≄': 'not-asymptotically-equals',
	'≅': 'congruent-to',
	'≆': 'approximately-but-not-actually-equal-to',
	'≇': 'not-congruent-to',
	'≈': 'approximately-equals',
	'≉': 'not-approximately-equals',
	'≊': 'almost-equal-or-equal-to',
	'≋': 'triple-tilde',
	'≌': 'all-equal-to',
	'≍': 'equivalent-to',
	'≎': 'geometrically-equivalent-to',
	'≏': 'difference-between',
	'≐': 'approaches-the-limit',
	'≑': 'geometrically-equal-to',
	'≒': 'approximately-equal-to-or-the-image-of',
	'≓': 'image-of-or-approximately-equal-to',
	'≔': 'defined-as',
	'≕': 'defines',
	'≖': 'ring-in-equal-to',
	'≗': 'ring-equal-to',
	'≘': 'corresponds-to',
	'≙': 'estimates',
	'≚': 'equiangular-to',
	'≛': 'star-equals',
	'≜': 'defined-as',
	'≝': 'defined-as',
	'≞': 'measured-by',
	'≟': 'questioned-equal-to',
	'≡': 'identical-to',
	'≢': 'not-identical-to',
	'≣': 'strictly-equivalent-to',
	'≦': 'less-than-over-equal-to',
	'≧': 'greater-than-over-equal-to',
	'≨': 'less-than-but-not-equal-to',
	'≩': 'greater-than-but-not-equal-to',
	'≪': 'much-less-than',
	'≫': 'much-greater-than',
	'≬': 'between',
	'≭': 'not-equivalent-to',
	'≲': 'less-than-or-equivalent-to',
	'≳': 'greater-than-or-equivalent-to',
	'≴': 'neither-less-than-nor-equivalent-to',
	'≵': 'neither-greater-than-nor-equivalent-to',
	'≶': 'less-than-or-greater-than',
	'≷': 'greater-than-or-less-than',
	'≸': 'neither-less-than-nor-greater-than',
	'≹': 'neither-greater-than-nor-less-than',
	'≺': 'precedes',
	'≻': 'succeeds',
	'≼': 'precedes-or-equal-to',
	'≽': 'succeeds-or-equal-to',
	'≾': 'precedes-or-equivalent-to',
	'≿': 'succeeds-or-equivalent-to',
	'⊀': 'does-not-precede',
	'⊁': 'does-not-succeed',
	'⊂': 'subset-of',
	'⊃': 'superset-of',
	'⊄': 'not-a-subset-of',
	'⊅': 'not-a-superset-of',
	'⊆': 'subset-of-or-equal-to',
	'⊇': 'superset-of-or-equal-to',
	'⊈': 'neither-a-subset-of-nor-equal-to',
	'⊉': 'neither-a-superset-of-nor-equal-to',
	'⊊': 'subset-of-with-not-equal-to',
	'⊋': 'superset-of-with-not-equal-to',
	'⊌': 'multiset',
	'⊍': 'multiset-multiplication',
	'⊎': 'multiset-union',
	'⊏': 'square-image-of',
	'⊐': 'square-original-of',
	'⊑': 'square-image-of-or-equal-to',
	'⊒': 'square-original-of-or-equal-to',
	'⊓': 'square-cap',
	'⊔': 'square-cup',
	'⊕': 'direct-sum',
	'⊖': 'circled-minus',
	'⊗': 'tensor-product',
	'⊘': 'circled-division-slash',
	'⊙': 'circled-dot',
	'⊚': 'circled-ring-operator',
	'⊛': 'circled-asterisk-operator',
	'⊜': 'circled-equals',
	'⊝': 'circled-dash',
	'⊞': 'squared-plus',
	'⊟': 'squared-minus',
	'⊠': 'squared-times',
	'⊡': 'squared-dot-operator',
	'⊢': 'proves',
	'⊣': 'is-proved-by',
	'⊤': 'top',
	'⊥': 'bottom',
	'⊦': 'assertion',
	'⊧': 'models',
	'⊨': 'models',
	'⊩': 'forces',
	'⊪': 'triple-vertical-bar-right-turnstile',
	'⊫': 'double-vertical-bar-double-right-turnstile',
	'⊬': 'does-not-prove',
	'⊭': 'does-not-model',
	'⊮': 'does-not-force',
	'⊯': 'negated-double-vertical-bar-double-right-turnstile',
	'⊰': 'precedes-under-relation',
	'⊱': 'succeeds-under-relation',
	'⊲': 'normal-subgroup-of',
	'⊳': 'contains-as-normal-subgroup',
	'⊴': 'normal-subgroup-of-or-equal-to',
	'⊵': 'contains-as-normal-subgroup-or-equal-to',
	'⊶': 'original-of',
	'⊷': 'image-of',
	'⊸': 'multimap',
	'⊹': 'hermitian-conjugate-matrix',
	'⊺': 'intercalate',
	'⊻': 'xor',
	'⊼': 'nand',
	'⊽': 'nor',
	'⊾': 'right-angle-with-arc',
	'⊿': 'right-triangle',
	'⋀': 'n-ary-and',
	'⋁': 'n-ary-or',
	'⋂': 'n-ary-intersection',
	'⋃': 'n-ary-union',
	'⋄': 'diamond-operator',
	'⋅': 'dot',
	'⋆': 'star-operator',
	'⋇': 'division-times',
	'⋈': 'bowtie',
	'⋉': 'left-normal-factor-semidirect-product',
	'⋊': 'right-normal-factor-semidirect-product',
	'⋋': 'left-semidirect-product',
	'⋌': 'right-semidirect-product',
	'⋍': 'reversed-tilde-equals',
	'⋎': 'curly-logical-or',
	'⋏': 'curly-logical-and',
	'⋐': 'double-subset',
	'⋑': 'double-superset',
	'⋒': 'double-intersection',
	'⋓': 'double-union',
	'⋔': 'pitchfork',
	'⋕': 'equal-and-parallel-to',
	'⋖': 'less-than-with-dot',
	'⋗': 'greater-than-with-dot',
	'⋘': 'very-much-less-than',
	'⋙': 'very-much-greater-than',
	'⋚': 'less-than-equal-to-or-greater-than',
	'⋛': 'greater-than-equal-to-or-less-than',
	'⋜': 'equal-to-or-less-than',
	'⋝': 'equal-to-or-greater-than',
	'⋞': 'equal-to-or-precedes',
	'⋟': 'equal-to-or-succeeds',
	'⋠': 'does-not-precede-or-equal',
	'⋡': 'does-not-succeed-or-equal',
	'⋢': 'not-square-image-of-or-equal-to',
	'⋣': 'not-square-original-of-or-equal-to',
	'⋤': 'square-image-of-or-not-equal-to',
	'⋥': 'square-original-of-or-not-equal-to',
	'⋦': 'less-than-but-not-equivalent-to',
	'⋧': 'greater-than-but-not-equivalent-to',
	'⋨': 'precedes-but-not-equivalent-to',
	'⋩': 'succeeds-but-not-equivalent-to',
	'⋪': 'not-normal-subgroup-of',
	'⋫': 'does-not-contain-as-normal-subgroup',
	'⋬': 'not-normal-subgroup-of-or-equal-to',
	'⋭': 'does-not-contain-as-normal-subgroup-or-equal',
	'⋮': 'vertical-ellipsis',
	'⋯': 'midline-horizontal-ellipsis',
	'⋰': 'up-right-diagonal-ellipsis',
	'⋱': 'down-right-diagonal-ellipsis',
	'⋲': 'element-of-with-long-horizontal-stroke',
	'⋳': 'element-of-with-vertical-bar-at-end-of-horizontal-stroke',
	'⋴': 'small-element-of-with-vertical-bar-at-end-of-horizontal-stroke',
	'⋵': 'element-of-with-dot-above',
	'⋶': 'element-of-with-overbar',
	'⋷': 'small-element-of-with-overbar',
	'⋸': 'element-of-with-underbar',
	'⋹': 'element-of-with-two-horizontal-strokes',
	'⋺': 'contains-with-long-horizontal-stroke',
	'⋻': 'contains-with-vertical-bar-at-end-of-horizontal-stroke',
	'⋼': 'small-contains-with-vertical-bar-at-end-of-horizontal-stroke',
	'⋽': 'contains-with-overbar',
	'⋾': 'small-contains-with-overbar',
	'⋿': 'z-notation-bag-membership',
	'⟀': 'three-dimensional-angle',
	'⟁': 'white-triangle-containing-small-white-triangle',
	'⟂': 'perpendicular',
	'⟃': 'open-subset',
	'⟄': 'open-superset',
	'⟇': 'or-with-dot-inside',
	'⟈': 'reverse-solidus-preceding-subset',
	'⟉': 'superset-preceding-solidus',
	'⟊': 'vertical-bar-with-horizontal-stroke',
	'⟋': 'mathematical-rising-diagonal',
	'⟌': 'long-division',
	'⟍': 'mathematical-falling-diagonal',
	'⟎': 'squared-logical-and',
	'⟏': 'squared-logical-or',
	'⟐': 'white-diamond-with-centred-dot',
	'⟑': 'and-with-dot',
	'⟒': 'element-of-opening-upwards',
	'⟓': 'lower-right-corner-with-dot',
	'⟔': 'upper-left-corner-with-dot',
	'⟕': 'left-outer-join',
	'⟖': 'right-outer-join',
	'⟗': 'full-outer-join',
	'⟘': 'large-up-tack',
	'⟙': 'large-down-tack',
	'⟚': 'left-and-right-double-turnstile',
	'⟛': 'left-and-right-tack',
	'⟜': 'left-multimap',
	'⟝': 'long-right-tack',
	'⟞': 'long-left-tack',
	'⟟': 'up-tack-with-circle-above',
	'⟠': 'lozenge-divided-by-horizontal-rule',
	'⟡': 'white-concave-sided-diamond',
	'⟢': 'white-concave-sided-diamond-with-leftwards-tick',
	'⟣': 'white-concave-sided-diamond-with-rightwards-tick',
	'⟤': 'white-square-with-leftwards-tick',
	'⟥': 'white-square-with-rightwards-tick',
	'⟵': 'left-arrow',
	'⟶': 'to',
	'⟷': 'left-right-arrow',
	'⟸': 'is-implied-by',
	'⟹': 'implies',
	'⟺': 'if-and-only-if',
	'⟼': 'maps-to',
	'⦀': 'triple-vertical-bar-delimiter',
	'⦁': 'z-notation-spot',
	'⦂': 'z-notation-type-colon',
	'⦙': 'dotted-fence',
	'⦚': 'vertical-zigzag-line',
	'⦛': 'measured-angle-opening-left',
	'⦜': 'right-angle-variant-with-square',
	'⦝': 'measured-right-angle-with-dot',
	'⦞': 'angle-with-s-inside',
	'⦟': 'acute-angle',
	'⦠': 'spherical-angle-opening-left',
	'⦡': 'spherical-angle-opening-up',
	'⦢': 'turned-angle',
	'⦣': 'reversed-angle',
	'⦤': 'angle-with-underbar',
	'⦥': 'reversed-angle-with-underbar',
	'⦦': 'oblique-angle-opening-up',
	'⦧': 'oblique-angle-opening-down',
	'⦨': 'measured-angle-with-open-arm-ending-in-arrow-pointing-up-and-right',
	'⦩': 'measured-angle-with-open-arm-ending-in-arrow-pointing-up-and-left',
	'⦪': 'measured-angle-with-open-arm-ending-in-arrow-pointing-down-and-right',
	'⦫': 'measured-angle-with-open-arm-ending-in-arrow-pointing-down-and-left',
	'⦬': 'measured-angle-with-open-arm-ending-in-arrow-pointing-right-and-up',
	'⦭': 'measured-angle-with-open-arm-ending-in-arrow-pointing-left-and-up',
	'⦮': 'measured-angle-with-open-arm-ending-in-arrow-pointing-right-and-down',
	'⦯': 'measured-angle-with-open-arm-ending-in-arrow-pointing-left-and-down',
	'⦰': 'reversed-empty-set',
	'⦱': 'empty-set-with-overbar',
	'⦲': 'empty-set-with-small-circle-above',
	'⦳': 'empty-set-with-right-arrow-above',
	'⦴': 'empty-set-with-left-arrow-above',
	'⦵': 'circle-with-horizontal-bar',
	'⦶': 'circled-vertical-bar',
	'⦷': 'circled-parallel',
	'⦸': 'circled-reverse-solidus',
	'⦹': 'circled-perpendicular',
	'⦺': 'circle-divided-by-horizontal-bar-and-top-half-divided-by-vertical-bar',
	'⦻': 'circle-with-superimposed-x',
	'⦼': 'circled-anticlockwise-rotated-division-sign',
	'⦽': 'up-arrow-through-circle',
	'⦾': 'circled-white-bullet',
	'⦿': 'circled-bullet',
	'⧀': 'circled-less-than',
	'⧁': 'circled-greater-than',
	'⧂': 'circle-with-small-circle-to-the-right',
	'⧃': 'circle-with-two-horizontal-strokes-to-the-right',
	'⧄': 'squared-rising-diagonal-slash',
	'⧅': 'squared-falling-diagonal-slash',
	'⧆': 'squared-asterisk',
	'⧇': 'squared-small-circle',
	'⧈': 'squared-square',
	'⧉': 'two-joined-squares',
	'⧊': 'triangle-with-dot-above',
	'⧋': 'triangle-with-underbar',
	'⧌': 's-in-triangle',
	'⧍': 'triangle-with-serifs-at-bottom',
	'⧎': 'right-triangle-above-left-triangle',
	'⧏': 'left-triangle-beside-vertical-bar',
	'⧐': 'vertical-bar-beside-right-triangle',
	'⧑': 'bowtie-with-left-half-black',
	'⧒': 'bowtie-with-right-half-black',
	'⧓': 'black-bowtie',
	'⧔': 'times-with-left-half-black',
	'⧕': 'times-with-right-half-black',
	'⧖': 'white-hourglass',
	'⧗': 'black-hourglass',
	'⧜': 'incomplete-infinity',
	'⧝': 'tie-over-infinity',
	'⧞': 'infinity-negated-with-vertical-bar',
	'⧟': 'double-ended-multimap',
	'⧠': 'square-with-contoured-outline',
	'⧡': 'increases-as',
	'⧢': 'shuffle-product',
	'⧣': 'equals-sign-and-slanted-parallel',
	'⧤': 'equals-sign-and-slanted-parallel-with-tilde-above',
	'⧥': 'identical-to-and-slanted-parallel',
	'⧦': 'gleich-stark',
	'⧧': 'thermodynamic',
	'⧨': 'down-pointing-triangle-with-left-half-black',
	'⧩': 'down-pointing-triangle-with-right-half-black',
	'⧪': 'black-diamond-with-down-arrow',
	'⧫': 'black-lozenge',
	'⧬': 'white-circle-with-down-arrow',
	'⧭': 'black-circle-with-down-arrow',
	'⧮': 'error-barred-white-square',
	'⧯': 'error-barred-black-square',
	'⧰': 'error-barred-white-diamond',
	'⧱': 'error-barred-black-diamond',
	'⧲': 'error-barred-white-circle',
	'⧳': 'error-barred-black-circle',
	'⧴': 'rule-delayed',
	'⧵': 'reverse-solidus-operator',
	'⧶': 'solidus-with-overbar',
	'⧷': 'reverse-solidus-with-horizontal-stroke',
	'⧸': 'big-solidus',
	'⧹': 'big-reverse-solidus',
	'⧺': 'double-plus',
	'⧻': 'triple-plus',
	'⧾': 'tiny',
	'⧿': 'miny',
	'⨀': 'n-ary-circled-dot-operator',
	'⨁': 'n-ary-circled-plus-operator',
	'⨂': 'n-ary-circled-times-operator',
	'⨃': 'n-ary-union-operator-with-dot',
	'⨄': 'n-ary-union-operator-with-plus',
	'⨅': 'n-ary-square-intersection-operator',
	'⨆': 'n-ary-square-union-operator',
	'⨇': 'two-logical-and-operator',
	'⨈': 'two-logical-or-operator',
	'⨉': 'n-ary-times-operator',
	'⨊': 'modulo-two-sum',
	'⨋': 'summation-with-integral',
	'⨌': 'quadruple-integral-operator',
	'⨍': 'finite-part-integral',
	'⨎': 'integral-with-double-stroke',
	'⨏': 'integral-average-with-slash',
	'⨐': 'circulation-function',
	'⨑': 'anticlockwise-integration',
	'⨒': 'line-integration-with-rectangular-path-around-pole',
	'⨓': 'line-integration-with-semicircular-path-around-pole',
	'⨔': 'line-integration-not-including-the-pole',
	'⨕': 'integral-around-a-point-operator',
	'⨖': 'quaternion-integral-operator',
	'⨗': 'integral-with-leftwards-arrow-with-hook',
	'⨘': 'integral-with-times-sign',
	'⨙': 'integral-with-intersection',
	'⨚': 'integral-with-union',
	'⨛': 'integral-with-overbar',
	'⨜': 'integral-with-underbar',
	'⨝': 'join',
	'⨞': 'large-left-triangle-operator',
	'⨟': 'z-notation-schema-composition',
	'⨠': 'z-notation-schema-piping',
	'⨡': 'z-notation-schema-projection',
	'⨢': 'plus-sign-with-small-circle-above',
	'⨣': 'plus-sign-with-circumflex-accent-above',
	'⨤': 'plus-sign-with-tilde-above',
	'⨥': 'plus-sign-with-dot-below',
	'⨦': 'plus-sign-with-tilde-below',
	'⨧': 'plus-sign-with-subscript-two',
	'⨨': 'plus-sign-with-black-triangle',
	'⨩': 'minus-sign-with-comma-above',
	'⨪': 'minus-sign-with-dot-below',
	'⨫': 'minus-sign-with-falling-dots',
	'⨬': 'minus-sign-with-rising-dots',
	'⨭': 'plus-sign-in-left-half-circle',
	'⨮': 'plus-sign-in-right-half-circle',
	'⨯': 'vector-or-cross-product',
	'⨰': 'multiplication-sign-with-dot-above',
	'⨱': 'multiplication-sign-with-underbar',
	'⨲': 'semidirect-product-with-bottom-closed',
	'⨳': 'smash-product',
	'⨴': 'multiplication-sign-in-left-half-circle',
	'⨵': 'multiplication-sign-in-right-half-circle',
	'⨶': 'circled-multiplication-sign-with-circumflex-accent',
	'⨷': 'multiplication-sign-in-double-circle',
	'⨸': 'circled-division-sign',
	'⨹': 'plus-sign-in-triangle',
	'⨺': 'minus-sign-in-triangle',
	'⨻': 'multiplication-sign-in-triangle',
	'⨼': 'interior-product',
	'⨽': 'righthand-interior-product',
	'⨾': 'z-notation-relational-composition',
	'⨿': 'amalgamation-or-coproduct',
	'⩀': 'intersection-with-dot',
	'⩁': 'union-with-minus-sign',
	'⩂': 'union-with-overbar',
	'⩃': 'intersection-with-overbar',
	'⩄': 'intersection-with-logical-and',
	'⩅': 'union-with-logical-or',
	'⩆': 'union-above-intersection',
	'⩇': 'intersection-above-union',
	'⩈': 'union-above-bar-above-intersection',
	'⩉': 'intersection-above-bar-above-union',
	'⩊': 'union-beside-and-joined-with-union',
	'⩋': 'intersection-beside-and-joined-with-intersection',
	'⩌': 'closed-union-with-serifs',
	'⩍': 'closed-intersection-with-serifs',
	'⩎': 'double-square-intersection',
	'⩏': 'double-square-union',
	'⩐': 'closed-union-with-serifs-and-smash-product',
	'⩑': 'logical-and-with-dot-above',
	'⩒': 'logical-or-with-dot-above',
	'⩓': 'double-logical-and',
	'⩔': 'double-logical-or',
	'⩕': 'two-intersecting-logical-and',
	'⩖': 'two-intersecting-logical-or',
	'⩗': 'sloping-large-or',
	'⩘': 'sloping-large-and',
	'⩙': 'logical-or-overlapping-logical-and',
	'⩚': 'logical-and-with-middle-stem',
	'⩛': 'logical-or-with-middle-stem',
	'⩜': 'logical-and-with-horizontal-dash',
	'⩝': 'logical-or-with-horizontal-dash',
	'⩞': 'logical-and-with-double-overbar',
	'⩟': 'logical-and-with-underbar',
	'⩠': 'logical-and-with-double-underbar',
	'⩡': 'small-vee-with-underbar',
	'⩢': 'logical-or-with-double-overbar',
	'⩣': 'logical-or-with-double-underbar',
	'⩤': 'z-notation-domain-antirestriction',
	'⩥': 'z-notation-range-antirestriction',
	'⩦': 'equals-sign-with-dot-below',
	'⩧': 'identical-with-dot-above',
	'⩨': 'triple-horizontal-bar-with-double-vertical-stroke',
	'⩩': 'triple-horizontal-bar-with-triple-vertical-stroke',
	'⩪': 'tilde-operator-with-dot-above',
	'⩫': 'tilde-operator-with-rising-dots',
	'⩬': 'similar-minus-similar',
	'⩭': 'congruent-with-dot-above',
	'⩮': 'equals-with-asterisk',
	'⩯': 'almost-equal-to-with-circumflex-accent',
	'⩰': 'approximately-equal-or-equal-to',
	'⩱': 'equals-sign-above-plus-sign',
	'⩲': 'plus-sign-above-equals-sign',
	'⩳': 'equals-sign-above-tilde-operator',
	'⩴': 'double-colon-equal',
	'⩵': 'two-consecutive-equals-signs',
	'⩶': 'three-consecutive-equals-signs',
	'⩷': 'equals-sign-with-two-dots-above-and-two-dots-below',
	'⩸': 'equivalent-with-four-dots-above',
	'⩹': 'less-than-with-circle-inside',
	'⩺': 'greater-than-with-circle-inside',
	'⩻': 'less-than-with-question-mark-above',
	'⩼': 'greater-than-with-question-mark-above',
	'⩽': 'less-than-or-slanted-equal-to',
	'⩾': 'greater-than-or-slanted-equal-to',
	'⩿': 'less-than-or-slanted-equal-to-with-dot-inside',
	'⪀': 'greater-than-or-slanted-equal-to-with-dot-inside',
	'⪁': 'less-than-or-slanted-equal-to-with-dot-above',
	'⪂': 'greater-than-or-slanted-equal-to-with-dot-above',
	'⪃': 'less-than-or-slanted-equal-to-with-dot-above-right',
	'⪄': 'greater-than-or-slanted-equal-to-with-dot-above-left',
	'⪅': 'less-than-or-approximate',
	'⪆': 'greater-than-or-approximate',
	'⪇': 'less-than-and-single-line-not-equal-to',
	'⪈': 'greater-than-and-single-line-not-equal-to',
	'⪉': 'less-than-and-not-approximate',
	'⪊': 'greater-than-and-not-approximate',
	'⪋': 'less-than-above-double-line-equal-above-greater-than',
	'⪌': 'greater-than-above-double-line-equal-above-less-than',
	'⪍': 'less-than-above-similar-or-equal',
	'⪎': 'greater-than-above-similar-or-equal',
	'⪏': 'less-than-above-similar-above-greater-than',
	'⪐': 'greater-than-above-similar-above-less-than',
	'⪑': 'less-than-above-greater-than-above-double-line-equal',
	'⪒': 'greater-than-above-less-than-above-double-line-equal',
	'⪓': 'less-than-above-slanted-equal-above-greater-than-above-slanted-equal',
	'⪔': 'greater-than-above-slanted-equal-above-less-than-above-slanted-equal',
	'⪕': 'slanted-equal-to-or-less-than',
	'⪖': 'slanted-equal-to-or-greater-than',
	'⪗': 'slanted-equal-to-or-less-than-with-dot-inside',
	'⪘': 'slanted-equal-to-or-greater-than-with-dot-inside',
	'⪙': 'double-line-equal-to-or-less-than',
	'⪚': 'double-line-equal-to-or-greater-than',
	'⪛': 'double-line-slanted-equal-to-or-less-than',
	'⪜': 'double-line-slanted-equal-to-or-greater-than',
	'⪝': 'similar-or-less-than',
	'⪞': 'similar-or-greater-than',
	'⪟': 'similar-above-less-than-above-equals-sign',
	'⪠': 'similar-above-greater-than-above-equals-sign',
	'⪡': 'double-nested-less-than',
	'⪢': 'double-nested-greater-than',
	'⪣': 'double-nested-less-than-with-underbar',
	'⪤': 'greater-than-overlapping-less-than',
	'⪥': 'greater-than-beside-less-than',
	'⪦': 'less-than-closed-by-curve',
	'⪧': 'greater-than-closed-by-curve',
	'⪨': 'less-than-closed-by-curve-above-slanted-equal',
	'⪩': 'greater-than-closed-by-curve-above-slanted-equal',
	'⪪': 'smaller-than',
	'⪫': 'larger-than',
	'⪬': 'smaller-than-or-equal-to',
	'⪭': 'larger-than-or-equal-to',
	'⪮': 'equals-sign-with-bumpy-above',
	'⪯': 'precedes-above-single-line-equals-sign',
	'⪰': 'succeeds-above-single-line-equals-sign',
	'⪱': 'precedes-above-single-line-not-equal-to',
	'⪲': 'succeeds-above-single-line-not-equal-to',
	'⪳': 'precedes-above-equals-sign',
	'⪴': 'succeeds-above-equals-sign',
	'⪵': 'precedes-above-not-equal-to',
	'⪶': 'succeeds-above-not-equal-to',
	'⪷': 'precedes-above-almost-equal-to',
	'⪸': 'succeeds-above-almost-equal-to',
	'⪹': 'precedes-above-not-almost-equal-to',
	'⪺': 'succeeds-above-not-almost-equal-to',
	'⪻': 'double-precedes',
	'⪼': 'double-succeeds',
	'⪽': 'subset-with-dot',
	'⪾': 'superset-with-dot',
	'⪿': 'subset-with-plus-sign-below',
	'⫀': 'superset-with-plus-sign-below',
	'⫁': 'subset-with-multiplication-sign-below',
	'⫂': 'superset-with-multiplication-sign-below',
	'⫃': 'subset-of-or-equal-to-with-dot-above',
	'⫄': 'superset-of-or-equal-to-with-dot-above',
	'⫅': 'subset-of-above-equals-sign',
	'⫆': 'superset-of-above-equals-sign',
	'⫇': 'subset-of-above-tilde-operator',
	'⫈': 'superset-of-above-tilde-operator',
	'⫉': 'subset-of-above-almost-equal-to',
	'⫊': 'superset-of-above-almost-equal-to',
	'⫋': 'subset-of-above-not-equal-to',
	'⫌': 'superset-of-above-not-equal-to',
	'⫍': 'square-left-open-box-operator',
	'⫎': 'square-right-open-box-operator',
	'⫏': 'closed-subset',
	'⫐': 'closed-superset',
	'⫑': 'closed-subset-or-equal-to',
	'⫒': 'closed-superset-or-equal-to',
	'⫓': 'subset-above-superset',
	'⫔': 'superset-above-subset',
	'⫕': 'subset-above-subset',
	'⫖': 'superset-above-superset',
	'⫗': 'superset-beside-subset',
	'⫘': 'superset-beside-and-joined-by-dash-with-subset',
	'⫙': 'element-of-opening-downwards',
	'⫚': 'pitchfork-with-tee-top',
	'⫛': 'transversal-intersection',
	'⫝̸': 'forking',
	'⫝': 'nonforking',
	'⫞': 'short-left-tack',
	'⫟': 'short-down-tack',
	'⫠': 'short-up-tack',
	'⫡': 'perpendicular-with-s',
	'⫢': 'vertical-bar-triple-right-turnstile',
	'⫣': 'double-vertical-bar-left-turnstile',
	'⫤': 'vertical-bar-double-left-turnstile',
	'⫥': 'double-vertical-bar-double-left-turnstile',
	'⫦': 'long-dash-from-left-member-of-double-vertical',
	'⫧': 'short-down-tack-with-overbar',
	'⫨': 'short-up-tack-with-underbar',
	'⫩': 'short-up-tack-above-short-down-tack',
	'⫪': 'double-down-tack',
	'⫫': 'double-up-tack',
	'⫬': 'double-stroke-not-sign',
	'⫭': 'reversed-double-stroke-not-sign',
	'⫮': 'does-not-divide-with-reversed-negation-slash',
	'⫯': 'vertical-line-with-circle-above',
	'⫰': 'vertical-line-with-circle-below',
	'⫱': 'down-tack-with-circle-below',
	'⫲': 'parallel-with-horizontal-stroke',
	'⫳': 'parallel-with-tilde-operator',
	'⫴': 'triple-vertical-bar-binary-relation',
	'⫵': 'triple-vertical-bar-with-horizontal-stroke',
	'⫶': 'triple-colon-operator',
	'⫷': 'triple-nested-less-than',
	'⫸': 'triple-nested-greater-than',
	'⫹': 'double-line-slanted-less-than-or-equal-to',
	'⫺': 'double-line-slanted-greater-than-or-equal-to',
	'⫻': 'triple-solidus-binary-relation',
	'⫼': 'large-triple-vertical-bar-operator',
	'⫽': 'double-solidus-operator',
	'⫾': 'white-vertical-bar',
	'⫿': 'n-ary-white-vertical-bar',
	'⬰': 'left-arrow-with-small-circle',
	'⬱': 'three-leftwards-arrows',
	'⬲': 'left-arrow-with-circled-plus',
	'⬳': 'long-leftwards-squiggle-arrow',
	'⬴': 'leftwards-two-headed-arrow-with-vertical-stroke',
	'⬵': 'leftwards-two-headed-arrow-with-double-vertical-stroke',
	'⬶': 'leftwards-two-headed-arrow-from-bar',
	'⬷': 'leftwards-two-headed-triple-dash-arrow',
	'⬸': 'leftwards-arrow-with-dotted-stem',
	'⬹': 'leftwards-arrow-with-tail-with-vertical-stroke',
	'⬺': 'leftwards-arrow-with-tail-with-double-vertical-stroke',
	'⬻': 'leftwards-two-headed-arrow-with-tail',
	'⬼': 'leftwards-two-headed-arrow-with-tail-with-vertical-stroke',
	'⬽': 'leftwards-two-headed-arrow-with-tail-with-double-vertical-stroke',
	'⬾': 'leftwards-arrow-through-x',
	'⬿': 'wave-arrow-pointing-directly-left',
	'⭀': 'equals-sign-above-leftwards-arrow',
	'⭁': 'reverse-tilde-operator-above-leftwards-arrow',
	'⭂': 'leftwards-arrow-above-reverse-almost-equal-to',
	'⭃': 'rightwards-arrow-through-greater-than',
	'⭄': 'rightwards-arrow-through-superset',
	'⭇': 'reverse-tilde-operator-above-rightwards-arrow',
	'⭈': 'rightwards-arrow-above-reverse-almost-equal-to',
	'⭉': 'tilde-operator-above-leftwards-arrow',
	'⭊': 'leftwards-arrow-above-almost-equal-to',
	'⭋': 'leftwards-arrow-above-reverse-tilde-operator',
	'⭌': 'rightwards-arrow-above-reverse-tilde-operator',
	'⟰': 'upwards-quadruple-arrow',
	'⟱': 'downwards-quadruple-arrow',
	'⟲': 'anticlockwise-gapped-circle-arrow',
	'⟳': 'clockwise-gapped-circle-arrow',
	'⟴': 'right-arrow-with-circled-plus',
	'⟻': 'long-leftwards-arrow-from-bar',
	'⟽': 'long-leftwards-double-arrow-from-bar',
	'⟾': 'long-rightwards-double-arrow-from-bar',
	'⟿': 'long-rightwards-squiggle-arrow',
	'⤀': 'rightwards-two-headed-arrow-with-vertical-stroke',
	'⤁': 'rightwards-two-headed-arrow-with-double-vertical-stroke',
	'⤂': 'leftwards-double-arrow-with-vertical-stroke',
	'⤃': 'rightwards-double-arrow-with-vertical-stroke',
	'⤄': 'left-right-double-arrow-with-vertical-stroke',
	'⤅': 'rightwards-two-headed-arrow-from-bar',
	'⤆': 'leftwards-double-arrow-from-bar',
	'⤇': 'rightwards-double-arrow-from-bar',
	'⤈': 'downwards-arrow-with-horizontal-stroke',
	'⤉': 'upwards-arrow-with-horizontal-stroke',
	'⤊': 'upwards-triple-arrow',
	'⤋': 'downwards-triple-arrow',
	'⤌': 'leftwards-double-dash-arrow',
	'⤍': 'rightwards-double-dash-arrow',
	'⤎': 'leftwards-triple-dash-arrow',
	'⤏': 'rightwards-triple-dash-arrow',
	'⤐': 'rightwards-two-headed-triple-dash-arrow',
	'⤑': 'rightwards-arrow-with-dotted-stem',
	'⤒': 'upwards-arrow-to-bar',
	'⤓': 'downwards-arrow-to-bar',
	'⤔': 'rightwards-arrow-with-tail-with-vertical-stroke',
	'⤕': 'rightwards-arrow-with-tail-with-double-vertical-stroke',
	'⤖': 'rightwards-two-headed-arrow-with-tail',
	'⤗': 'rightwards-two-headed-arrow-with-tail-with-vertical-stroke',
	'⤘': 'rightwards-two-headed-arrow-with-tail-with-double-vertical-stroke',
	'⤙': 'leftwards-arrow-tail',
	'⤚': 'rightwards-arrow-tail',
	'⤛': 'leftwards-double-arrow-tail',
	'⤜': 'rightwards-double-arrow-tail',
	'⤝': 'leftwards-arrow-to-black-diamond',
	'⤞': 'rightwards-arrow-to-black-diamond',
	'⤟': 'leftwards-arrow-from-bar-to-black-diamond',
	'⤠': 'rightwards-arrow-from-bar-to-black-diamond',
	'⤡': 'north-west-and-south-east-arrow',
	'⤢': 'north-east-and-south-west-arrow',
	'⤣': 'north-west-arrow-with-hook',
	'⤤': 'north-east-arrow-with-hook',
	'⤥': 'south-east-arrow-with-hook',
	'⤦': 'south-west-arrow-with-hook',
	'⤧': 'north-west-arrow-and-north-east-arrow',
	'⤨': 'north-east-arrow-and-south-east-arrow',
	'⤩': 'south-east-arrow-and-south-west-arrow',
	'⤪': 'south-west-arrow-and-north-west-arrow',
	'⤫': 'rising-diagonal-crossing-falling-diagonal',
	'⤬': 'falling-diagonal-crossing-rising-diagonal',
	'⤭': 'south-east-arrow-crossing-north-east-arrow',
	'⤮': 'north-east-arrow-crossing-south-east-arrow',
	'⤯': 'falling-diagonal-crossing-north-east-arrow',
	'⤰': 'rising-diagonal-crossing-south-east-arrow',
	'⤱': 'north-east-arrow-crossing-north-west-arrow',
	'⤲': 'north-west-arrow-crossing-north-east-arrow',
	'⤳': 'wave-arrow-pointing-directly-right',
	'⤴': 'arrow-pointing-rightwards-then-curving-upwards',
	'⤵': 'arrow-pointing-rightwards-then-curving-downwards',
	'⤶': 'arrow-pointing-downwards-then-curving-leftwards',
	'⤷': 'arrow-pointing-downwards-then-curving-rightwards',
	'⤸': 'right-side-arc-clockwise-arrow',
	'⤹': 'left-side-arc-anticlockwise-arrow',
	'⤺': 'top-arc-anticlockwise-arrow',
	'⤻': 'bottom-arc-anticlockwise-arrow',
	'⤼': 'top-arc-clockwise-arrow-with-minus',
	'⤽': 'top-arc-anticlockwise-arrow-with-plus',
	'⤾': 'lower-right-semicircular-clockwise-arrow',
	'⤿': 'lower-left-semicircular-anticlockwise-arrow',
	'⥀': 'anticlockwise-closed-circle-arrow',
	'⥁': 'clockwise-closed-circle-arrow',
	'⥂': 'rightwards-arrow-above-short-leftwards-arrow',
	'⥃': 'leftwards-arrow-above-short-rightwards-arrow',
	'⥄': 'short-rightwards-arrow-above-leftwards-arrow',
	'⥅': 'rightwards-arrow-with-plus-below',
	'⥆': 'leftwards-arrow-with-plus-below',
	'⥇': 'rightwards-arrow-through-x',
	'⥈': 'left-right-arrow-through-small-circle',
	'⥉': 'upwards-two-headed-arrow-from-small-circle',
	'⥊': 'left-barb-up-right-barb-down-harpoon',
	'⥋': 'left-barb-down-right-barb-up-harpoon',
	'⥌': 'up-barb-right-down-barb-left-harpoon',
	'⥍': 'up-barb-left-down-barb-right-harpoon',
	'⥎': 'left-barb-up-right-barb-up-harpoon',
	'⥏': 'up-barb-right-down-barb-right-harpoon',
	'⥐': 'left-barb-down-right-barb-down-harpoon',
	'⥑': 'up-barb-left-down-barb-left-harpoon',
	'⥒': 'leftwards-harpoon-with-barb-up-to-bar',
	'⥓': 'rightwards-harpoon-with-barb-up-to-bar',
	'⥔': 'upwards-harpoon-with-barb-right-to-bar',
	'⥕': 'downwards-harpoon-with-barb-right-to-bar',
	'⥖': 'leftwards-harpoon-with-barb-down-to-bar',
	'⥗': 'rightwards-harpoon-with-barb-down-to-bar',
	'⥘': 'upwards-harpoon-with-barb-left-to-bar',
	'⥙': 'downwards-harpoon-with-barb-left-to-bar',
	'⥚': 'leftwards-harpoon-with-barb-up-from-bar',
	'⥛': 'rightwards-harpoon-with-barb-up-from-bar',
	'⥜': 'upwards-harpoon-with-barb-right-from-bar',
	'⥝': 'downwards-harpoon-with-barb-right-from-bar',
	'⥞': 'leftwards-harpoon-with-barb-down-from-bar',
	'⥟': 'rightwards-harpoon-with-barb-down-from-bar',
	'⥠': 'upwards-harpoon-with-barb-left-from-bar',
	'⥡': 'downwards-harpoon-with-barb-left-from-bar',
	'⥢': 'leftwards-harpoon-with-barb-up-above-leftwards-harpoon-with-barb-down',
	'⥣': 'upwards-harpoon-with-barb-left-beside-upwards-harpoon-with-barb-right',
	'⥤': 'rightwards-harpoon-with-barb-up-above-rightwards-harpoon-with-barb-down',
	'⥥': 'downwards-harpoon-with-barb-left-beside-downwards-harpoon-with-barb-right',
	'⥦': 'leftwards-harpoon-with-barb-up-above-rightwards-harpoon-with-barb-up',
	'⥧': 'leftwards-harpoon-with-barb-down-above-rightwards-harpoon-with-barb-down',
	'⥨': 'rightwards-harpoon-with-barb-up-above-leftwards-harpoon-with-barb-up',
	'⥩': 'rightwards-harpoon-with-barb-down-above-leftwards-harpoon-with-barb-down',
	'⥪': 'leftwards-harpoon-with-barb-up-above-long-dash',
	'⥫': 'leftwards-harpoon-with-barb-down-below-long-dash',
	'⥬': 'rightwards-harpoon-with-barb-up-above-long-dash',
	'⥭': 'rightwards-harpoon-with-barb-down-below-long-dash',
	'⥮': 'upwards-harpoon-with-barb-left-beside-downwards-harpoon-with-barb-right',
	'⥯': 'downwards-harpoon-with-barb-left-beside-upwards-harpoon-with-barb-right',
	'⥰': 'right-double-arrow-with-rounded-head',
	'⥱': 'equals-sign-above-rightwards-arrow',
	'⥲': 'tilde-operator-above-rightwards-arrow',
	'⥳': 'leftwards-arrow-above-tilde-operator',
	'⥴': 'rightwards-arrow-above-tilde-operator',
	'⥵': 'rightwards-arrow-above-almost-equal-to',
	'⥶': 'less-than-above-leftwards-arrow',
	'⥷': 'leftwards-arrow-through-less-than',
	'⥸': 'greater-than-above-rightwards-arrow',
	'⥹': 'subset-above-rightwards-arrow',
	'⥺': 'leftwards-arrow-through-subset',
	'⥻': 'superset-above-leftwards-arrow',
	'⥼': 'left-fish-tail',
	'⥽': 'right-fish-tail',
	'⥾': 'up-fish-tail',
	'⥿': 'down-fish-tail',
	'🠀': 'leftwards-arrow-with-small-triangle-arrowhead',
	'🠁': 'upwards-arrow-with-small-triangle-arrowhead',
	'🠂': 'rightwards-arrow-with-small-triangle-arrowhead',
	'🠃': 'downwards-arrow-with-small-triangle-arrowhead',
	'🠄': 'leftwards-arrow-with-medium-triangle-arrowhead',
	'🠅': 'upwards-arrow-with-medium-triangle-arrowhead',
	'🠆': 'rightwards-arrow-with-medium-triangle-arrowhead',
	'🠇': 'downwards-arrow-with-medium-triangle-arrowhead',
	'🠈': 'leftwards-arrow-with-large-triangle-arrowhead',
	'🠉': 'upwards-arrow-with-large-triangle-arrowhead',
	'🠊': 'rightwards-arrow-with-large-triangle-arrowhead',
	'🠋': 'downwards-arrow-with-large-triangle-arrowhead',
	'🠐': 'leftwards-arrow-with-small-equilateral-arrowhead',
	'🠑': 'upwards-arrow-with-small-equilateral-arrowhead',
	'🠒': 'rightwards-arrow-with-small-equilateral-arrowhead',
	'🠓': 'downwards-arrow-with-small-equilateral-arrowhead',
	'🠔': 'leftwards-arrow-with-equilateral-arrowhead',
	'🠕': 'upwards-arrow-with-equilateral-arrowhead',
	'🠖': 'rightwards-arrow-with-equilateral-arrowhead',
	'🠗': 'downwards-arrow-with-equilateral-arrowhead',
	'🠘': 'heavy-leftwards-arrow-with-equilateral-arrowhead',
	'🠙': 'heavy-upwards-arrow-with-equilateral-arrowhead',
	'🠚': 'heavy-rightwards-arrow-with-equilateral-arrowhead',
	'🠛': 'heavy-downwards-arrow-with-equilateral-arrowhead',
	'🠜': 'heavy-leftwards-arrow-with-large-equilateral-arrowhead',
	'🠝': 'heavy-upwards-arrow-with-large-equilateral-arrowhead',
	'🠞': 'heavy-rightwards-arrow-with-large-equilateral-arrowhead',
	'🠟': 'heavy-downwards-arrow-with-large-equilateral-arrowhead',
	'🠠': 'leftwards-triangle-headed-arrow-with-narrow-shaft',
	'🠡': 'upwards-triangle-headed-arrow-with-narrow-shaft',
	'🠢': 'rightwards-triangle-headed-arrow-with-narrow-shaft',
	'🠣': 'downwards-triangle-headed-arrow-with-narrow-shaft',
	'🠤': 'leftwards-triangle-headed-arrow-with-medium-shaft',
	'🠥': 'upwards-triangle-headed-arrow-with-medium-shaft',
	'🠦': 'rightwards-triangle-headed-arrow-with-medium-shaft',
	'🠧': 'downwards-triangle-headed-arrow-with-medium-shaft',
	'🠨': 'leftwards-triangle-headed-arrow-with-bold-shaft',
	'🠩': 'upwards-triangle-headed-arrow-with-bold-shaft',
	'🠪': 'rightwards-triangle-headed-arrow-with-bold-shaft',
	'🠫': 'downwards-triangle-headed-arrow-with-bold-shaft',
	'🠬': 'leftwards-triangle-headed-arrow-with-heavy-shaft',
	'🠭': 'upwards-triangle-headed-arrow-with-heavy-shaft',
	'🠮': 'rightwards-triangle-headed-arrow-with-heavy-shaft',
	'🠯': 'downwards-triangle-headed-arrow-with-heavy-shaft',
	'🠰': 'leftwards-triangle-headed-arrow-with-very-heavy-shaft',
	'🠱': 'upwards-triangle-headed-arrow-with-very-heavy-shaft',
	'🠲': 'rightwards-triangle-headed-arrow-with-very-heavy-shaft',
	'🠳': 'downwards-triangle-headed-arrow-with-very-heavy-shaft',
	'🠴': 'leftwards-finger-post-arrow',
	'🠵': 'upwards-finger-post-arrow',
	'🠶': 'rightwards-finger-post-arrow',
	'🠷': 'downwards-finger-post-arrow',
	'🠸': 'leftwards-squared-arrow',
	'🠹': 'upwards-squared-arrow',
	'🠺': 'rightwards-squared-arrow',
	'🠻': 'downwards-squared-arrow',
	'🠼': 'leftwards-compressed-arrow',
	'🠽': 'upwards-compressed-arrow',
	'🠾': 'rightwards-compressed-arrow',
	'🠿': 'downwards-compressed-arrow',
	'🡀': 'leftwards-heavy-compressed-arrow',
	'🡁': 'upwards-heavy-compressed-arrow',
	'🡂': 'rightwards-heavy-compressed-arrow',
	'🡃': 'downwards-heavy-compressed-arrow',
	'🡄': 'leftwards-heavy-arrow',
	'🡅': 'upwards-heavy-arrow',
	'🡆': 'rightwards-heavy-arrow',
	'🡇': 'downwards-heavy-arrow',
	'🡐': 'leftwards-sans-serif-arrow',
	'🡑': 'upwards-sans-serif-arrow',
	'🡒': 'rightwards-sans-serif-arrow',
	'🡓': 'downwards-sans-serif-arrow',
	'🡔': 'north-west-sans-serif-arrow',
	'🡕': 'north-east-sans-serif-arrow',
	'🡖': 'south-east-sans-serif-arrow',
	'🡗': 'south-west-sans-serif-arrow',
	'🡘': 'left-right-sans-serif-arrow',
	'🡙': 'up-down-sans-serif-arrow',
	'🡠': 'wide-headed-leftwards-light-barb-arrow',
	'🡡': 'wide-headed-upwards-light-barb-arrow',
	'🡢': 'wide-headed-rightwards-light-barb-arrow',
	'🡣': 'wide-headed-downwards-light-barb-arrow',
	'🡤': 'wide-headed-north-west-light-barb-arrow',
	'🡥': 'wide-headed-north-east-light-barb-arrow',
	'🡦': 'wide-headed-south-east-light-barb-arrow',
	'🡧': 'wide-headed-south-west-light-barb-arrow',
	'🡨': 'wide-headed-leftwards-barb-arrow',
	'🡩': 'wide-headed-upwards-barb-arrow',
	'🡪': 'wide-headed-rightwards-barb-arrow',
	'🡫': 'wide-headed-downwards-barb-arrow',
	'🡬': 'wide-headed-north-west-barb-arrow',
	'🡭': 'wide-headed-north-east-barb-arrow',
	'🡮': 'wide-headed-south-east-barb-arrow',
	'🡯': 'wide-headed-south-west-barb-arrow',
	'🡰': 'wide-headed-leftwards-medium-barb-arrow',
	'🡱': 'wide-headed-upwards-medium-barb-arrow',
	'🡲': 'wide-headed-rightwards-medium-barb-arrow',
	'🡳': 'wide-headed-downwards-medium-barb-arrow',
	'🡴': 'wide-headed-north-west-medium-barb-arrow',
	'🡵': 'wide-headed-north-east-medium-barb-arrow',
	'🡶': 'wide-headed-south-east-medium-barb-arrow',
	'🡷': 'wide-headed-south-west-medium-barb-arrow',
	'🡸': 'wide-headed-leftwards-heavy-barb-arrow',
	'🡹': 'wide-headed-upwards-heavy-barb-arrow',
	'🡺': 'wide-headed-rightwards-heavy-barb-arrow',
	'🡻': 'wide-headed-downwards-heavy-barb-arrow',
	'🡼': 'wide-headed-north-west-heavy-barb-arrow',
	'🡽': 'wide-headed-north-east-heavy-barb-arrow',
	'🡾': 'wide-headed-south-east-heavy-barb-arrow',
	'🡿': 'wide-headed-south-west-heavy-barb-arrow',
	'🢀': 'wide-headed-leftwards-very-heavy-barb-arrow',
	'🢁': 'wide-headed-upwards-very-heavy-barb-arrow',
	'🢂': 'wide-headed-rightwards-very-heavy-barb-arrow',
	'🢃': 'wide-headed-downwards-very-heavy-barb-arrow',
	'🢄': 'wide-headed-north-west-very-heavy-barb-arrow',
	'🢅': 'wide-headed-north-east-very-heavy-barb-arrow',
	'🢆': 'wide-headed-south-east-very-heavy-barb-arrow',
	'🢇': 'wide-headed-south-west-very-heavy-barb-arrow',
	'🢐': 'leftwards-triangle-arrowhead',
	'🢑': 'upwards-triangle-arrowhead',
	'🢒': 'rightwards-triangle-arrowhead',
	'🢓': 'downwards-triangle-arrowhead',
	'🢔': 'leftwards-white-arrow-within-triangle-arrowhead',
	'🢕': 'upwards-white-arrow-within-triangle-arrowhead',
	'🢖': 'rightwards-white-arrow-within-triangle-arrowhead',
	'🢗': 'downwards-white-arrow-within-triangle-arrowhead',
	'🢘': 'leftwards-arrow-with-notched-tail',
	'🢙': 'upwards-arrow-with-notched-tail',
	'🢚': 'rightwards-arrow-with-notched-tail',
	'🢛': 'downwards-arrow-with-notched-tail',
	'🢜': 'heavy-arrow-shaft-width-one',
	'🢝': 'heavy-arrow-shaft-width-two-thirds',
	'🢞': 'heavy-arrow-shaft-width-one-half',
	'🢟': 'heavy-arrow-shaft-width-one-third',
	'🢠': 'leftwards-bottom-shaded-white-arrow',
	'🢡': 'rightwards-bottom-shaded-white-arrow',
	'🢢': 'leftwards-top-shaded-white-arrow',
	'🢣': 'rightwards-top-shaded-white-arrow',
	'🢤': 'leftwards-left-shaded-white-arrow',
	'🢥': 'rightwards-right-shaded-white-arrow',
	'🢦': 'leftwards-right-shaded-white-arrow',
	'🢧': 'rightwards-left-shaded-white-arrow',
	'🢨': 'leftwards-back-tilted-shadowed-white-arrow',
	'🢩': 'rightwards-back-tilted-shadowed-white-arrow',
	'🢪': 'leftwards-front-tilted-shadowed-white-arrow',
	'🢫': 'rightwards-front-tilted-shadowed-white-arrow',
	'🢬': 'white-arrow-shaft-width-one',
	'🢭': 'white-arrow-shaft-width-two-thirds',
	'🢰': 'arrow-pointing-upwards-then-north-west',
	'🢱': 'arrow-pointing-rightwards-then-curving-south-west',
	'🢲': 'rightwards-arrow-with-lower-hook',
	'🢳': 'downwards-black-arrow-to-bar',
	'🢴': 'negative-squared-leftwards-arrow',
	'🢵': 'negative-squared-upwards-arrow',
	'🢶': 'negative-squared-rightwards-arrow',
	'🢷': 'negative-squared-downwards-arrow',
	'🢸': 'north-west-arrow-from-bar',
	'🢹': 'north-east-arrow-from-bar',
	'🢺': 'south-east-arrow-from-bar',
	'🢻': 'south-west-arrow-from-bar',
	'🣀': 'leftwards-arrow-from-downwards-arrow',
	'🣁': 'rightwards-arrow-from-downwards-arrow',
	'⌶': 'apl-functional-symbol-i-beam',
	'⌷': 'apl-functional-symbol-squish-quad',
	'⌸': 'apl-functional-symbol-quad-equal',
	'⌹': 'apl-functional-symbol-quad-divide',
	'⌺': 'apl-functional-symbol-quad-diamond',
	'⌻': 'apl-functional-symbol-quad-jot',
	'⌼': 'apl-functional-symbol-quad-circle',
	'⌽': 'apl-functional-symbol-circle-stile',
	'⌾': 'apl-functional-symbol-circle-jot',
	'⌿': 'apl-functional-symbol-slash-bar',
	'⍀': 'apl-functional-symbol-backslash-bar',
	'⍁': 'apl-functional-symbol-quad-slash',
	'⍂': 'apl-functional-symbol-quad-backslash',
	'⍃': 'apl-functional-symbol-quad-less-than',
	'⍄': 'apl-functional-symbol-quad-greater-than',
	'⍅': 'apl-functional-symbol-leftwards-vane',
	'⍆': 'apl-functional-symbol-rightwards-vane',
	'⍇': 'apl-functional-symbol-quad-leftwards-arrow',
	'⍈': 'apl-functional-symbol-quad-rightwards-arrow',
	'⍉': 'apl-functional-symbol-circle-backslash',
	'⍊': 'apl-functional-symbol-down-tack-underbar',
	'⍋': 'apl-functional-symbol-delta-stile',
	'⍌': 'apl-functional-symbol-quad-down-caret',
	'⍍': 'apl-functional-symbol-quad-delta',
	'⍎': 'apl-functional-symbol-down-tack-jot',
	'⍏': 'apl-functional-symbol-upwards-vane',
	'⍐': 'apl-functional-symbol-quad-upwards-arrow',
	'⍑': 'apl-functional-symbol-up-tack-overbar',
	'⍒': 'apl-functional-symbol-del-stile',
	'⍓': 'apl-functional-symbol-quad-up-caret',
	'⍔': 'apl-functional-symbol-quad-del',
	'⍕': 'apl-functional-symbol-up-tack-jot',
	'⍖': 'apl-functional-symbol-downwards-vane',
	'⍗': 'apl-functional-symbol-quad-downwards-arrow',
	'⍘': 'apl-functional-symbol-quote-underbar',
	'⍙': 'apl-functional-symbol-delta-underbar',
	'⍚': 'apl-functional-symbol-diamond-underbar',
	'⍛': 'apl-functional-symbol-jot-underbar',
	'⍜': 'apl-functional-symbol-circle-underbar',
	'⍝': 'apl-functional-symbol-up-shoe-jot',
	'⍞': 'apl-functional-symbol-quote-quad',
	'⍟': 'apl-functional-symbol-circle-star',
	'⍠': 'apl-functional-symbol-quad-colon',
	'⍡': 'apl-functional-symbol-up-tack-diaeresis',
	'⍢': 'apl-functional-symbol-del-diaeresis',
	'⍣': 'apl-functional-symbol-star-diaeresis',
	'⍤': 'apl-functional-symbol-jot-diaeresis',
	'⍥': 'apl-functional-symbol-circle-diaeresis',
	'⍦': 'apl-functional-symbol-down-shoe-stile',
	'⍧': 'apl-functional-symbol-left-shoe-stile',
	'⍨': 'apl-functional-symbol-tilde-diaeresis',
	'⍩': 'apl-functional-symbol-greater-than-diaeresis',
	'⍪': 'apl-functional-symbol-comma-bar',
	'⍫': 'apl-functional-symbol-del-tilde',
	'⍬': 'apl-functional-symbol-zilde',
	'⍭': 'apl-functional-symbol-stile-tilde',
	'⍮': 'apl-functional-symbol-semicolon-underbar',
	'⍯': 'apl-functional-symbol-quad-not-equal',
	'⍰': 'apl-functional-symbol-quad-question',
	'⍱': 'apl-functional-symbol-down-caret-tilde',
	'⍲': 'apl-functional-symbol-up-caret-tilde',
	'⍳': 'apl-functional-symbol-iota',
	'⍴': 'apl-functional-symbol-rho',
	'⍵': 'apl-functional-symbol-omega',
	'⍶': 'apl-functional-symbol-alpha-underbar',
	'⍷': 'apl-functional-symbol-epsilon-underbar',
	'⍸': 'apl-functional-symbol-iota-underbar',
	'⍹': 'apl-functional-symbol-omega-underbar',
	'⍺': 'apl-functional-symbol-alpha',
};

const vulgarFractions: Readonly<Record<string, string>> = {
	'¼': 'one-quarter',
	'½': 'one-half',
	'¾': 'three-quarters',
	'⅐': 'one-seventh',
	'⅑': 'one-ninth',
	'⅒': 'one-tenth',
	'⅓': 'one-third',
	'⅔': 'two-thirds',
	'⅕': 'one-fifth',
	'⅖': 'two-fifths',
	'⅗': 'three-fifths',
	'⅘': 'four-fifths',
	'⅙': 'one-sixth',
	'⅚': 'five-sixths',
	'⅛': 'one-eighth',
	'⅜': 'three-eighths',
	'⅝': 'five-eighths',
	'⅞': 'seven-eighths',
};

const musicalAccidentals: Readonly<Record<string, string>> = {
	'♯': 'sharp',
	'♭': 'flat',
	'♮': 'natural',
	'𝄪': 'double-sharp',
	'𝄫': 'double-flat',
};

const negatedComparisons: Readonly<Record<string, string>> = {
	'≮': 'not-less-than',
	'≯': 'not-greater-than',
	'≰': 'not-less-than-or-equal-to',
	'≱': 'not-greater-than-or-equal-to',
};

const fractionNames = new Map(
	Object.entries(vulgarFractions).map(([symbol, name]) => [
		symbol.normalize('NFKD').replace('⁄', '/'),
		name,
	]),
);
const QUANTITY_UNIT =
	'(?:cups?|teaspoons?|tablespoons?|tsp|tbsp|ounces?|oz|pounds?|lbs?|inches|inch|feet|foot|ft|yards?|yd|miles?|hours?|minutes?|seconds?)\\b';
const QUANTITY_FRACTION_RE = new RegExp(
	`(?<![\\p{L}\\p{N}./])(?:([0-9]+)[ \\t]+)?([0-9]+)/([1-9][0-9]*)(?=[ \\t-]+${QUANTITY_UNIT})`,
	'gu',
);
const QUANTITY_LEADING_DECIMAL_RE = new RegExp(
	`(?<![\\p{L}\\p{N}.])\\.([0-9]+)(?=[ \\t]+${QUANTITY_UNIT})`,
	'gu',
);
const PRESERVED_UNICODE_MEANING_RE = new RegExp(
	`(${URL_LIKE_RE.source})|([≠≮≯≰≱])|(?<![\\p{L}\\p{N}])([\\p{Nd}]*)([¼½¾⅐-⅞])(?![\\p{L}\\p{N}])`,
	'giu',
);

function formatFraction(
	whole: string | undefined,
	numerator: string,
	denominator: string,
): string {
	const fraction =
		fractionNames.get(`${numerator}/${denominator}`) ??
		`${numerator}-over-${denominator}`;
	return `${whole ? `${whole}-and-` : ''}${fraction}`;
}

/** Preserve distinctions that compatibility decomposition would erase. */
const SUPERSCRIPT_RE = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ]$/u;
const SUBSCRIPT_RE = /^[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]$/u;
const RAW_URL_RE = new RegExp(URL_LIKE_RE.source, 'iuy');
const RAW_TAG_RE = /<\/?[a-z](?:[^<>"']|"[^"]*"|'[^']*')*>/iuy;
const HEIGHT_RE = /(?<![\p{L}\p{N}.])([0-9]+)′[ \t]*([0-9]+)″(?!\p{N})/uy;
const PRIME_COUNTS: Readonly<Record<string, number>> = {
	'′': 1,
	'″': 2,
	'‴': 3,
	'⁗': 4,
};
const MATH_PREFIX_SYMBOLS = new Set(Array.from('√∛∜∑∏∐∫∬∭∮∯∰∇∂'));
const MATH_CONSTANT_SYMBOLS = new Set(Array.from('∞∅ℵℶℷℸ⊤⊥'));
const MATHEMATICAL_ALPHABETS: Readonly<Record<string, string>> = {
	ℕ: 'natural-numbers',
	ℤ: 'integers',
	ℚ: 'rational-numbers',
	ℝ: 'real-numbers',
	ℂ: 'complex-numbers',
	ℍ: 'quaternions',
	'𝔽': 'field',
};
const MATH_WRAPPERS: Readonly<Record<string, readonly [string, string]>> = {
	'⌊': ['⌋', 'floor'],
	'⌈': ['⌉', 'ceiling'],
	'⟨': ['⟩', 'angle-bracket'],
	'⟦': ['⟧', 'double-bracket'],
};

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
function preserveGenericTypes(value: string): string {
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

function applyNamedOperatorContexts(value: string): string {
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
function applyConditionalContexts(value: string): string {
	const questions: { index: number; depth: number }[] = [];
	const replacements = new Map<number, string>();
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
			(!/[\p{L}\p{N})\]}"']/u.test(leftOperand) &&
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
			replacements.set(question.index, '-then-');
			replacements.set(index, '-else-');
		}
	}
	const output: string[] = [];
	let index = 0;
	for (const character of value) {
		output.push(replacements.get(index) ?? character);
		index += character.length;
	}
	return output.join('');
}

/** Paired bars with compact contents denote absolute values or norms, not prose pipes. */
function applyAbsoluteValueContexts(value: string): string {
	return value.replace(
		/(?<![\p{L}\p{N}|‖])(\|\||‖|\|)([^|‖\r\n\u2028\u2029]+?)\1(?![\p{L}\p{N}|‖])/gu,
		(match, delimiter: string, expression: string) => {
			if (
				expression.trim() !== expression ||
				!/[\p{L}\p{N}]/u.test(expression) ||
				/\p{L}{2,}[ \t]+\p{L}{2,}/u.test(expression)
			)
				return match;
			return `${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${delimiter === '|' ? 'absolute-value' : 'norm'}-${expression}-${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
		},
	);
}

/** Preserve variable and balanced algebraic factorials without renaming prose exclamations. */
function applyAlgebraicFactorialContexts(value: string): string {
	const openingByEnd = new Map(
		Array.from(getWrapperEnds(value), ([start, end]) => [end, start]),
	);
	const starts = new Set<number>();
	const replacements = new Map<number, { text: string; length: number }>();
	for (const match of value.matchAll(/(?<!!)(!{1,2})(?!!|=)/gu)) {
		const index = match.index;
		const marks = match[1];
		const before = getCodePointBefore(value, index);
		const after = getCodePointAt(value, index + marks.length);
		if (after !== undefined && WORD_CHARACTER_RE.test(after)) continue;
		const word = getWordBefore(value, index);
		const opening = openingByEnd.get(index);
		const hasExpressionContext =
			/[=+*/^%([{][ \t]*$/u.test(
				value.slice(
					Math.max(0, index - word.length - 8),
					index - word.length,
				),
			) || /^[=+*/^%]/u.test(after ?? '');
		const isVariable =
			Array.from(word).length === 1 &&
			/^\p{L}$/u.test(word) &&
			(!/^[ai]$/u.test(word) || hasExpressionContext);
		const body =
			opening === undefined || index - opening > 2048
				? ''
				: value
						.slice(opening + 1, index - 1)
						.replaceAll(SEMANTIC_NUMERIC_OPERAND_BOUNDARY, '');
		const isExpression =
			before !== undefined &&
			LEFT_OPERAND_WRAPPER_RE.test(before) &&
			/\p{L}/u.test(body) &&
			!/\p{L}{2,}|\r|\n/u.test(body) &&
			/^[\p{L}\p{N}\s+*/^%!=().,-]+$/u.test(body);
		if (!isVariable && !isExpression) continue;
		starts.add(isVariable ? index - word.length : (opening as number));
		replacements.set(index, {
			text: `-${marks.length === 2 ? 'double-' : ''}factorial${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
			length: marks.length,
		});
	}
	const output: string[] = [];
	for (let index = 0; index < value.length;) {
		if (starts.has(index)) output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		const replacement = replacements.get(index);
		const character = getCodePointAt(value, index) as string;
		output.push(replacement?.text ?? character);
		index += replacement?.length ?? character.length;
	}
	return output.join('');
}

/** Postfix updates are unambiguous; prefix decrements need an expression context to protect CLI flags. */
function applyDecrementContexts(value: string): string {
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
			/[(=,:;+*/%<>&|!?][ \t]*$/u.test(prefix) ||
			(index === 0 &&
				identifier !== undefined &&
				Array.from(identifier).length === 1)
		)
			return 'decrement-';
		return match;
	});
}

/** Pair wrappers once so roots and nested expressions do not rescan their contents. */
function getWrapperEnds(value: string): ReadonlyMap<number, number> {
	const ends = new Map<number, number>();
	const stack: { start: number; closing: string }[] = [];
	const openingToClosing: Readonly<Record<string, string>> = {
		...MATCHING_CLOSING_WRAPPER,
		...Object.fromEntries(
			Object.entries(MATH_WRAPPERS).map(([opening, [closing]]) => [
				opening,
				closing,
			]),
		),
	};
	const closings = new Set(Object.values(openingToClosing));
	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index) as string;
		if (LINE_BREAK_RE.test(character)) stack.length = 0;
		const closing = openingToClosing[character];
		if (closing !== undefined) stack.push({ start: index, closing });
		else if (closings.has(character)) {
			const frame = stack.pop();
			if (frame?.closing === character)
				ends.set(frame.start, index + character.length);
			else stack.length = 0;
		}
		index += character.length;
	}
	return ends;
}

function getWordBefore(value: string, end: number): string {
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

/** Name explicit mathematical notation before Unicode decomposition destroys its distinctions. */
function preserveMathNotation(input: string): string {
	const value = input.normalize('NFC');
	const wrapperEnds = getWrapperEnds(value);
	const operandEnds = new Set<number>();
	const mathWrapperClosings = new Set<number>();
	const output: string[] = [];
	for (let index = 0; index < value.length;) {
		if (operandEnds.has(index))
			output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		const character = getCodePointAt(value, index) as string;
		// A script or prime makes a single-letter base a mathematical operand on
		// both sides of an operator. Mark its start before emitting that base.
		if (
			/^\p{L}$/u.test(character) &&
			!WORD_CHARACTER_RE.test(getCodePointBefore(value, index) ?? '')
		) {
			const next = getCodePointAt(value, index + character.length) ?? '';
			if (
				SUPERSCRIPT_RE.test(next) ||
				SUBSCRIPT_RE.test(next) ||
				PRIME_COUNTS[next] !== undefined
			)
				output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		}
		if (character === '<' || /[hfw]/iu.test(character)) {
			const matcher = character === '<' ? RAW_TAG_RE : RAW_URL_RE;
			matcher.lastIndex = index;
			const protectedSpan = matcher.exec(value);
			if (protectedSpan !== null) {
				output.push(protectedSpan[0]);
				index += protectedSpan[0].length;
				continue;
			}
		}
		if (mathWrapperClosings.has(index)) {
			output.push(`-${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`);
			index += character.length;
			continue;
		}
		if (/[0-9.]/u.test(character)) {
			HEIGHT_RE.lastIndex = index;
			const height = HEIGHT_RE.exec(value);
			if (height !== null) {
				output.push(
					`${height[1]}-${isNumericOne(height[1]) ? 'foot' : 'feet'}-${height[2]}-${isNumericOne(height[2]) ? 'inch' : 'inches'}`,
				);
				index += height[0].length;
				continue;
			}
		}
		if (PRIME_COUNTS[character] !== undefined) {
			let end = index;
			let count = 0;
			let prime = getCodePointAt(value, end);
			while (prime !== undefined && PRIME_COUNTS[prime] !== undefined) {
				count += PRIME_COUNTS[prime];
				end += prime.length;
				prime = getCodePointAt(value, end);
			}
			const before = getCodePointBefore(value, index);
			if (before !== undefined && /[\p{L}\p{N})\]}]/u.test(before)) {
				const name =
					[
						'',
						'prime',
						'double-prime',
						'triple-prime',
						'quadruple-prime',
					][count] ?? `${count}-primes`;
				output.push(
					`-${name}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${prime !== undefined && WORD_CHARACTER_RE.test(prime) ? '-' : ''}`,
				);
			} else output.push(value.slice(index, end));
			index = end;
			continue;
		}
		const mathWrapper = MATH_WRAPPERS[character];
		const wrapperEnd = wrapperEnds.get(index);
		if (mathWrapper !== undefined && wrapperEnd !== undefined) {
			output.push(
				`${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${mathWrapper[1]}-`,
			);
			mathWrapperClosings.add(wrapperEnd - mathWrapper[0].length);
			index += character.length;
			continue;
		}
		const isSuperscript = SUPERSCRIPT_RE.test(character);
		const isSubscript = SUBSCRIPT_RE.test(character);
		if (isSuperscript || isSubscript) {
			const scriptPattern = isSuperscript ? SUPERSCRIPT_RE : SUBSCRIPT_RE;
			let end = index + character.length;
			let next = getCodePointAt(value, end);
			while (next !== undefined && scriptPattern.test(next)) {
				end += next.length;
				next = getCodePointAt(value, end);
			}
			const base = getWordBefore(value, index);
			const script = value
				.slice(index, end)
				.normalize('NFKD')
				.replaceAll('−', '-');
			// Embedded numeric subscripts in words and formulas such as H₂O/CO₂
			// retain the ordinary identifier spelling, rather than inventing algebra.
			if (
				isSubscript &&
				/^[0-9]+$/u.test(script) &&
				((next !== undefined && /\p{L}/u.test(next)) ||
					/^[A-Z]{2,}$/u.test(base))
			) {
				output.push(script);
			} else {
				const hasBase =
					base !== '' ||
					LEFT_OPERAND_WRAPPER_RE.test(
						getCodePointBefore(value, index) ?? '',
					);
				const isMathematicalBase =
					/^[0-9]+$/u.test(base) ||
					Array.from(base).length === 1 ||
					LEFT_OPERAND_WRAPPER_RE.test(
						getCodePointBefore(value, index) ?? '',
					) ||
					/^(?:sin|cos|tan|sinh|cosh|tanh|log|ln|exp)$/iu.test(base);
				const kind = isSubscript
					? base.toLowerCase() === 'log'
						? 'base'
						: 'subscript'
					: isMathematicalBase
						? 'to-the-power-of'
						: 'superscript';
				const spokenScript = script.replace(/^[+-]/u, (sign) =>
					sign === '-' ? 'negative-' : 'positive-',
				);
				output.push(
					`${hasBase ? '-' : ''}${kind}-${spokenScript}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
				);
				if (next !== undefined && WORD_CHARACTER_RE.test(next))
					output.push('-');
			}
			index = end;
			continue;
		}
		const name = unicodeMathNames[character];
		const alphabet = MATHEMATICAL_ALPHABETS[character];
		if (alphabet !== undefined) {
			const previous = getCodePointBefore(value, index);
			const next = getCodePointAt(value, index + character.length);
			if (
				(previous === undefined || !WORD_CHARACTER_RE.test(previous)) &&
				(next === undefined ||
					!WORD_CHARACTER_RE.test(next) ||
					SUPERSCRIPT_RE.test(next) ||
					SUBSCRIPT_RE.test(next))
			) {
				if (
					previous !== undefined &&
					unicodeMathNames[previous] !== undefined
				)
					output.push('-');
				output.push(
					`${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${alphabet}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
				);
				index += character.length;
				continue;
			}
		}
		if (name !== undefined) {
			const previous = getCodePointBefore(value, index);
			let end = index + character.length;
			const negated = getCodePointAt(value, end) === '\u0338';
			if (negated) end += 1;
			const next = getCodePointAt(value, end);
			const isPrefix = MATH_PREFIX_SYMBOLS.has(character);
			const isConstant = MATH_CONSTANT_SYMBOLS.has(character);
			if (
				previous !== undefined &&
				(WORD_CHARACTER_RE.test(previous) ||
					unicodeMathNames[previous] !== undefined)
			)
				output.push('-');
			if (isPrefix || isConstant)
				output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
			output.push(`${negated ? 'not-' : ''}${name}`);
			if (isConstant) output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
			if (next !== undefined && WORD_CHARACTER_RE.test(next))
				output.push('-');
			if (isPrefix) {
				let operandStart = end;
				while (
					operandStart < value.length &&
					CONTEXT_PADDING_RE.test(value[operandStart])
				)
					operandStart += 1;
				let operandEnd = wrapperEnds.get(operandStart) ?? operandStart;
				if (operandEnd === operandStart) {
					let token = getCodePointAt(value, operandEnd);
					while (
						token !== undefined &&
						(WORD_CHARACTER_RE.test(token) ||
							SUPERSCRIPT_RE.test(token) ||
							SUBSCRIPT_RE.test(token))
					) {
						operandEnd += token.length;
						token = getCodePointAt(value, operandEnd);
					}
				}
				if (operandEnd > operandStart) operandEnds.add(operandEnd);
			}
			index = end;
			continue;
		}
		output.push(character);
		index += character.length;
	}
	if (operandEnds.has(value.length))
		output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
	return output.join('');
}

function preserveUnicodeMeaning(input: string): string {
	return input
		.normalize('NFC')
		.replace(
			PRESERVED_UNICODE_MEANING_RE,
			(
				_match,
				url: string | undefined,
				relation: string | undefined,
				whole: string | undefined,
				fraction: string | undefined,
				offset: number,
				source: string,
			) => {
				if (url !== undefined) return url;
				if (relation === '≠') return '!=';
				if (relation !== undefined) {
					return getBinaryContext(
						source,
						offset,
						offset + relation.length,
					)
						? ` ${negatedComparisons[relation]} `
						: ' ';
				}
				return ` ${whole ? `${whole}-and-` : ''}${vulgarFractions[fraction ?? '']} `;
			},
		);
}

/** Resolve bounded English notation after URLs and tags have been silenced. */
function applyEnglishNotation(input: string): string {
	return input
		.replace(
			/(?<![\p{L}\p{N}.⁄])(?:([0-9]+)[ \t]+)?([0-9]+)⁄([1-9][0-9]*)(?![\p{L}\p{N}⁄])/gu,
			(
				_match,
				whole: string | undefined,
				numerator: string,
				denominator: string,
			) => formatFraction(whole, numerator, denominator),
		)
		.replace(
			QUANTITY_FRACTION_RE,
			(
				_match,
				whole: string | undefined,
				numerator: string,
				denominator: string,
			) => formatFraction(whole, numerator, denominator),
		)
		.replace(QUANTITY_LEADING_DECIMAL_RE, '0.$1')
		.replace(/(?<=[a-z])(?:ʼ|\u00ad)(?=[a-z])/gu, '')
		.replace(
			/(?<![\p{L}\p{N}])ʼ(?=(?:tis|twas|twere|twill|twould|em|cause)\b)/gu,
			'',
		)
		.replace(
			/(?<![\p{L}\p{N}])([a-g])(♯|♭|♮|𝄪|𝄫)([0-9]*)(?![\p{L}\p{N}])/gu,
			(_match, note: string, accidental: string, octave: string) =>
				`${note}-${musicalAccidentals[accidental]}${octave ? `-${octave}` : ''}`,
		)
		.replace(
			/(?<![\p{L}\p{N}#])([a-g])#(?=[ \t]+(?:major|minor|scale|chord|note|triad|arpeggio)\b)/gu,
			'$1-sharp',
		)
		.replace(
			/(?<![\p{L}\p{N}])((?:ab|[abo]|rh))([+−-])(?=[ \t]+(?:blood|donor|recipient|type)\b)/gu,
			(_match, group: string, sign: string) =>
				`${group}-${sign === '+' ? 'positive' : 'negative'}`,
		)
		.replace(
			/\b(blood(?:[ \t]+(?:type|group))?|type|group|rhesus|rh)[ \t]+(ab|[abo]|rh)([+−-])(?![\p{L}\p{N}+−-])/gu,
			(_match, context: string, group: string, sign: string) =>
				`${context} ${group}-${sign === '+' ? 'positive' : 'negative'}`,
		)
		.replace(
			/\b(grade|graded|score|rating)[ \t]+([abcdf])([+−-])(?![\p{L}\p{N}+−-])/gu,
			(_match, context: string, grade: string, sign: string) =>
				`${context} ${grade}-${sign === '+' ? 'plus' : 'minus'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}])([abcdf])([+−-])(?=[ \t]+(?:grade|student|pupil|work|score|rating)\b)/gu,
			(_match, grade: string, sign: string) =>
				`${grade}-${sign === '+' ? 'plus' : 'minus'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.,/+−-])([0-9]+)\+(?=$|[ \t]+[a-z]{2,}\b)/gu,
			'$1-plus',
		)
		.replace(
			/\b(open|available|accessible|operating|online)[ \t]+24[ \t]*\/[ \t]*7(?![\p{L}\p{N}./])/gu,
			'$1 24-7',
		)
		.replace(
			/(?<![\p{L}\p{N}./])24[ \t]*\/[ \t]*7(?=[ \t]+(?:support|service|access|availability|coverage|operation|monitoring|care)\b)/gu,
			'24-7',
		)
		.replace(
			/(?<![\p{L}\p{N}./])9[ \t]*\/[ \t]*11(?=[ \t]+(?:memorial|attacks|anniversary|remembrance)\b)/gu,
			'9-11',
		)
		.replace(
			/(?<![\p{L}\p{N}./])([1-9][0-9]*)[ \t]*\/[ \t]*([1-9][0-9]*)(?=[ \t]+(?:time|meter|metre|time-signature)\b)/gu,
			'$1-$2',
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*°[ \t]*([cf])(?![\p{L}\p{N}])/gu,
			(_match, amount: string, scale: string) =>
				`${amount}-${isNumericOne(amount) ? 'degree' : 'degrees'}-${scale === 'c' ? 'celsius' : 'fahrenheit'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*([‰‱])(?!\p{N})/gu,
			(_match, amount: string, symbol: string) =>
				`${amount}-${symbol === '‰' ? 'per-mille' : 'per-ten-thousand'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*°(?![\p{L}\p{N}])/gu,
			(_match, amount: string) =>
				`${amount}-${isNumericOne(amount) ? 'degree' : 'degrees'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
		)
		.replace(
			/(^|[ \t(])([+−-])(?=[0-9]+(?:\.[0-9]+)?-degrees?-(?:celsius|fahrenheit)\b)/gu,
			(_match, prefix: string, sign: string) =>
				`${prefix}${sign === '+' ? 'positive' : 'negative'}-`,
		)
		.replace(
			/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([ \t]*)−(?=[ \t]*\p{Nd})/gu,
			'$1$2-',
		)
		.replace(
			/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([ \t]*)±(?=[ \t]*\p{Nd})/gu,
			'$1$2plus-or-minus-',
		);
}

/** Full words around a spaced dash or slash indicate prose, not algebra. */
function hasProseOperands(value: string, start: number, end: number): boolean {
	let leftEnd = start;
	let rightStart = end;

	while (leftEnd > 0 && CONTEXT_PADDING_RE.test(value[leftEnd - 1])) {
		leftEnd -= 1;
	}
	while (
		rightStart < value.length &&
		CONTEXT_PADDING_RE.test(value[rightStart])
	) {
		rightStart += 1;
	}
	if (leftEnd === start || rightStart === end) {
		return false;
	}

	let leftStart = leftEnd;
	let rightEnd = rightStart;
	while (leftStart > 0 && /[a-z]/u.test(value[leftStart - 1])) {
		leftStart -= 1;
	}
	while (rightEnd < value.length && /[a-z]/u.test(value[rightEnd])) {
		rightEnd += 1;
	}

	return (
		leftStart < leftEnd &&
		rightStart < rightEnd &&
		(leftEnd - leftStart > 1 || rightEnd - rightStart > 1) &&
		!WORD_CHARACTER_RE.test(getCodePointBefore(value, leftStart) ?? '') &&
		!WORD_CHARACTER_RE.test(getCodePointAt(value, rightEnd) ?? '')
	);
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

const applyExceptionMappings = createExceptionMappingApplier(
	exceptionMappings.filter(({ source }) => !source.endsWith('*')),
);
// Bare postfix-star names must not steal the closing delimiter in *RRT*.
// Replacement fragments contain no stars, so the two groups cannot cascade.
const applyPostfixTermMappings = createExceptionMappingApplier(
	exceptionMappings.filter(({ source }) => source.endsWith('*')),
);

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
	`(?<![\\p{L}\\p{N}\\p{Sc}.,+−-])([+-]?)([${CURRENCY_NAME_PATTERN}])[ \\t]*([+-]?)[ \\t]*([0-9]+(?:\\.[0-9]+)?)(?![\\p{L}\\p{N}.,])`,
	'gu',
);
const OTHER_SUFFIX_CURRENCY_RE = new RegExp(
	`(?<![\\p{L}\\p{N}\\p{Sc}.,+−-])([+-]?)([0-9]+(?:\\.[0-9]+)?)[ \\t]*([${CURRENCY_NAME_PATTERN}])(?![\\p{L}\\p{N}\\p{Sc}])`,
	'gu',
);

function applyOtherCurrencyContexts(value: string): string {
	function format(amount: string, symbol: string, sign: string): string {
		const unit = currencyNames[symbol][isNumericOne(amount) ? 0 : 1];
		return `${sign === '-' ? 'negative-' : sign === '+' ? 'positive-' : ''}${amount.replace('.', '-point-')}-${unit}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
	}
	return value
		.replace(
			OTHER_PREFIX_CURRENCY_RE,
			(
				match,
				prefixSign: string,
				symbol: string,
				amountSign: string,
				amount: string,
			) =>
				prefixSign && amountSign
					? match
					: format(amount, symbol, prefixSign || amountSign),
		)
		.replace(
			OTHER_SUFFIX_CURRENCY_RE,
			(_match, sign: string, amount: string, symbol: string) =>
				format(amount, symbol, sign),
		);
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

function removeSingleStarEmphasisDelimiters(value: string): string {
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

		while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
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

		while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
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
		applyOtherCurrencyContexts(groupedInput),
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

function getCaretReplacement(value: string, index: number): string | undefined {
	const context = getBinaryContext(value, index, index + 1);

	if (context === undefined) {
		return undefined;
	}

	const looksLikeExponentiation =
		context.rightIsNumeric && (context.leftIsNumeric || !context.padded);

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
			if (
				(mapping.source === '-' || mapping.source === '/') &&
				hasProseOperands(structured, index, end)
			) {
				continue;
			}
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
	// Reserve internal operand markers so pasted control characters cannot forge context.
	const escaped = Array.from(input, (character) =>
		character.charCodeAt(0) <= 4
			? EMPHASIS_NUMERIC_BOUNDARY_ESCAPE
			: character,
	).join('');
	return applyContextualSymbolMappings(
		applyExceptionMappings(
			preserveUnicodeMeaning(
				preserveMathNotation(preserveGenericTypes(escaped)),
			),
		),
	)
		.replace(/['’‘"“”`]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
