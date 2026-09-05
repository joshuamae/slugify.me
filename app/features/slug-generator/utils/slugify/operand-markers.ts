export const EMPHASIS_NUMERIC_BOUNDARY = '\u0000';

export const SEMANTIC_NUMERIC_OPERAND_BOUNDARY = '\u0001';

export const EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY = '\u0002';

export const EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY = '\u0003';

export const EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY = '\u0004';

export const EMPHASIS_NUMERIC_BOUNDARY_ESCAPE = '\ufffd';

// Paired ternaries remain expression boundaries until operators are rendered.
export const CONDITIONAL_THEN_BOUNDARY = '\u0005';
export const CONDITIONAL_ELSE_BOUNDARY = '\u0006';

export function isConditionalBoundary(character: string | undefined): boolean {
	return (
		character === CONDITIONAL_THEN_BOUNDARY ||
		character === CONDITIONAL_ELSE_BOUNDARY
	);
}

/** Pasted control characters cannot impersonate internal notation boundaries. */
export function escapeOperandMarkers(input: string): string {
	return Array.from(input, (character) =>
		character.charCodeAt(0) <= 6
			? EMPHASIS_NUMERIC_BOUNDARY_ESCAPE
			: character,
	).join('');
}

/** Extend a rule's first boundary character class with the reserved ternary markers. */
export function withConditionalBoundaries(pattern: RegExp): RegExp {
	const end = pattern.source.indexOf(']');
	return new RegExp(
		`${pattern.source.slice(0, end)}${CONDITIONAL_THEN_BOUNDARY}${CONDITIONAL_ELSE_BOUNDARY}${pattern.source.slice(end)}`,
		pattern.flags,
	);
}

export function isGeneratedEmphasisBoundary(character: string): boolean {
	return (
		character === EMPHASIS_NUMERIC_BOUNDARY ||
		character === EMPHASIS_NUMERIC_EXPRESSION_BOUNDARY ||
		character === EMPHASIS_POSITIVE_NUMERIC_EXPRESSION_BOUNDARY ||
		character === EMPHASIS_NEGATIVE_NUMERIC_EXPRESSION_BOUNDARY
	);
}
