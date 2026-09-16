import {
	escapeRegExp,
	getCodePointAt,
	getCodePointBefore,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	type ExceptionMapping,
	exceptionMappings,
	type ExceptionMatchMode,
} from './data/reviewed-terms';
import { normalizeForSlug } from './normalization';

const VALID_REPLACEMENT_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

type CompiledExceptionMapping = Readonly<{
	replacement: string;
	mode: ExceptionMatchMode;
	matcher: RegExp;
	length: number;
	declarationIndex: number;
}>;

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

export const applyExceptionMappings = createExceptionMappingApplier(
	exceptionMappings.filter(({ source }) => !source.endsWith('*')),
);

// Bare postfix-star names must not steal the closing delimiter in *RRT*.
// Replacement fragments contain no stars, so the two groups cannot cascade.
export const applyPostfixTermMappings = createExceptionMappingApplier(
	exceptionMappings.filter(({ source }) => source.endsWith('*')),
);
