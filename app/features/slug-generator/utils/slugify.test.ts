import { describe, expect, it } from 'vitest';

import { slugify } from './slugify';

const cases: Array<[string, string]> = [
	['', ''],
	['   ', ''],
	['---___', ''],
	['Hello World', 'hello-world'],
	['HELLO WORLD', 'hello-world'],
	['Hello, world!!!', 'hello-world'],
	['one---two___three', 'one-two-three'],
	['---hello-world___', 'hello-world'],
	['already-slugified', 'already-slugified'],
	['Crème brûlée', 'creme-brulee'],
	['東京 2026', '東京-2026'],
	['Learn C++ Today!', 'learn-cpp-today'],
];

describe('slugify', () => {
	for (const [input, expected] of cases) {
		it(`converts ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
			expect(slugify(input)).toBe(expected);
		});
	}
});
