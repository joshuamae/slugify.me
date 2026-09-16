import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify';

const validSlug = /^(?:[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)?$/u;

function expectSlug(input: string, expected: string) {
	const result = slugify(input);
	expect(result).toBe(expected);
	expect(result).toMatch(validSlug);
	expect(slugify(result)).toBe(result);
}

describe('notation rules working together', () => {
	it.each([
		['a ? -5 : 5', 'a-then-negative-5-else-5'],
		['a?-5:+5', 'a-then-negative-5-else-positive-5'],
		['a?b:-5', 'a-then-b-else-negative-5'],
		[
			'a ? -5.25 : +12.5',
			'a-then-negative-5-point-25-else-positive-12-point-5',
		],
		['a ? -$5 : +€5', 'a-then-negative-5-dollars-else-positive-5-euros'],
		['a ? -50% : +2', 'a-then-negative-50-percent-else-positive-2'],
		[
			'a ? (b ? -1 : +2) : -3',
			'a-then-b-then-negative-1-else-positive-2-else-negative-3',
		],
		['a?--b:--c', 'a-then-decrement-b-else-decrement-c'],
		['a ? b\n: -5', 'a-b-5'],
		['Is this ready? Answer: no', 'is-this-ready-answer-no'],
	] as const)('retains expression context in %j', expectSlug);

	it.each([
		['2+€5', '2-plus-5-euros'],
		['€5+€2', '5-euros-plus-2-euros'],
		['2 + €5', '2-plus-5-euros'],
		['2+-€5', '2-plus-negative-5-euros'],
		['2+£5', '2-plus-5-pounds'],
		['2+50¢', '2-plus-50-cents'],
		['2*½', '2-times-one-half'],
		['½*2', 'one-half-times-2'],
		['½+2', 'one-half-plus-2'],
		['½/2', 'one-half-divided-by-2'],
		['2/½', '2-divided-by-one-half'],
		['2×½', '2-times-one-half'],
		['½ + ½', 'one-half-plus-one-half'],
		['1½+2', '1-and-one-half-plus-2'],
		['-2½ cups', 'negative-2-and-one-half-cups'],
		['2*1⁄2', '2-times-one-half'],
		['2*1/2 cup', '2-times-one-half-cup'],
		['2* ½', '2-one-half'],
		['--€5', '5'],
		['-€-5', '5'],
		['https://x.test/½+€5', 'https-x-test-1-2-5'],
	] as const)('retains numeric operands in %j', expectSlug);

	it.each([
		['αβ - γδ', 'αβ-γδ'],
		['αβ / γδ', 'αβ-γδ'],
		['東京 / 大阪', '東京-大阪'],
		['𐐀𐐁 - 𐐂𐐃', '𐐨𐐩-𐐪𐐫'],
		['α / β', 'α-divided-by-β'],
		['𐐀 / 𐐁', '𐐨-divided-by-𐐩'],
		['x - y', 'x-minus-y'],
		['foo2 / bar3', 'foo2-divided-by-bar3'],
		['2^-3', '2-to-the-power-of-negative-3'],
		['2^+3', '2-to-the-power-of-positive-3'],
		['2 ^ -3', '2-to-the-power-of-negative-3'],
		[
			'-$5\n2!+ $-3',
			'negative-5-dollars-2-factorial-plus-negative-3-dollars',
		],
		[
			'-$5\n(2%)+ $-3',
			'negative-5-dollars-2-percent-plus-negative-3-dollars',
		],
		[
			'-$5\n(5*)+ $-3',
			'negative-5-dollars-5-stars-plus-negative-3-dollars',
		],
		[
			'-$5\n2! ==$-3',
			'negative-5-dollars-2-factorial-equals-negative-3-dollars',
		],
	] as const)('covers PR review cases in %j', expectSlug);
});
