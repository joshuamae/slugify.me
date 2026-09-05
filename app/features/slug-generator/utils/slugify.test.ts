import { describe, expect, it } from 'vitest';

import {
	createExceptionMappingApplier,
	slugify,
	type ExceptionMapping,
} from './slugify';

const validSlugPattern = /^(?:[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)?$/u;

function expectStableSlug(input: string, expected: string): void {
	const actual = slugify(input);

	expect(actual).toBe(expected);
	expect(actual).toMatch(validSlugPattern);
	expect(slugify(actual)).toBe(actual);
}

const cases = [
	['', ''],
	['   ', ''],
	['---___', ''],
	['Hello World', 'hello-world'],
	['HELLO WORLD', 'hello-world'],
	['Hello, world!!!', 'hello-world'],
	['one---two___three', 'one-two-three'],
	['---hello-world___', 'hello-world'],
	['already-slugified', 'already-slugified'],
	['release-1-2', 'release-1-2'],
	['Crème brûlée', 'creme-brulee'],
	['東京 2026', '東京-2026'],
	['한국어', '한국어'.normalize('NFKD')],
	['٢٠٢٦-٠٩-٠٢', '٢٠٢٦-٠٩-٠٢'],
	["don't", 'dont'],
	['#tag', 'tag'],
	['@user', 'user'],
	['$55', '55-dollars'],
	['100% sure', '100-percent-sure'],
	['1 + 2 = 3', '1-plus-2-equals-3'],
	['10/2=5', '10-divided-by-2-equals-5'],
	['10:30', '10-30'],
	['a(b)c', 'a-b-c'],
	['C++', 'cpp'],
	['C#', 'c-sharp'],
	['Learn C++ Today!', 'learn-cpp-today'],
	['C# + C++', 'c-sharp-plus-cpp'],
	['C++ and C++', 'cpp-and-cpp'],
	['(C++), [C#]', 'cpp-c-sharp'],
	['c++ C++ c# C#', 'cpp-cpp-c-sharp-c-sharp'],
	['sc#ary', 'sc-ary'],
	['XC++', 'xc-increment'],
	['C++Primer', 'c-primer'],
	['C#foo', 'c-foo'],
	['中C++文', '中c-文'],
	['λC++', 'λc-increment'],
	['C++β', 'c-β'],
	['1C++', '1c-increment'],
	['C++2', 'c-2'],
	['١C++', '١c-increment'],
	['C++٢', 'c-٢'],
	['e\u0301C++', 'ec-increment'],
	['C++\u0301e', 'c-e'],
] as const;

describe('slugify', () => {
	for (const [input, expected] of cases) {
		it(`converts ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
			expectStableSlug(input, expected);
		});
	}

	it('handles a long separator run without changing its meaning', () => {
		expect(slugify(`a${' '.repeat(20_000)}b`)).toBe('a-b');
	});
});

describe('contextual symbol grammar', () => {
	const structuredCases = [
		['I am your #1 fan', 'i-am-your-number-1-fan'],
		['#1', 'number-1'],
		['# 1', 'number-1'],
		['Issue #12', 'issue-number-12'],
		['#tag', 'tag'],
		['version#1', 'version-1'],
		['C#1', 'c-1'],
		['##1', '1'],
		['abc #1def', 'abc-1def'],
		['A* algorithm', 'a-star-algorithm'],
		['a* algorithm', 'a-star-algorithm'],
		['A*', 'a-star'],
		['Learn A* Search', 'learn-a-star-search'],
		['Grade A*.', 'grade-a-star'],
		['A*!', 'a-star'],
		['(A*)', 'a-star'],
		['A* student', 'a-star-student'],
		['A* + C++', 'a-star-plus-cpp'],
		['5*', '5-stars'],
		['1*', '1-star'],
		['1.0*', '1-point-0-star'],
		['0*', '0-stars'],
		['rated 5*', 'rated-5-stars'],
		['What a 5*!', 'what-a-5-stars'],
		['5* rating', '5-stars-rating'],
		['4.5*', '4-point-5-stars'],
		['1,000*', '1000-stars'],
		['(5*)', '5-stars'],
		['#5*', 'number-5-stars'],
		['-5*', 'negative-5-stars'],
		['5* + 4*', '5-stars-plus-4-stars'],
		['$1', '1-dollar'],
		['$01', '01-dollar'],
		['$001.00', '001-point-00-dollar'],
		['$1.00', '1-point-00-dollar'],
		['$25', '25-dollars'],
		['$1,234.50', '1234-point-50-dollars'],
		['cost$25', 'cost-25-dollars'],
		['$name', 'name'],
		['-$5', 'negative-5-dollars'],
		['$-5', 'negative-5-dollars'],
		['$-01', 'negative-01-dollar'],
		['+$1', 'positive-1-dollar'],
		['$+1', 'positive-1-dollar'],
		['cost - $5', 'cost-minus-5-dollars'],
		['$١', '١'],
		['$١.٠٠', '١-point-٠٠'],
		['$1٢', '1٢'],
		['$1٫00', '1-00'],
		['$1٬000', '1-000'],
		['-$1٢', '1٢'],
		['$-1٢', '1٢'],
		['$-1٬000', '1-000'],
		['$$25', '25'],
		['$1,23', '1-23'],
		['1,234,567', '1234567'],
		['12,34', '12-34'],
		['12.5', '12-point-5'],
		['127.0.0.1', '127-dot-0-dot-0-dot-1'],
		['50%', '50-percent'],
		['50% off', '50-percent-off'],
		['50 % off', '50-percent-off'],
		['50%off', '50-percent-off'],
		['10%3', '10-modulo-3'],
		['10 % 3', '10-modulo-3'],
		['10% 3', '10-3'],
		['x%y', 'x-y'],
		['rock & roll', 'rock-and-roll'],
		['user@example.com', 'user-at-example-dot-com'],
		['user+tag@example.co.uk', 'user-plus-tag-at-example-dot-co-dot-uk'],
		['a..b@c.com', 'a-b-at-c-com'],
		['a@b-.com', 'a-at-b-com'],
		[
			'user@example.com+other@example.com',
			'user-at-example-dot-com-plus-other-at-example-dot-com',
		],
		['9/2/2026', '9-2-2026'],
		['2026/09/02', '2026-09-02'],
		['1/2/3', '1-divided-by-2-divided-by-3'],
		['100/10/2=5', '100-divided-by-10-divided-by-2-equals-5'],
		['10/2', '10-divided-by-2'],
		['10:30', '10-30'],
		['1 - 2', '1-minus-2'],
		['1-2', '1-2'],
		['+5', 'positive-5'],
		['-5', 'negative-5'],
		['+ 5', 'positive-5'],
		['- 5', 'negative-5'],
		['~5', 'approximately-5'],
		['~ 5', 'approximately-5'],
		['!ready', 'not-ready'],
		['if !ready', 'if-ready'],
		['! important', 'important'],
		['Look: !Important', 'look-important'],
		['a!!b', 'a-b'],
		['a&&!b', 'a-and-not-b'],
		['a && !b', 'a-and-not-b'],
		['5!', '5-factorial'],
		['Top 5!', 'top-5'],
		['Score: 5!', 'score-5'],
		['What? 5!', 'what-5'],
		['5!+2', '5-factorial-plus-2'],
		['3*5!', '3-times-5-factorial'],
		['(5!)', '5-factorial'],
		['(5)!', '5-factorial'],
		['(1+2)!', '1-plus-2'],
		['5!=120', '5-not-equals-120'],
		['5! = 120', '5-factorial-equals-120'],
		['5! - 3', '5-factorial-minus-3'],
		['3 - 5!', '3-minus-5-factorial'],
		['x++', 'x-increment'],
		['++x', 'increment-x'],
		['count++', 'count-increment'],
		['metric++', 'metric-increment'],
		['(x)++', 'x-increment'],
		['++(x)', 'increment-x'],
		['array[i]++', 'array-i-increment'],
		['a++b', 'a-b'],
		['x++++', 'x'],
		['C++++', 'cpp-increment'],
		['a?b:c', 'a-then-b-else-c'],
		['What?', 'what'],
		['"Quoted" (text)', 'quoted-text'],
		['*bold*', 'bold'],
		['<div>text</div>', 'div-text-div'],
		['text<strong>bold</strong>end', 'text-strong-bold-strong-end'],
		['<b>x</b> + y', 'b-x-b-plus-y'],
		['hello<br>world', 'hello-br-world'],
		['hello<img src="x">world', 'hello-img-src-x-world'],
		['a<b>c', 'a-less-than-b-greater-than-c'],
		['https://x.test/a+b?q=a=b&x=y#top', 'https-x-test-a-b-q-a-b-x-y-top'],
		['www.example.com?q=a&x=b', 'www-example-com-q-a-x-b'],
		['~/.config', 'config'],
		['C+++D', 'cpp-plus-d'],
		['C# + C++', 'c-sharp-plus-cpp'],
		['١+٢=٣', '١-plus-٢-equals-٣'],
		['東京&大阪', '東京-and-大阪'],
		['１＋１＝２', '1-plus-1-equals-2'],
		['＃１ ＄２５ ５０％', 'number-1-25-dollars-50-percent'],
		['Ａ＊ algorithm', 'a-star-algorithm'],
		['𝔸﹡ algorithm', 'a-star-algorithm'],
		['A\u0301* algorithm', 'a-star-algorithm'],
		['５＊', '5-stars'],
		['𝟝﹡', '5-stars'],
		['٥*', '٥-stars'],
		['١*', '١-star'],
		['۱*', '۱-star'],
		['१*', '१-star'],
		['𞥑*', '𞥑-star'],
		['١.٠*', '١-point-٠-star'],
		['𐐀++', '𐐨-increment'],
		['++𐐀', 'increment-𐐨'],
		['𐐀++𐐁', '𐐨-𐐩'],
		['𞥑!', '𞥑-factorial'],
		['𐐀$-1𐐁', '𐐨-negative-1-dollar-𐐩'],
		['e\u0301+1', 'e-plus-1'],
		['e.g. this', 'e-g-this'],
		['Dr.Smith', 'dr-smith'],
		['U.S.A.', 'u-s-a'],
		['Hello.World', 'hello-world'],
	] as const;

	for (const [input, expected] of structuredCases) {
		it(`speaks ${JSON.stringify(input)} as ${JSON.stringify(expected)}`, () => {
			expectStableSlug(input, expected);
		});
	}

	const operatorCases = [
		['a===b', 'a-strictly-equals-b'],
		['a!==b', 'a-strictly-not-equals-b'],
		['a**=b', 'a-to-the-power-of-equals-b'],
		['a==b', 'a-equals-b'],
		['a!=b', 'a-not-equals-b'],
		['a<>b', 'a-not-equals-b'],
		['a<=b', 'a-less-than-or-equal-to-b'],
		['a>=b', 'a-greater-than-or-equal-to-b'],
		['a&&b', 'a-and-b'],
		['a||b', 'a-or-b'],
		['2**3', '2-to-the-power-of-3'],
		['a+=b', 'a-plus-equals-b'],
		['a-=b', 'a-minus-equals-b'],
		['a*=b', 'a-times-equals-b'],
		['a/=b', 'a-divided-by-equals-b'],
		['a%=b', 'a-modulo-equals-b'],
		['a&=b', 'a-and-equals-b'],
		['a|=b', 'a-or-equals-b'],
		['a^=b', 'a-xor-equals-b'],
		['a+b', 'a-plus-b'],
		['a=b', 'a-equals-b'],
		['a*b', 'a-times-b'],
		['A*B', 'a-times-b'],
		['A*(B)', 'a-times-b'],
		['A**B', 'a-to-the-power-of-b'],
		['A*=B', 'a-times-equals-b'],
		['2*A*', '2-times-a-star'],
		['2*5*', '2-times-5-stars'],
		['A*A*', 'a-times-a-star'],
		['5*5*', '5-times-5-stars'],
		['5**5*', '5-to-the-power-of-5-stars'],
		['5*2', '5-times-2'],
		['5 * 2', '5-times-2'],
		['5*rating', '5-times-rating'],
		['5*(2)', '5-times-2'],
		['5*+2', '5-times-positive-2'],
		['5*-2', '5-times-negative-2'],
		['5*+ 2', '5-times-positive-2'],
		['5*- 2', '5-times-negative-2'],
		['5* +2', '5-times-positive-2'],
		['5* -2', '5-times-negative-2'],
		['5* + 2', '5-stars-plus-2'],
		['5* - 2', '5-stars-minus-2'],
		['5*!ready', '5-times-not-ready'],
		['A*>=B', 'a-star-greater-than-or-equal-to-b'],
		['5*>=4*', '5-stars-greater-than-or-equal-to-4-stars'],
		['A*==A*', 'a-star-equals-a-star'],
		['2*$1,000', '2-times-1000-dollars'],
		['2*$-1,000', '2-times-negative-1000-dollars'],
		['a&b', 'a-and-b'],
		['a|b', 'a-or-b'],
		['a<b', 'a-less-than-b'],
		['a>b', 'a-greater-than-b'],
		['a@b', 'a-at-b'],
		['a / b', 'a-divided-by-b'],
		['2^3', '2-to-the-power-of-3'],
		['a^b', 'a-xor-b'],
		['$1+$2', '1-dollar-plus-2-dollars'],
		['$1>=2', '1-dollar-greater-than-or-equal-to-2'],
		['50%+5', '50-percent-plus-5'],
		['2%-5', '2-modulo-negative-5'],
		['2 % -5', '2-modulo-negative-5'],
		['2%-5!', '2-modulo-negative-5-factorial'],
		['2%(-5)', '2-modulo-negative-5'],
		['2 % (-5)', '2-modulo-negative-5'],
		['2%$-5', '2-modulo-negative-5-dollars'],
		['2 % $ - 5', '2-modulo-negative-5-dollars'],
		['2%(5)', '2-modulo-5'],
		['2 % (5)', '2-modulo-5'],
		['2%{5!}', '2-modulo-5-factorial'],
		['2%($5)', '2-modulo-5-dollars'],
		['2%(50%)', '2-modulo-50-percent'],
		['a%-5!', 'a-5'],
		['50% - 3', '50-percent-minus-3'],
		['50% - $3', '50-percent-minus-3-dollars'],
		['50% - 25%', '50-percent-minus-25-percent'],
		['50% - 4!', '50-percent-minus-4-factorial'],
		['50% - 4*', '50-percent-minus-4-stars'],
		['50% + 10%', '50-percent-plus-10-percent'],
		['12.5%+7.5%', '12-point-5-percent-plus-7-point-5-percent'],
		['50%==1', '50-percent-equals-1'],
		['50%===1', '50-percent-strictly-equals-1'],
		['50% = 1', '50-percent-equals-1'],
		['100%==100%', '100-percent-equals-100-percent'],
		['x=-5', 'x-equals-negative-5'],
		['x=+5', 'x-equals-positive-5'],
		['2==-5', '2-equals-negative-5'],
		['2 == -5', '2-equals-negative-5'],
		['2 ==-5', '2-equals-negative-5'],
		['2== -5', '2-equals-negative-5'],
		['2 != -5', '2-not-equals-negative-5'],
		['2 !== -5', '2-strictly-not-equals-negative-5'],
		['2 >= -5', '2-greater-than-or-equal-to-negative-5'],
		['2 && -5', '2-and-negative-5'],
		['2 &&-5', '2-and-negative-5'],
		['2&& -5', '2-and-negative-5'],
		['2 || -5', '2-or-negative-5'],
		['2 ** -5', '2-to-the-power-of-negative-5'],
		['2 /-5', '2-divided-by-negative-5'],
		['2/ -5', '2-divided-by-negative-5'],
		['2 %-5', '2-modulo-negative-5'],
		['2% -5', '2-modulo-negative-5'],
		['x= -$5', 'x-equals-negative-5-dollars'],
		['x= $ - 5', 'x-equals-negative-5-dollars'],
		['2 == -$5', '2-equals-negative-5-dollars'],
		['2 ==-$5', '2-equals-negative-5-dollars'],
		['2== -$5', '2-equals-negative-5-dollars'],
		['2 ==$-5', '2-equals-negative-5-dollars'],
		['2== $-5', '2-equals-negative-5-dollars'],
		['2 !== $-5', '2-strictly-not-equals-negative-5-dollars'],
		['2 >= -$5', '2-greater-than-or-equal-to-negative-5-dollars'],
		['2 && -$5', '2-and-negative-5-dollars'],
		['2 ** $-5', '2-to-the-power-of-negative-5-dollars'],
		['cost is -$5', 'cost-is-negative-5-dollars'],
		['change was +$5', 'change-was-positive-5-dollars'],
		['2*-3', '2-times-negative-3'],
		['2/-3', '2-divided-by-negative-3'],
		['2^-3', '2-to-the-power-of-negative-3'],
		['1+-2', '1-plus-negative-2'],
		['-5+2', 'negative-5-plus-2'],
		['(1+2)*3', '1-plus-2-times-3'],
		['1*(2+3)', '1-times-2-plus-3'],
		['1%=2', '1-modulo-equals-2'],
		['١%=٢', '١-modulo-equals-٢'],
		['x++!=y', 'x-increment-not-equals-y'],
		['x++!==y', 'x-increment-strictly-not-equals-y'],
		['x++>=y', 'x-increment-greater-than-or-equal-to-y'],
	] as const;

	for (const [input, expected] of operatorCases) {
		it(`uses longest operator semantics for ${JSON.stringify(input)}`, () => {
			expectStableSlug(input, expected);
		});
	}

	it.each([
		['1+ 1', '1-1'],
		['1 +1', '1-1'],
		['a/b', 'a-b'],
		['a\\b', 'a-b'],
		['a \\ b', 'a-b'],
		['release-1-2', 'release-1-2'],
		['a====b', 'a-b'],
		['a&&&b', 'a-b'],
		['1++2', '1-2'],
		['a>>>=b', 'a-unsigned-right-shift-equals-b'],
		['a<<=b', 'a-left-shift-equals-b'],
		['a=>b', 'a-arrow-b'],
		['a->b', 'a-arrow-b'],
		['a::b', 'a-scope-b'],
		['a??b', 'a-nullish-coalescing-b'],
		['a?.b', 'a-optional-chain-b'],
		['a|>b', 'a-b'],
		['a~=b', 'a-b'],
		['<b>x</b>+y', 'b-x-b-y'],
		['A* (B)', 'a-b'],
		['AA*', 'aa'],
		['*A*', 'a'],
		['**A**', 'a'],
		['A**', 'a'],
		['A***', 'a'],
		['*A**', 'a'],
		['**A*', 'a'],
		['5* 2', '5-2'],
		['*5*', '5'],
		['**5**', '5'],
		['5**', '5'],
		['5***', '5'],
		['*5**', '5'],
		['**5*', '5'],
		['.5*', '5'],
		['5.*', '5'],
		['12,34*', '12-34'],
		['12,,34*', '12-34'],
		['1.2.3*', '1-dot-2-dot-3'],
		['v5*', 'v5'],
		['5e3*', '5e3'],
		['5e-3*', '5e-3'],
		['1e--3*', '1e-3'],
		['5E+3*', '5e-plus-3'],
		['0x-5*', '0x-5'],
		['0x--5*', '0x-5'],
		['9/2/2026*', '9-2-2026'],
		['9/2//2026*', '9-divided-by-2-floor-divided-by-2026-stars'],
		['2026/09/02*', '2026-09-02'],
		['10:30*', '10-30'],
		['10::30*', '10-30'],
		['$5*', '5-dollars'],
		['$ 5*', '5-dollars'],
		['$ + 5*', 'positive-5-dollars'],
		['$ - 5*', 'negative-5-dollars'],
		['+ $ 5*', 'positive-5-dollars'],
		['- $ 5*', 'negative-5-dollars'],
		['A∗', 'a-asterisk-operator'],
		['5★', '5'],
		['Top-5!', 'top-5'],
		['release-5!', 'release-5'],
		['(5]!', '5'],
		['[5)!', '5'],
		['(5))!', '5'],
		['x)++', 'x'],
		['(x]++', 'x'],
		['x]]++', 'x'],
		['++((x', 'x'],
		['++$5', '5-dollars'],
		['+++$5', '5-dollars'],
		['--$5', '5-dollars'],
		['foo--$5', 'foo-5-dollars'],
	] as const)(
		'uses reviewed operator or fallback semantics for %j',
		(input, expected) => {
			expectStableSlug(input, expected);
		},
	);

	it.each([
		['foo,5*', 'foo-5-stars'],
		['A*,5*', 'a-star-5-stars'],
		['1*,2*', '1-star-2-stars'],
		['*rated 5*', 'rated-5'],
		['This is *rated 5* text', 'this-is-rated-5-text'],
		['*score 1*', 'score-1'],
		['*algorithm A*', 'algorithm-a'],
		['*2+2*', '2-plus-2'],
		['2* -1', '2-times-negative-1'],
		['A* -1', 'a-times-negative-1'],
		['2* -1,000*', '2-times-negative-1000-stars'],
		['2* -$5', '2-times-negative-5-dollars'],
		['2* $-5', '2-times-negative-5-dollars'],
		['2* - $5', '2-stars-minus-5-dollars'],
		['2* $ - 5', '2-times-negative-5-dollars'],
		['5* + $5', '5-stars-plus-5-dollars'],
		['5* +$5', '5-times-positive-5-dollars'],
		['5 * + $5', '5-times-positive-5-dollars'],
		['1+ +$5', '1-5-dollars'],
		['*2*3*', '2-times-3'],
		['*2**3*', '2-to-the-power-of-3'],
		['*2*=x*', '2-times-equals-x'],
		['*A*!ready*', 'a-times-not-ready'],
		['(x)*-2*', 'x-times-negative-2-stars'],
		['[x]*+2*', 'x-times-positive-2-stars'],
		['*(x)*-2*', 'x-times-negative-2'],
		['5!*2*', '5-factorial-times-2-stars'],
		['(5!)*2*', '5-factorial-times-2-stars'],
		['5!**2*', '5-factorial-to-the-power-of-2-stars'],
		['50%*2*', '50-percent-times-2-stars'],
		['50%*A*', '50-percent-times-a-star'],
		['50%**2*', '50-percent-to-the-power-of-2-stars'],
		['1,5%', '1-5'],
		['١٫٥%', '١-٥'],
		['1.2.3%', '1-dot-2-dot-3'],
		['1,5!+2', '1-5-2'],
		['١٫٥!*٢*', '١-٥-٢'],
		['5e-3%', '5e-3'],
		['*A*+B', 'a-plus-b'],
		['B+*A*', 'b-plus-a'],
		['*5*+1', '5-times-positive-1'],
		['*5* + 1', '5-plus-1'],
		['*rated 5*!', 'rated-5'],
		['rated 5*!', 'rated-5-stars'],
		['* Learn A*', 'learn-a-star'],
		['* 5* rating', '5-stars-rating'],
		['*open\nA*', 'open-a-star'],
		['foo，５＊', 'foo-5-stars'],
		['１２，３４＊', '12-34'],
		['foo٬٢*', 'foo-٢-stars'],
		['١٬٢*', '١-٢'],
		['*1*,2*', '1-2-stars'],
		['*5*,4*', '5-4-stars'],
		['*rated 5*,4*', 'rated-5-4-stars'],
		['*1*:2*', '1-2-stars'],
		['*1*/2*', '1-divided-by-2-stars'],
		['2*$-1٬000', '2-1-000'],
		['*Top 5!*', 'top-5'],
		['Top 5!*', 'top-5'],
		['*https://x.test* 5*', 'https-x-test-5-stars'],
		['*www.example.com* A* algorithm', 'www-example-com-a-star-algorithm'],
		['*<b>x</b>* 5*', 'b-x-b-5-stars'],
		['*<div>text</div>* + 5*', 'div-text-div-plus-5-stars'],
		['*x*++', 'x-increment'],
		['++*x*', 'increment-x'],
		['!*ready*', 'not-ready'],
		['~*5*', 'approximately-5'],
		['#*1*', 'number-1'],
		['$*5*', '5-dollars'],
		['*50*%', '50-percent'],
		['x=~*5*', 'x-equals-approximately-5'],
		['value *+2* text', 'value-2-text'],
		['pay *-$5* now', 'pay-negative-5-dollars-now'],
		['prior\n*+2*', 'prior-positive-2'],
		['*2*#3*', '2-times-number-3'],
		['*2*$3*', '2-times-3-dollars'],
		['*rated 1*..2*', 'rated-1-range-2-stars'],
		['*rated 1*٫2*', 'rated-1-2-stars'],
		['.5*', '5'],
		['٫٥*', '٥'],
		['5! != 4', '5-factorial-not-equals-4'],
		['5! !== 4', '5-factorial-strictly-not-equals-4'],
		['Top 5!+', 'top-5'],
		['Top 5!+ update', 'top-5-update'],
		['1e++-3*', '1e-3'],
		['0x++-5*', '0x-5'],
		['1e++-3%', '1e-3'],
		['1e++-3!+2', '1e-3-2'],
		['2*€5', '2-times-5-euros'],
		['2*$$5', '2-5'],
		['A*$$5', 'a-5'],
		['2*$--5', '2-5'],
		['5! % 2', '5-factorial-modulo-2'],
		['5! ^ 2', '5-factorial-to-the-power-of-2'],
		['5!/2', '5-factorial-divided-by-2'],
		['Result 5! % 2', 'result-5-factorial-modulo-2'],
		['Result 5! ^ 2', 'result-5-factorial-to-the-power-of-2'],
		['Result 5!/2', 'result-5-factorial-divided-by-2'],
		['50% % 3', '50-percent-modulo-3'],
		['50% ^ 2', '50-percent-to-the-power-of-2'],
		['50%/2', '50-percent-divided-by-2'],
		['$5 % 2', '5-dollars-modulo-2'],
		['$5 ^ 2', '5-dollars-to-the-power-of-2'],
		['$5/2', '5-dollars-divided-by-2'],
		['5* % 2', '5-stars-modulo-2'],
		['5* ^ 2', '5-stars-to-the-power-of-2'],
		['5*/2', '5-stars-divided-by-2'],
		['2/5*', '2-divided-by-5-stars'],
		['2/5!', '2-divided-by-5-factorial'],
		['2/50%', '2-divided-by-50-percent'],
		['2/1.5*', '2-divided-by-1-point-5-stars'],
		['1/2/3*', '1-divided-by-2-divided-by-3-stars'],
		['2//5*', '2-floor-divided-by-5-stars'],
		['9/2/2026*', '9-2-2026'],
		['2026/9/2!', '2026-9-2'],
		['5!===4', '5-factorial-strictly-equals-4'],
		['foo.5*', 'foo-5-stars'],
		['Rated.5*', 'rated-5-stars'],
		['foo..5*', 'foo-5-stars'],
		['foo.5%', 'foo-5-percent'],
		['1..5*', '1-range-5-stars'],
		['<div data-x="*">x</div> 5*', 'div-data-x-x-div-5-stars'],
		[
			'<b title="*open">x</b> A* algorithm',
			'b-title-open-x-b-a-star-algorithm',
		],
		['https://x.test/*path 5*', 'https-x-test-path-5-stars'],
		[
			'https://x.test/?q=*path A* algorithm',
			'https-x-test-q-path-a-star-algorithm',
		],
		['*https://x.test*. 5*', 'https-x-test-5-stars'],
		['*https://x.test*, 5*', 'https-x-test-5-stars'],
		['*https://x.test*) 5*', 'https-x-test-5-stars'],
		['*https://x.test*?! 5*', 'https-x-test-5-stars'],
		['*https://x.test*> 5*', 'https-x-test-5-stars'],
		['*https://x.test*< 5*', 'https-x-test-5-stars'],
		['*https://x.test*( 5*', 'https-x-test-5-stars'],
		['*https://x.test*— 5*', 'https-x-test-5-stars'],
		['*https://x.test*。 5*', 'https-x-test-5-stars'],
		['title\n+ bullet', 'title-bullet'],
		['2\n*\n3', '2-3'],
		['#\n1', '1'],
		['$\n5', '5'],
		['50\n%', '50'],
		['5\n!', '5'],
		['2*\n-1', '2-stars-negative-1'],
		['5!\nnext', '5-factorial-next'],
		['x=5!\r\nnext', 'x-equals-5-factorial-next'],
		['3*5!\u2028next', '3-times-5-factorial-next'],
		['5!\u2029+2', '5-factorial-positive-2'],
		['Top 5!\nnext', 'top-5-next'],
		['title\n5!', 'title-5-factorial'],
		['title\r\n5!', 'title-5-factorial'],
		['title\u20285!', 'title-5-factorial'],
		['title\u20295!', 'title-5-factorial'],
		['title\n-5', 'title-negative-5'],
		['title\r\n+5', 'title-positive-5'],
		['title\u2028!ready', 'title-not-ready'],
		['title\u2029-$5', 'title-negative-5-dollars'],
		['title\n+$5', 'title-positive-5-dollars'],
		['title\n- $5', 'title-negative-5-dollars'],
		['2*[-3]', '2-times-negative-3'],
		['2*{-3}', '2-times-negative-3'],
		['[-$5]', 'negative-5-dollars'],
		['{+$5}', 'positive-5-dollars'],
		['[!ready]', 'not-ready'],
		['{!ready}', 'not-ready'],
		['2^[-3]', '2-to-the-power-of-negative-3'],
		['2/[-3]', '2-divided-by-negative-3'],
		['*5!*.', '5-factorial'],
		['*5!*,', '5-factorial'],
		['*5!*:', '5-factorial'],
		['*5!*;', '5-factorial'],
		['*5!*?', '5-factorial'],
		['*5!*—', '5-factorial'],
		['*5!*。', '5-factorial'],
		['*5!*🙂', '5-factorial'],
		['*5!*\\', '5-factorial'],
		['*5!*_', '5-factorial'],
		['*5!*/2*', '5-factorial-divided-by-2-stars'],
		['*5!*,2*', '5-factorial-2-stars'],
		['Compute *5!* now', 'compute-5-factorial-now'],
		['*5!*; *6!*;', '5-factorial-6-factorial'],
		['Compute *Top 5!* now', 'compute-top-5-now'],
		['*5 reasons for Top 10!*', '5-reasons-for-top-10'],
		['We have *5 options; pick 2!*', 'we-have-5-options-pick-2'],
		['*5 cats, score 10!*', '5-cats-score-10'],
		['*5 10!*', '5-10'],
		['Compute *1,000!* now', 'compute-1000-factorial-now'],
		['*1,000!*; *2,000!*;', '1000-factorial-2000-factorial'],
		['Compute *-1,000!* now', 'compute-negative-1000-factorial-now'],
		['Compute *１００，０００！* now', 'compute-100000-factorial-now'],
		['Compute *???5!* now', 'compute-5-now'],
		['Compute *@5!* now', 'compute-5-now'],
		['Compute *+/-5!* now', 'compute-5-now'],
		['Compute *-5!* now', 'compute-negative-5-factorial-now'],
		['Compute *+5!* now', 'compute-positive-5-factorial-now'],
		['x=*-5!*', 'x-equals-negative-5-factorial'],
		['x=*+5!*', 'x-equals-positive-5-factorial'],
		['2 + *-5!*', '2-plus-negative-5-factorial'],
		['2 / *-5!*', '2-divided-by-negative-5-factorial'],
		['2 ^ *-5!*', '2-to-the-power-of-negative-5-factorial'],
		['x = *-1,000!*', 'x-equals-negative-1000-factorial'],
		['5! = *-4!*', '5-factorial-equals-negative-4-factorial'],
		['5! + *-4!*', '5-factorial-plus-negative-4-factorial'],
		['5* / *-4!*', '5-stars-divided-by-negative-4-factorial'],
		['5! == *+4!*', '5-factorial-equals-positive-4-factorial'],
		['5! + *4!*', '5-factorial-plus-4-factorial'],
		['x - *4!*', 'x-minus-4-factorial'],
		['2 - *4!*', '2-minus-4-factorial'],
		['$2 - *4!*', '2-dollars-minus-4-factorial'],
		['50% - *4!*', '50-percent-minus-4-factorial'],
		['50% *= 4*', '50-percent-times-equals-4-stars'],
		['5! *= A*', '5-factorial-times-equals-a-star'],
		['5* *= 4*', '5-stars-times-equals-4-stars'],
		['5!*=A*', '5-factorial-times-equals-a-star'],
		['5!/-4!', '5-factorial-divided-by-negative-4-factorial'],
		['5! / -4!', '5-factorial-divided-by-negative-4-factorial'],
		['5* / -4!', '5-stars-divided-by-negative-4-factorial'],
		['(5!) / -4!', '5-factorial-divided-by-negative-4-factorial'],
		['(5*) / -4!', '5-stars-divided-by-negative-4-factorial'],
		['1e-3! / -4!', '1e-3-4'],
		['abc5! / -4!', 'abc5-4'],
		['9/2/2026! / -4!', '9-2-2026-4'],
		['*outer *foo* 5!*', 'outer-foo-5'],
		['Compute *Top *thing* 5!* now', 'compute-top-thing-5-now'],
		['*5 reasons *aside* 10!*', '5-reasons-aside-10'],
		['x\u0000y', 'x-y'],
		['x\u0001y', 'x-y'],
		['x\u0002y', 'x-y'],
		['x\u0003y', 'x-y'],
		['x\u0004y', 'x-y'],
		['-5!', 'negative-5-factorial'],
		['x=-5!', 'x-equals-negative-5-factorial'],
		['(-5!)', 'negative-5-factorial'],
		['title\n-5!', 'title-negative-5-factorial'],
		['Top-5!', 'top-5'],
		['3-5!', '3-5'],
		['+/-5!', '5'],
		['~~5', '5'],
		['~~~5', '5'],
		['x=~~5', 'x-5'],
		['~ ~5', 'approximately-5'],
	] as const)('resolves star boundary context for %j', (input, expected) => {
		expectStableSlug(input, expected);
	});

	const printableSymbolCases = [
		['!', '!ready', 'not-ready'],
		['"', '"quoted"', 'quoted'],
		['#', '#1', 'number-1'],
		['$', '$2', '2-dollars'],
		['%', '50%', '50-percent'],
		['&', 'a&b', 'a-and-b'],
		["'", "don't", 'dont'],
		['(', '(word)', 'word'],
		[')', '(word)', 'word'],
		['*', '2*3', '2-times-3'],
		['+', '1+2', '1-plus-2'],
		[',', 'hello, world', 'hello-world'],
		['-', '1 - 2', '1-minus-2'],
		['.', '1.5', '1-point-5'],
		['/', '10/2', '10-divided-by-2'],
		[':', '10:30', '10-30'],
		[';', 'a;b', 'a-b'],
		['<', 'a<b', 'a-less-than-b'],
		['=', 'a=b', 'a-equals-b'],
		['>', 'a>b', 'a-greater-than-b'],
		['?', 'what?', 'what'],
		['@', 'a@b', 'a-at-b'],
		['[', '[word]', 'word'],
		['\\', 'a\\b', 'a-b'],
		[']', '[word]', 'word'],
		['^', '2^3', '2-to-the-power-of-3'],
		['_', 'a_b', 'a-b'],
		['`', '`code`', 'code'],
		['{', '{word}', 'word'],
		['|', 'a|b', 'a-or-b'],
		['}', '{word}', 'word'],
		['~', '~5', 'approximately-5'],
	] as const;

	for (const [symbol, input, expected] of printableSymbolCases) {
		it(`defines ${JSON.stringify(symbol)} with ${JSON.stringify(input)}`, () => {
			expectStableSlug(input, expected);
		});
	}

	it('covers every printable ASCII punctuation key exactly once', () => {
		const printableSymbols = `!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`;

		expect(printableSymbolCases.map(([symbol]) => symbol).sort()).toEqual(
			Array.from(printableSymbols).sort(),
		);
	});

	it('keeps arbitrary symbol combinations valid and idempotent', () => {
		const alphabet = Array.from(
			`abcXYZ019 !"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~é東京🙂`,
		);
		let state = 0x9e3779b9;

		for (let sample = 0; sample < 2_000; sample += 1) {
			state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
			const length = state % 48;
			let input = '';

			for (let index = 0; index < length; index += 1) {
				state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
				input += alphabet[state % alphabet.length];
			}

			const slug = slugify(input);

			expect(slug).toMatch(validSlugPattern);
			expect(slugify(slug)).toBe(slug);
		}
	});

	it('handles long operator runs without nonlinear rescanning', () => {
		expectStableSlug(`a${'+'.repeat(20_000)}b`, 'a-b');
	});

	it('handles malformed numeric sign runs without backward rescanning', () => {
		const input = `1e${'+-++-'.repeat(20_000)}3*`;
		const slug = slugify(input);

		expect(slug).toBe('1e-3');
		expect(slugify(slug)).toBe(slug);
	});

	it('handles nested emphasis candidates without rescanning spans', () => {
		const count = 20_000;
		const input = `*.${' *.'.repeat(count - 1)}5!${'*!'.repeat(count)}`;

		expectStableSlug(input, '5');
	});

	it('handles long postfix-star and guarded near-miss runs linearly', () => {
		const count = 20_000;

		for (const [input, segment] of [
			['A* '.repeat(count), 'a-star'],
			['5*, '.repeat(count), '5-stars'],
			['*A* '.repeat(count), 'a'],
			['5*** '.repeat(count), '5'],
		] as const) {
			const slug = slugify(input);

			expect(slug).toBe(`${`${segment}-`.repeat(count - 1)}${segment}`);
			expect(slugify(slug)).toBe(slug);
		}

		expect(slugify('*'.repeat(20_000))).toBe('');
	});

	it('handles deeply nested wrapped increments without rescanning operands', () => {
		const depth = 10_000;
		let postfixInput = 'a';
		let prefixInput = 'a';

		for (let index = 0; index < depth; index += 1) {
			postfixInput = `(${postfixInput})++`;
			prefixInput = `++(${prefixInput})`;
		}

		expect(slugify(postfixInput)).toBe(`a${'-increment'.repeat(depth)}`);
		expect(slugify(prefixInput)).toBe(`${'increment-'.repeat(depth)}a`);
	});

	it('handles long numeric and punctuation near-misses', () => {
		const digits = '1'.repeat(20_000);
		const left = 'a'.repeat(20_000);
		const right = 'b'.repeat(20_000);
		const whitespace = ' '.repeat(20_000);
		const emailNearMiss = '𐐀++'.repeat(8_000);

		expect(slugify(digits)).toBe(digits);
		expect(slugify(`${left}?${right}`)).toBe(`${left}-${right}`);
		expect(slugify(`$${whitespace}x`)).toBe('x');
		expect(slugify(`$${whitespace}+${whitespace}x`)).toBe('x');

		const emailNearMissSlug = slugify(emailNearMiss);

		expect(emailNearMissSlug).toMatch(validSlugPattern);
		expect(slugify(emailNearMissSlug)).toBe(emailNearMissSlug);
	});
});

describe('English vocabulary and notation', () => {
	const termCases = [
		['F# programming', 'f-sharp-programming'],
		['Notepad++', 'notepad-plus-plus'],
		['g++ compiler', 'g-plus-plus-compiler'],
		['clang++', 'clang-plus-plus'],
		['libstdc++', 'libstdc-plus-plus'],
		['libc++', 'libc-plus-plus'],
		['GTK+', 'gtk-plus'],
		['.NET 8', 'dot-net-8'],
		['ASP.NET Core', 'asp-net-core'],
		['VB.NET', 'vb-net'],
		['C++/CLI', 'cpp-cli'],
		['C++98', 'cpp-98'],
		['C++03', 'cpp-03'],
		['C++11', 'cpp-11'],
		['C++14', 'cpp-14'],
		['C++17', 'cpp-17'],
		['C++20', 'cpp-20'],
		['C++23', 'cpp-23'],
		['C++26', 'cpp-26'],
		['D* Lite', 'd-star-lite'],
		['D* algorithm', 'd-star-algorithm'],
		['IDA* search', 'ida-star-search'],
		['LPA* algorithm', 'lpa-star-algorithm'],
		['RRT* planner', 'rrt-star-planner'],
		['C*-algebra', 'c-star-algebra'],
		['C* algebras', 'c-star-algebras'],
		['W*-algebras', 'w-star-algebras'],
		['B* algebra', 'b-star-algebra'],
		['B+-tree', 'b-plus-tree'],
		['B+ trees', 'b-plus-trees'],
		['B*-trees', 'b-star-trees'],
		['B* tree', 'b-star-tree'],
		['LGBT+ history', 'lgbt-plus-history'],
		['LGBTQ+ rights', 'lgbtq-plus-rights'],
		['LGBTQIA+ history', 'lgbtqia-plus-history'],
		['Disney+ shows', 'disney-plus-shows'],
		['Paramount+', 'paramount-plus'],
		['Apple TV+', 'apple-tv-plus'],
	] as const;

	it.each(termCases)('preserves the meaning of %j', (input, expected) => {
		for (const spelling of [
			input,
			input.toLowerCase(),
			input.toUpperCase(),
		]) {
			expectStableSlug(spelling, expected);
			expectStableSlug(`(${spelling}),`, expected);
			expectStableSlug(
				`${spelling}; ${spelling}`,
				`${expected}-${expected}`,
			);
		}
	});

	it.each([
		['The best books - a guide', 'the-best-books-a-guide'],
		['Hello - world', 'hello-world'],
		['Hello – world', 'hello-world'],
		['Hello — world', 'hello-world'],
		['word - word - word', 'word-word-word'],
		['and / or', 'and-or'],
		['he / she', 'he-she'],
		['input / output', 'input-output'],
		['input/output', 'input-output'],
		['yes / no / maybe', 'yes-no-maybe'],
		['R&B music', 'r-and-b-music'],
		['Q&A', 'q-and-a'],
		['24/7 support', '24-7-support'],
		['24 / 7 service', '24-7-service'],
		['9/11 memorial', '9-11-memorial'],
		['4/4 time', '4-4-time'],
		['6 / 8 meter', '6-8-meter'],
		['a / b', 'a-divided-by-b'],
		['x - y', 'x-minus-y'],
		['2 - 1', '2-minus-1'],
		['24/7', '24-divided-by-7'],
		['9/11', '9-divided-by-11'],
		['24/7=3', '24-divided-by-7-equals-3'],
		['foo2 / bar3', 'foo2-divided-by-bar3'],
		['co-operate', 'co-operate'],
		['re-sign', 're-sign'],
		['mother-in-law', 'mother-in-law'],
		['jack-o’-lantern', 'jack-o-lantern'],
		['will-o’-the-wisp', 'will-o-the-wisp'],
		['donʼt', 'dont'],
		['OʼNeill', 'oneill'],
		['maʼam', 'maam'],
		['co\u00adoperate', 'cooperate'],
		['encyclopædia', 'encyclopædia'],
		['œuvre', 'œuvre'],
		['naïveté', 'naivete'],
		['coöperation', 'cooperation'],
		['Schrödinger’s cat', 'schrodingers-cat'],
		['Gödel’s theorem', 'godels-theorem'],
		['Möbius strip', 'mobius-strip'],
		['fin-de-siècle', 'fin-de-siecle'],
		['l’esprit de l’escalier', 'lesprit-de-lescalier'],
		['A+ student', 'a-plus-student'],
		['B- grade', 'b-minus-grade'],
		['AB+ blood', 'ab-positive-blood'],
		['AB- blood', 'ab-negative-blood'],
		['O− blood', 'o-negative-blood'],
		['Rh+ donor', 'rh-positive-donor'],
		['18+', '18-plus'],
		['65+ discounts', '65-plus-discounts'],
		['30+ recipes', '30-plus-recipes'],
		['A+ B', 'a-b'],
		['5+ x', '5-x'],
		['5+2', '5-plus-2'],
		['5 + 2', '5-plus-2'],
		['5++', '5-increment'],
		['myF#', 'myf'],
		['F#oo', 'f-oo'],
		['中F#文', '中f-文'],
		['myNotepad++', 'mynotepad-increment'],
		['Notepad++foo', 'notepad-foo'],
		['C*algebraic', 'c-times-algebraic'],
		['RRT*value', 'rrt-times-value'],
		['C*D', 'c-times-d'],
		['B+C', 'b-plus-c'],
		['*grade A*', 'grade-a'],
		['https://example.com/B♭?q=18+', 'https-example-com-b-q-18'],
	] as const)('distinguishes English context in %j', (input, expected) => {
		expectStableSlug(input, expected);
	});

	for (const note of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
		for (const [symbol, word] of [
			['♯', 'sharp'],
			['♭', 'flat'],
			['♮', 'natural'],
			['𝄪', 'double-sharp'],
			['𝄫', 'double-flat'],
		]) {
			it(`preserves the ${note}${symbol} musical accidental`, () => {
				expectStableSlug(
					`${note}${symbol} minor`,
					`${note.toLowerCase()}-${word}-minor`,
				);
				expectStableSlug(
					`${note}${symbol}4`,
					`${note.toLowerCase()}-${word}-4`,
				);
			});
		}
	}

	it.each([
		['D# major', 'd-sharp-major'],
		['F# minor', 'f-sharp-minor'],
		['C#1', 'c-1'],
		['½ cup', 'one-half-cup'],
		['1½ cups', '1-and-one-half-cups'],
		['1 1/2 cups', '1-and-one-half-cups'],
		['1/2 cup', 'one-half-cup'],
		['1⁄2 cup', 'one-half-cup'],
		['1 1⁄2 cups', '1-and-one-half-cups'],
		['https://example.com/½', 'https-example-com-1-2'],
		['HTTPS://example.com/?x≮y', 'https-example-com-x-y'],
		[
			'*https://example.com/½* 1½ cups',
			'https-example-com-1-2-1-and-one-half-cups',
		],
		['5/16-inch', '5-over-16-inch'],
		['.5 cup', '0-point-5-cup'],
		['1/2', '1-divided-by-2'],
		['1/0 cups', '1-divided-by-0-cups'],
		['2026/9/2 cups', '2026-9-2-cups'],
		['11½ inches', '11-and-one-half-inches'],
		['2⅔ cups', '2-and-two-thirds-cups'],
		['⅛-inch', 'one-eighth-inch'],
		['⅞ inch', 'seven-eighths-inch'],
		['⅐', 'one-seventh'],
		['⅑', 'one-ninth'],
		['⅒', 'one-tenth'],
		['⅓', 'one-third'],
		['⅕', 'one-fifth'],
		['⅖', 'two-fifths'],
		['⅗', 'three-fifths'],
		['⅘', 'four-fifths'],
		['⅙', 'one-sixth'],
		['⅚', 'five-sixths'],
		['⅜', 'three-eighths'],
		['⅝', 'five-eighths'],
		['¼', 'one-quarter'],
		['¾', 'three-quarters'],
		['20°C', '20-degrees-celsius'],
		['20℃', '20-degrees-celsius'],
		['68°F', '68-degrees-fahrenheit'],
		['68℉', '68-degrees-fahrenheit'],
		['1 °C', '1-degree-celsius'],
		['−5°C', 'negative-5-degrees-celsius'],
		['Temperature −5°C', 'temperature-negative-5-degrees-celsius'],
		['Temperature -5°C', 'temperature-negative-5-degrees-celsius'],
		['10×5', '10-times-5'],
		['10 ÷ 5', '10-divided-by-5'],
		['10−5', '10-minus-5'],
		['x ≠ y', 'x-not-equals-y'],
		['x =\u0338 y', 'x-not-equals-y'],
		['x ≮ y', 'x-not-less-than-y'],
		['x <\u0338 y', 'x-not-less-than-y'],
		['x ≯ y', 'x-not-greater-than-y'],
		['x ≰ y', 'x-not-less-than-or-equal-to-y'],
		['x ≤\u0338 y', 'x-not-less-than-or-equal-to-y'],
		['x ≱ y', 'x-not-greater-than-or-equal-to-y'],
		['x ≥\u0338 y', 'x-not-greater-than-or-equal-to-y'],
		['x ≤ 5', 'x-less-than-or-equal-to-5'],
		['x ≥ 5', 'x-greater-than-or-equal-to-5'],
		['5 ± 2', '5-plus-or-minus-2'],
		['±5%', 'plus-or-minus-5-percent'],
		['≠ ≮ ≯ ≤ ≥ × ÷ ± −', ''],
	] as const)(
		'preserves numeric and Unicode meaning in %j',
		(input, expected) => {
			expectStableSlug(input, expected);
		},
	);

	it.each([
		'about',
		'after',
		'before',
		'between',
		'book',
		'business',
		'child',
		'computer',
		'different',
		'education',
		'example',
		'family',
		'friend',
		'government',
		'health',
		'history',
		'home',
		'information',
		'language',
		'people',
		'question',
		'school',
		'science',
		'through',
		'time',
		'water',
		'world',
		'abecedarian',
		'absquatulate',
		'agathokakological',
		'borborygmus',
		'cwm',
		'defenestration',
		'epicaricacy',
		'floccinaucinihilipilification',
		'kakistocracy',
		'logomachy',
		'nudiustertian',
		'obstreperous',
		'opsimath',
		'quincunx',
		'sesquipedalian',
		'synecdoche',
		'syzygy',
		'tmesis',
		'ultracrepidarian',
		'uxorious',
		'velleity',
		'zeugma',
		'zwitterion',
		'pneumonoultramicroscopicsilicovolcanoconiosis',
	])('preserves the English word %s in titles and compounds', (word) => {
		expectStableSlug(
			`Learn ${word.toUpperCase()} today!`,
			`learn-${word}-today`,
		);
		expectStableSlug(`pre-${word}-post`, `pre-${word}-post`);
		expectStableSlug(`(${word}),`, word);
	});
});

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

describe('normalization equivalence', () => {
	it.each([
		['Crème', 'Cre\u0300me'],
		['Ångström', 'A\u030angstro\u0308m'],
		['Café C++', 'Cafe\u0301 C++'],
		['한국어', '한국어'.normalize('NFD')],
	] as const)('normalizes %j and %j identically', (left, right) => {
		expect(slugify(left)).toBe(slugify(right));
	});

	it('does not erase Korean text', () => {
		expect(slugify('한국어')).not.toBe('');
	});
});
