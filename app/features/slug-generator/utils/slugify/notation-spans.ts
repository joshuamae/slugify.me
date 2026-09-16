import {
	CONDITIONAL_ELSE_BOUNDARY,
	CONDITIONAL_THEN_BOUNDARY,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';

/** Offsets always refer to the unchanged source inspected by a recognition pass. */
export type NotationSpan = Readonly<{ start: number; end: number }> &
	(
		| Readonly<{ kind: 'numeric'; reading: string; sign?: '+' | '-' }>
		| Readonly<{ kind: 'conditional'; branch: 'then' | 'else' }>
		| Readonly<{ kind: 'text'; reading: string }>
	);

/** Keep semantic boundaries until the operator pass; never add artificial padding. */
function encodeSpan(span: NotationSpan): string {
	if (span.kind === 'text') return span.reading;
	if (span.kind === 'conditional') {
		return span.branch === 'then'
			? CONDITIONAL_THEN_BOUNDARY
			: CONDITIONAL_ELSE_BOUNDARY;
	}
	const sign =
		span.sign === '-' ? 'negative-' : span.sign === '+' ? 'positive-' : '';
	return `${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${sign}${span.reading}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
}

/** Apply disjoint recognized spans together so expanding one cannot shift another. */
export function replaceNotationSpans(
	source: string,
	spans: readonly NotationSpan[],
): string {
	const output: string[] = [];
	let cursor = 0;
	for (const span of [...spans].sort(
		(left, right) => left.start - right.start,
	)) {
		if (
			span.start < cursor ||
			span.end <= span.start ||
			span.end > source.length
		) {
			throw new Error(
				'Notation spans must be disjoint and inside their source',
			);
		}
		output.push(source.slice(cursor, span.start), encodeSpan(span));
		cursor = span.end;
	}
	output.push(source.slice(cursor));
	return output.join('');
}
