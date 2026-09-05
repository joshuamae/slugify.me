import { describe, expect, it } from 'vitest';
import { slugify } from '../slugify';
import { expectStableSlug, validSlugPattern } from './slugify.test-helpers';

describe('mathematics and computer science notation', () => {
	it.each([
		['n!', 'n-factorial'],
		['n!!', 'n-double-factorial'],
		['(n+1)!', 'n-plus-1-factorial'],
		['2/n!', '2-divided-by-n-factorial'],
		['n!/2', 'n-factorial-divided-by-2'],
		['2/(n+1)!', '2-divided-by-n-plus-1-factorial'],
		['I!', 'i'],
		['A!', 'a'],
		['i!+1', 'i-factorial-plus-1'],
		['Amazing work!', 'amazing-work'],
		['x′', 'x-prime'],
		['f″(x)', 'f-double-prime-x'],
		['x′′', 'x-double-prime'],
		['x‴', 'x-triple-prime'],
		['x⁗', 'x-quadruple-prime'],
		['x′/y′', 'x-prime-divided-by-y-prime'],
		['5′10″', '5-feet-10-inches'],
		['1′1″', '1-foot-1-inch'],
		['|x|', 'absolute-value-x'],
		['|x+1|/2', 'absolute-value-x-plus-1-divided-by-2'],
		['2/|x|', '2-divided-by-absolute-value-x'],
		['||v||', 'norm-v'],
		['‖v‖', 'norm-v'],
		['a|b', 'a-or-b'],
		['| heading |', 'heading'],
		['| hello world |', 'hello-world'],
		['a ? b : c', 'a-then-b-else-c'],
		['a?b?c:d:e', 'a-then-b-then-c-else-d-else-e'],
		['a?(b?c:d):e', 'a-then-b-then-c-else-d-else-e'],
		['ready ? "yes:no" : "no"', 'ready-then-yes-no-else-no'],
		['Is this ready? Answer: no', 'is-this-ready-answer-no'],
		[
			'A guide to operator / useful words',
			'a-guide-to-operator-useful-words',
		],
		['elevator operator - useful work', 'elevator-operator-useful-work'],
		['a ? b\n: c', 'a-b-c'],
		['a ? b', 'a-b'],
		['count--', 'count-decrement'],
		['--i', 'decrement-i'],
		['x=--count', 'x-equals-decrement-count'],
		['--help', 'help'],
		['git --version', 'git-version'],
		['a--b', 'a-b'],
		['1e-3', '1e-3'],
		['5e3', '5e3'],
		['Open 24/7', 'open-24-7'],
		['available 24/7', 'available-24-7'],
		['blood type O-', 'blood-type-o-negative'],
		['blood group AB+', 'blood-group-ab-positive'],
		['grade B−', 'grade-b-minus'],
		['B− grade', 'b-minus-grade'],
		['ʼtis the season', 'tis-the-season'],
		['50‰', '50-per-mille'],
		['2‱', '2-per-ten-thousand'],
		['1°', '1-degree'],
		['30°', '30-degrees'],
		['€5', '5-euros'],
		['£1', '1-pound'],
		['-€5.25', 'negative-5-point-25-euros'],
		['€-5', 'negative-5-euros'],
		['€1,234.50', '1234-point-50-euros'],
		['2/€5', '2-divided-by-5-euros'],
		['€5/2', '5-euros-divided-by-2'],
		['50¢', '50-cents'],
		['1¢', '1-cent'],
		['10¥', '10-yen'],
		['₹10', '10-rupees'],
		['₿0.5', '0-point-5-bitcoin'],
		['--€5', '5'],
		['-€-5', '5'],
		['a€5', 'a-5'],
		['https://x.test/€5', 'https-x-test-5'],
		['Array<𐐀>', 'array-of-𐐨'],
		[
			'<a href="https://example.com/?a=1&b=2">Hello</a>',
			'a-href-https-example-com-a-1-b-2-hello-a',
		],
		['Hello<div>World</div>', 'hello-div-world-div'],
		['Hello<br>World', 'hello-br-world'],
		['Hello<BR/>World', 'hello-br-world'],
		['<div title="a>b">Hello</div>', 'div-title-a-b-hello-div'],
		['a⍳b', 'a-apl-functional-symbol-iota-b'],
		['x⤂y', 'x-leftwards-double-arrow-with-vertical-stroke-y'],
		['x²/y²', 'x-to-the-power-of-2-divided-by-y-to-the-power-of-2'],
		['xⁿ⁺¹', 'x-to-the-power-of-n-plus-1'],
		['ℝⁿ', 'real-numbers-to-the-power-of-n'],
		['√2', 'square-root-2'],
		['∛8', 'cube-root-8'],
		['∜16', 'fourth-root-16'],
		['2+√3', '2-plus-square-root-3'],
		['2/√x', '2-divided-by-square-root-x'],
		['√x/2', 'square-root-x-divided-by-2'],
		['√(x+1)/2', 'square-root-x-plus-1-divided-by-2'],
		['2²', '2-to-the-power-of-2'],
		['10⁻³', '10-to-the-power-of-negative-3'],
		['xⁿ', 'x-to-the-power-of-n'],
		['x₂', 'x-subscript-2'],
		['aₙ', 'a-subscript-n'],
		['log₂(x)', 'log-base-2-x'],
		['m²', 'm-to-the-power-of-2'],
		['H₂O', 'h2o'],
		['CO₂', 'co2'],
		['word²', 'word-superscript-2'],
		['3 × 10⁸', '3-times-10-to-the-power-of-8'],
		['∞', 'infinity'],
		['∅', 'empty-set'],
		['x→∞', 'x-to-infinity'],
		['1/∞', '1-divided-by-infinity'],
		['∞/2', 'infinity-divided-by-2'],
		['x≈y', 'x-approximately-equals-y'],
		['a≡b', 'a-identical-to-b'],
		['a≢b', 'a-not-identical-to-b'],
		['x∝y', 'x-proportional-to-y'],
		['x∈S', 'x-element-of-s'],
		['x∉S', 'x-not-an-element-of-s'],
		['A⊂B', 'a-subset-of-b'],
		['A⊄B', 'a-not-a-subset-of-b'],
		['A⊆B', 'a-subset-of-or-equal-to-b'],
		['A∪B', 'a-union-b'],
		['A∩B', 'a-intersection-b'],
		['A∖B', 'a-set-minus-b'],
		['∀x∈ℝ', 'for-all-x-element-of-real-numbers'],
		['ℝ²', 'real-numbers-to-the-power-of-2'],
		['ℕ', 'natural-numbers'],
		['ℤ', 'integers'],
		['ℚ', 'rational-numbers'],
		['ℂ', 'complex-numbers'],
		['ℍ', 'quaternions'],
		['𝔽', 'field'],
		['ℝandom', 'random'],
		['ℵ₀', 'aleph-subscript-0'],
		['∃x', 'there-exists-x'],
		['∄x', 'there-does-not-exist-x'],
		['¬p', 'not-p'],
		['p∧q', 'p-and-q'],
		['p∨q', 'p-or-q'],
		['p⇒q', 'p-implies-q'],
		['p⇔q', 'p-if-and-only-if-q'],
		['∑i', 'sum-i'],
		['∏x', 'product-x'],
		['∫f(x)dx', 'integral-f-x-dx'],
		['∂f/∂x', 'partial-derivative-f-divided-by-partial-derivative-x'],
		['∇f', 'nabla-f'],
		['a⋅b', 'a-dot-b'],
		['a⊗b', 'a-tensor-product-b'],
		['a⊬b', 'a-does-not-prove-b'],
		['a⊭b', 'a-does-not-model-b'],
		['⌊x⌋', 'floor-x'],
		['⌈x⌉+1', 'ceiling-x-plus-1'],
		['⌊⌈x⌉⌋/2', 'floor-ceiling-x-divided-by-2'],
		['*RRT*', 'rrt'],
		['*IDA*', 'ida'],
		['*LPA*', 'lpa'],
		['RRT* planner', 'rrt-star-planner'],
		['https://x.test/√2', 'https-x-test-2'],
		['<b>√2</b>', 'b-square-root-2-b'],
		['std::vector<int>', 'std-scope-vector-of-int'],
		[
			'std::vector<std::vector<int>>',
			'std-scope-vector-of-std-scope-vector-of-int',
		],
		[
			'std::vector<int>::iterator',
			'std-scope-vector-of-int-scope-iterator',
		],
		['Map<K, V>', 'map-of-k-v'],
		['Promise<Result<T,E>>', 'promise-of-result-of-t-e'],
		['a<b>c', 'a-less-than-b-greater-than-c'],
		['https://x.test/List<T>', 'https-x-test-list-t'],
		['a ?? b', 'a-nullish-coalescing-b'],
		['a ??= b', 'a-nullish-coalescing-equals-b'],
		['a?.b', 'a-optional-chain-b'],
		['x << 2', 'x-left-shift-2'],
		['x >> 2', 'x-right-shift-2'],
		['x >>> 2', 'x-unsigned-right-shift-2'],
		['x <<= 2', 'x-left-shift-equals-2'],
		['x >>= 2', 'x-right-shift-equals-2'],
		['x >>>= 2', 'x-unsigned-right-shift-equals-2'],
		['a <=> b', 'a-three-way-compare-b'],
		['a := b', 'a-assigned-to-b'],
		['x -> y', 'x-arrow-y'],
		['x => y', 'x-arrow-y'],
		['x <- y', 'x-left-arrow-y'],
		['x <-> y', 'x-bidirectional-arrow-y'],
		['a &&= b', 'a-and-equals-b'],
		['a ||= b', 'a-or-equals-b'],
		['a =~ b', 'a-matches-b'],
		['a !~ b', 'a-does-not-match-b'],
		['10//3', '10-floor-divided-by-3'],
		['a // b', 'a-floor-divided-by-b'],
		['10//=3', '10-floor-divided-by-equals-3'],
		['1..10', '1-range-10'],
		['1..=10', '1-inclusive-range-10'],
		['1..<10', '1-exclusive-range-10'],
		['1...10', '1-ellipsis-10'],
		['a...b', 'a-b'],
		['10::30', '10-30'],
		['?? operator', 'nullish-coalescing-operator'],
		['?: operator', 'conditional-operator'],
		['[] operator', 'subscript-operator'],
		['() operator', 'call-operator'],
		['... operator', 'spread-operator'],
		['-- operator', 'decrement-operator'],
		['std::operator<<', 'std-scope-operator-left-shift'],
		['the - operator', 'the-minus-operator'],
		['English - operators', 'english-operators'],
	] as const)('retains the notation in %j', (input, expected) =>
		expectStableSlug(input, expected),
	);

	it.each([
		'≢',
		'≁',
		'≄',
		'≇',
		'≉',
		'∉',
		'∌',
		'∄',
		'⊄',
		'⊅',
		'⊈',
		'⊉',
		'⊬',
		'⊭',
		'⊮',
		'⊯',
		'↚',
		'↛',
		'⇍',
		'⇎',
		'⇏',
	])('preserves the composed and decomposed negation %s', (symbol) => {
		const composed = slugify(`a${symbol}b`);
		expect(composed).toBe(slugify(`a${symbol.normalize('NFD')}b`));
		expect(composed).not.toBe(
			slugify(`a${symbol.normalize('NFD').replace(/\p{M}/gu, '')}b`),
		);
	});

	it('covers assigned mathematical symbols across the supported Unicode blocks', () => {
		let covered = 0;
		for (const [first, last] of [
			[0x2190, 0x21ff],
			[0x2200, 0x22ff],
			[0x27c0, 0x27ef],
			[0x27f0, 0x297f],
			[0x2980, 0x29ff],
			[0x2a00, 0x2aff],
			[0x2b30, 0x2b4c],
		]) {
			for (let codePoint = first; codePoint <= last; codePoint += 1) {
				const symbol = String.fromCodePoint(codePoint);
				if (!/\p{Sm}/u.test(symbol)) continue;
				const slug = slugify(`a${symbol}b`);
				expect(slug).toMatch(validSlugPattern);
				expect(slug).not.toBe('a-b');
				expect(slugify(slug)).toBe(slug);
				covered += 1;
			}
		}
		expect(covered).toBeGreaterThan(700);
	});

	it('preserves supplemental arrows and APL symbols without losing negation or astral boundaries', () => {
		for (const [first, last] of [
			[0x2336, 0x237a],
			[0x1f800, 0x1f8ff],
		]) {
			for (let codePoint = first; codePoint <= last; codePoint += 1) {
				const symbol = String.fromCodePoint(codePoint);
				if (!/[\p{Sm}\p{So}]/u.test(symbol)) continue;
				const slug = slugify(`x${symbol}y`);
				expect(slug).not.toBe('x-y');
				expect(slug).toMatch(validSlugPattern);
				expect(slugify(slug)).toBe(slug);
				expect(slugify(`x${symbol.normalize('NFD')}y`)).toBe(slug);
			}
		}
	});

	it('keeps mixed mathematical, prose, and code notation valid and idempotent', () => {
		const tokens = [
			'√',
			'x²',
			'y′',
			'∞',
			'∉',
			'ℝ',
			'⤂',
			'⍳',
			'€5',
			'||v||',
			'n!',
			'A+',
			'hello',
			'東京',
			'?.',
			'??',
			'::',
			'->',
			'--',
			' / ',
			' - ',
			' ',
			'\n',
			'?',
			':',
			'<',
			'>',
		];
		let seed = 71;
		for (let sample = 0; sample < 1500; sample += 1) {
			let value = '';
			for (let index = 0; index < 12; index += 1) {
				seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
				value += tokens[seed % tokens.length];
			}
			const slug = slugify(value);
			expect(slug, value).toMatch(validSlugPattern);
			expect(slugify(slug), value).toBe(slug);
		}
	});

	it('handles deep notation and unterminated quoted spans without recursive parsing', () => {
		for (const value of [
			`${'Array<'.repeat(5000)}X${'>'.repeat(5000)}`,
			`${'a?'.repeat(5000)}b${':c'.repeat(5000)}`,
			`${'('.repeat(5000)}n${')!'.repeat(5000)}`,
			`"${'x\\"'.repeat(20_000)}`,
		]) {
			const slug = slugify(value);
			expect(slug).not.toBe('');
			expect(slug).toMatch(validSlugPattern);
			expect(slugify(slug)).toBe(slug);
		}
	});
});
