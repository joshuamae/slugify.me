import { preserveGenericTypes } from './slugify/code-notation';
import { preserveUnicodeMeaning } from './slugify/english-notation';
import { applyExceptionMappings } from './slugify/exceptions';
import { preserveMathNotation } from './slugify/math-notation';
import { finalizeSlug } from './slugify/normalization';
import { escapeOperandMarkers } from './slugify/operand-markers';
import { applyContextualSymbolMappings } from './slugify/operators';
import { applyStructuredSymbolContexts } from './slugify/structured-notation';

export { createExceptionMappingApplier } from './slugify/exceptions';
export type {
	ExceptionMapping,
	ExceptionMatchMode,
} from './slugify/data/reviewed-terms';

/**
 * Converts text to a lowercase, hyphen-separated slug.
 */
export function slugify(input: string): string {
	// Reserve internal operand markers so pasted control characters cannot forge context.
	const escaped = escapeOperandMarkers(input);
	// Preserve notation before exception matching performs compatibility normalization.
	const generics = preserveGenericTypes(escaped);
	const math = preserveMathNotation(generics);
	const unicode = preserveUnicodeMeaning(math);
	const terms = applyExceptionMappings(unicode);
	// Resolve protected spans and numeric operands before interpreting operators.
	const structured = applyStructuredSymbolContexts(terms);
	return finalizeSlug(applyContextualSymbolMappings(structured));
}
