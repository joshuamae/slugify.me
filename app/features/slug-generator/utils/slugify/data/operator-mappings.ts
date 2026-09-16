export type OperatorOperandMode =
	'any' | 'numeric' | 'identifier-right' | 'numeric-or-padded' | 'padded';

type ContextualOperatorMapping = Readonly<{
	source: string;
	replacement: string;
	operandMode?: OperatorOperandMode;
}>;

type CompiledContextualOperatorMapping = ContextualOperatorMapping &
	Readonly<{ declarationIndex: number }>;

export const contextualOperatorMappings = [
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

export const compiledContextualOperatorMappings = contextualOperatorMappings
	.map<CompiledContextualOperatorMapping>((mapping, declarationIndex) => ({
		...mapping,
		declarationIndex,
	}))
	.sort(
		(left, right) =>
			right.source.length - left.source.length ||
			left.declarationIndex - right.declarationIndex,
	);

export const contextualOperatorMappingsByInitial = new Map<
	string,
	readonly CompiledContextualOperatorMapping[]
>();

for (const mapping of compiledContextualOperatorMappings) {
	const initial = mapping.source[0];
	const mappings = contextualOperatorMappingsByInitial.get(initial) ?? [];

	contextualOperatorMappingsByInitial.set(initial, [...mappings, mapping]);
}
