import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getCodePointBefore,
	LINE_BREAK_RE,
	WORD_CHARACTER_RE,
} from './character-context';
import { MATH_WRAPPERS } from './data/notation';

export const LEFT_OPERAND_WRAPPER_RE = /^[)\]}]$/u;

export const RIGHT_OPERAND_WRAPPER_RE = /^[([{]$/u;

const MATCHING_OPENING_WRAPPER = {
	')': '(',
	']': '[',
	'}': '{',
} as const;

const MATCHING_CLOSING_WRAPPER = {
	'(': ')',
	'[': ']',
	'{': '}',
} as const;

export type BalancedOperandWrapperIndexes = Readonly<{
	openings: ReadonlySet<number>;
	closings: ReadonlySet<number>;
}>;

type WrapperFrame = Readonly<{
	opening: keyof typeof MATCHING_CLOSING_WRAPPER;
	openingIndex: number;
	wordCountAtOpen: number;
}>;

/** Pair wrappers once so roots and nested expressions do not rescan their contents. */
export function getWrapperEnds(value: string): ReadonlyMap<number, number> {
	const ends = new Map<number, number>();
	const stack: { start: number; closing: string }[] = [];
	const openingToClosing: Readonly<Record<string, string>> = {
		...MATCHING_CLOSING_WRAPPER,
		...Object.fromEntries(
			Object.entries(MATH_WRAPPERS).map(([opening, [closing]]) => [
				opening,
				closing,
			]),
		),
	};
	const closings = new Set(Object.values(openingToClosing));
	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index) as string;
		if (LINE_BREAK_RE.test(character)) stack.length = 0;
		const closing = openingToClosing[character];
		if (closing !== undefined) stack.push({ start: index, closing });
		else if (closings.has(character)) {
			const frame = stack.pop();
			if (frame?.closing === character)
				ends.set(frame.start, index + character.length);
			else stack.length = 0;
		}
		index += character.length;
	}
	return ends;
}

export function getBalancedOperandWrapperIndexes(
	value: string,
): BalancedOperandWrapperIndexes {
	const openings = new Set<number>();
	const closings = new Set<number>();
	const stack: WrapperFrame[] = [];
	let wordCount = 0;

	for (let index = 0; index < value.length;) {
		const character = getCodePointAt(value, index);

		if (character === undefined) {
			break;
		}

		if (WORD_CHARACTER_RE.test(character)) {
			wordCount += 1;
		}

		if (RIGHT_OPERAND_WRAPPER_RE.test(character)) {
			stack.push({
				opening: character as keyof typeof MATCHING_CLOSING_WRAPPER,
				openingIndex: index,
				wordCountAtOpen: wordCount,
			});
		} else if (LEFT_OPERAND_WRAPPER_RE.test(character)) {
			const frame = stack.at(-1);

			if (
				frame !== undefined &&
				MATCHING_CLOSING_WRAPPER[frame.opening] === character
			) {
				stack.pop();

				if (wordCount > frame.wordCountAtOpen) {
					openings.add(frame.openingIndex);
					closings.add(index);
				}
			} else {
				stack.length = 0;
			}
		}

		index += character.length;
	}

	return { openings, closings };
}

export function hasNumericOnlyWrappingBefore(
	value: string,
	numericStart: number,
	closingWrappers: string,
): boolean {
	if (!closingWrappers) {
		return true;
	}

	let cursor = numericStart;
	let character = getCodePointBefore(value, cursor);

	while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);
	}

	if (character === '+' || character === '-') {
		cursor -= character.length;
		character = getCodePointBefore(value, cursor);

		while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
			cursor -= character.length;
			character = getCodePointBefore(value, cursor);
		}
	}

	for (const closingWrapper of closingWrappers) {
		if (
			character !==
			MATCHING_OPENING_WRAPPER[
				closingWrapper as keyof typeof MATCHING_OPENING_WRAPPER
			]
		) {
			return false;
		}

		cursor -= character.length;
		character = getCodePointBefore(value, cursor);

		while (character !== undefined && CONTEXT_PADDING_RE.test(character)) {
			cursor -= character.length;
			character = getCodePointBefore(value, cursor);
		}
	}

	return true;
}
