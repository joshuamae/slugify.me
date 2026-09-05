import { describe, expect, it } from 'vitest';
import {
	createExceptionMappingApplier,
	type ExceptionMapping,
} from '../slugify';

describe('exception mapping semantics', () => {
	it('applies term mappings only at Unicode letter and number boundaries', () => {
		const apply = createExceptionMappingApplier([
			{ source: 'C#', replacement: 'c-sharp', mode: 'term' },
		]);

		expect(apply('C# sc#ary C#foo 中C#文 1C#')).toBe(
			'c-sharp sc#ary c#foo 中c#文 1c#',
		);
	});

	it('allows reviewed literal mappings inside larger tokens', () => {
		const apply = createExceptionMappingApplier([
			{ source: 'C#', replacement: 'c-sharp', mode: 'literal' },
		]);

		expect(apply('sc#ary')).toBe('sc-sharpary');
	});

	it('escapes regular expression syntax in sources', () => {
		const apply = createExceptionMappingApplier([
			{ source: 'a.b', replacement: 'dot', mode: 'term' },
			{ source: '[x]', replacement: 'bracket-x', mode: 'term' },
		]);

		expect(apply('axb a.b [x]')).toBe('axb dot bracket-x');
	});

	it('chooses the longest canonical source regardless of declaration order', () => {
		const short = {
			source: 'C+',
			replacement: 'short',
			mode: 'term',
		} as const satisfies ExceptionMapping;
		const long = {
			source: 'C++',
			replacement: 'long',
			mode: 'term',
		} as const satisfies ExceptionMapping;

		for (const mappings of [
			[short, long],
			[long, short],
		] as const) {
			expect(createExceptionMappingApplier(mappings)('C++')).toBe('long');
		}
	});

	it('does not rematch generated replacement text', () => {
		const apply = createExceptionMappingApplier([
			{ source: 'alpha', replacement: 'beta', mode: 'term' },
			{ source: 'beta', replacement: 'gamma', mode: 'term' },
		]);

		expect(apply('alpha beta alpha')).toBe('beta gamma beta');
	});

	it('handles repeated original matches independently', () => {
		const mappings = Object.freeze([
			Object.freeze({
				source: 'C++',
				replacement: 'cpp',
				mode: 'term' as const,
			}),
		]);
		const apply = createExceptionMappingApplier(mappings);

		expect(apply('C++ / C++ / C++')).toBe('cpp / cpp / cpp');
		expect(apply('C++')).toBe('cpp');
	});

	it('matches case-insensitively when lowercase forms depend on context', () => {
		const applyTerm = createExceptionMappingApplier([
			{ source: 'Σ', replacement: 'mapped', mode: 'term' },
		]);
		const applyLiteral = createExceptionMappingApplier([
			{ source: 'ΟΣ', replacement: 'mapped', mode: 'literal' },
		]);

		expect(applyTerm('Σ A.Σ Σ.A')).toBe('mapped a.mapped mapped.a');
		expect(applyLiteral('ΟΣ ΟΣΑ')).toBe('mapped mappedα');
	});

	it('does not let replacement text change casing outside the match', () => {
		const applyLiteral = createExceptionMappingApplier([
			{ source: '#', replacement: 'x', mode: 'literal' },
		]);
		const applyTerm = createExceptionMappingApplier([
			{ source: 'C++', replacement: '123', mode: 'term' },
		]);

		expect(applyLiteral('AΣ#')).toBe('aςx');
		expect(applyTerm("AΣ'C++")).toBe("aσ'123");
	});
});

describe('exception mapping validation', () => {
	it.each(['', '\u0301'])('rejects an empty canonical source', (source) => {
		expect(() =>
			createExceptionMappingApplier([
				{ source, replacement: 'valid', mode: 'term' },
			]),
		).toThrow(/source/i);
	});

	it.each([
		'',
		'-bad',
		'bad-',
		'bad--value',
		'bad value',
		'bad/value',
		'Uppercase',
	])('rejects the invalid replacement %j', (replacement) => {
		expect(() =>
			createExceptionMappingApplier([
				{ source: 'valid', replacement, mode: 'term' },
			]),
		).toThrow(/replacement/i);
	});

	const duplicateCases = [
		[
			{ source: 'C++', replacement: 'one', mode: 'term' },
			{ source: 'c++', replacement: 'two', mode: 'term' },
		],
		[
			{ source: 'Café', replacement: 'one', mode: 'term' },
			{ source: 'Cafe\u0301', replacement: 'two', mode: 'term' },
		],
		[
			{ source: 'C#', replacement: 'one', mode: 'term' },
			{ source: 'c#', replacement: 'two', mode: 'literal' },
		],
		[
			{ source: 'Σ', replacement: 'one', mode: 'literal' },
			{ source: 'ς', replacement: 'two', mode: 'literal' },
		],
	] as const satisfies readonly (readonly ExceptionMapping[])[];

	for (const mappings of duplicateCases) {
		it(`rejects duplicate canonical sources for ${JSON.stringify(mappings[0].source)}`, () => {
			expect(() => createExceptionMappingApplier(mappings)).toThrow(
				/duplicate/i,
			);
		});
	}

	it('accepts normalized ASCII and Unicode slug fragments', () => {
		const apply = createExceptionMappingApplier([
			{ source: 'tokyo', replacement: '東京', mode: 'term' },
			{ source: 'C#', replacement: 'c-sharp', mode: 'term' },
		]);

		expect(apply('Tokyo C#')).toBe('東京 c-sharp');
	});
});
