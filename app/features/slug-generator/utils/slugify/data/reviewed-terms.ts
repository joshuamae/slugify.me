export type ExceptionMatchMode = 'term' | 'literal';

export type ExceptionMapping = Readonly<{
	source: string;
	replacement: string;
	mode: ExceptionMatchMode;
}>;

export const exceptionMappings = [
	{ source: 'C++', replacement: 'cpp', mode: 'term' },
	{ source: 'C#', replacement: 'c-sharp', mode: 'term' },
	...['98', '03', '11', '14', '17', '20', '23', '26'].map((edition) => ({
		source: `C++${edition}`,
		replacement: `cpp-${edition}`,
		mode: 'term' as const,
	})),
	{ source: '.NET', replacement: 'dot-net', mode: 'term' },
	{ source: 'F#', replacement: 'f-sharp', mode: 'term' },
	{ source: 'Notepad++', replacement: 'notepad-plus-plus', mode: 'term' },
	{ source: 'g++', replacement: 'g-plus-plus', mode: 'term' },
	{ source: 'clang++', replacement: 'clang-plus-plus', mode: 'term' },
	{ source: 'libstdc++', replacement: 'libstdc-plus-plus', mode: 'term' },
	{ source: 'libc++', replacement: 'libc-plus-plus', mode: 'term' },
	{ source: 'GTK+', replacement: 'gtk-plus', mode: 'term' },
	{ source: 'LGBT+', replacement: 'lgbt-plus', mode: 'term' },
	{ source: 'LGBTQ+', replacement: 'lgbtq-plus', mode: 'term' },
	{ source: 'LGBTQIA+', replacement: 'lgbtqia-plus', mode: 'term' },
	{ source: 'Disney+', replacement: 'disney-plus', mode: 'term' },
	{ source: 'Paramount+', replacement: 'paramount-plus', mode: 'term' },
	{ source: 'Apple TV+', replacement: 'apple-tv-plus', mode: 'term' },
	{ source: 'D* Lite', replacement: 'd-star-lite', mode: 'term' },
	{ source: 'D* algorithm', replacement: 'd-star-algorithm', mode: 'term' },
	{ source: 'IDA*', replacement: 'ida-star', mode: 'term' },
	{ source: 'LPA*', replacement: 'lpa-star', mode: 'term' },
	{ source: 'RRT*', replacement: 'rrt-star', mode: 'term' },
	...['C', 'W', 'B'].flatMap((letter) =>
		['algebra', 'algebras'].flatMap((noun) =>
			['-', ' '].map((separator) => ({
				source: `${letter}*${separator}${noun}`,
				replacement: `${letter.toLowerCase()}-star-${noun}`,
				mode: 'term' as const,
			})),
		),
	),
	...['+', '*'].flatMap((symbol) =>
		['tree', 'trees'].flatMap((noun) =>
			['-', ' '].map((separator) => ({
				source: `B${symbol}${separator}${noun}`,
				replacement: `b-${symbol === '+' ? 'plus' : 'star'}-${noun}`,
				mode: 'term' as const,
			})),
		),
	),
] as const satisfies readonly ExceptionMapping[];
