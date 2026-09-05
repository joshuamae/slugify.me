import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getCodePointBefore,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	MATH_CONSTANT_SYMBOLS,
	MATH_PREFIX_SYMBOLS,
	MATH_WRAPPERS,
	MATHEMATICAL_ALPHABETS,
	PRIME_COUNTS,
	SUBSCRIPT_RE,
	SUPERSCRIPT_RE,
} from './data/notation';
import { unicodeMathNames } from './data/unicode-math';
import { isNumericOne } from './number-format';
import { getWordBefore } from './operand-context';
import { SEMANTIC_NUMERIC_OPERAND_BOUNDARY } from './operand-markers';
import { RAW_TAG_RE, RAW_URL_RE } from './protected-spans';
import { getWrapperEnds, LEFT_OPERAND_WRAPPER_RE } from './wrappers';

const HEIGHT_RE = /(?<![\p{L}\p{N}.])([0-9]+)′[ \t]*([0-9]+)″(?!\p{N})/uy;

/** Paired bars with compact contents denote absolute values or norms, not prose pipes. */
export function applyAbsoluteValueContexts(value: string): string {
	return value.replace(
		/(?<![\p{L}\p{N}|‖])(\|\||‖|\|)([^|‖\r\n\u2028\u2029]+?)\1(?![\p{L}\p{N}|‖])/gu,
		(match, delimiter: string, expression: string) => {
			if (
				expression.trim() !== expression ||
				!/[\p{L}\p{N}]/u.test(expression) ||
				/\p{L}{2,}[ \t]+\p{L}{2,}/u.test(expression)
			)
				return match;
			return `${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${delimiter === '|' ? 'absolute-value' : 'norm'}-${expression}-${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`;
		},
	);
}

/** Preserve variable and balanced algebraic factorials without renaming prose exclamations. */
export function applyAlgebraicFactorialContexts(value: string): string {
	const openingByEnd = new Map(
		Array.from(getWrapperEnds(value), ([start, end]) => [end, start]),
	);
	const starts = new Set<number>();
	const replacements = new Map<number, { text: string; length: number }>();
	for (const match of value.matchAll(/(?<!!)(!{1,2})(?!!|=)/gu)) {
		const index = match.index;
		const marks = match[1];
		const before = getCodePointBefore(value, index);
		const after = getCodePointAt(value, index + marks.length);
		if (after !== undefined && WORD_CHARACTER_RE.test(after)) continue;
		const word = getWordBefore(value, index);
		const opening = openingByEnd.get(index);
		const hasExpressionContext =
			/[=+*/^%([{][ \t]*$/u.test(
				value.slice(
					Math.max(0, index - word.length - 8),
					index - word.length,
				),
			) || /^[=+*/^%]/u.test(after ?? '');
		const isVariable =
			Array.from(word).length === 1 &&
			/^\p{L}$/u.test(word) &&
			(!/^[ai]$/u.test(word) || hasExpressionContext);
		const body =
			opening === undefined || index - opening > 2048
				? ''
				: value
						.slice(opening + 1, index - 1)
						.replaceAll(SEMANTIC_NUMERIC_OPERAND_BOUNDARY, '');
		const isExpression =
			before !== undefined &&
			LEFT_OPERAND_WRAPPER_RE.test(before) &&
			/\p{L}/u.test(body) &&
			!/\p{L}{2,}|\r|\n/u.test(body) &&
			/^[\p{L}\p{N}\s+*/^%!=().,-]+$/u.test(body);
		if (!isVariable && !isExpression) continue;
		starts.add(isVariable ? index - word.length : (opening as number));
		replacements.set(index, {
			text: `-${marks.length === 2 ? 'double-' : ''}factorial${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
			length: marks.length,
		});
	}
	const output: string[] = [];
	for (let index = 0; index < value.length;) {
		if (starts.has(index)) output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		const replacement = replacements.get(index);
		const character = getCodePointAt(value, index) as string;
		output.push(replacement?.text ?? character);
		index += replacement?.length ?? character.length;
	}
	return output.join('');
}

/** Name explicit mathematical notation before Unicode decomposition destroys its distinctions. */
export function preserveMathNotation(input: string): string {
	const value = input.normalize('NFC');
	const wrapperEnds = getWrapperEnds(value);
	const operandEnds = new Set<number>();
	const mathWrapperClosings = new Set<number>();
	const output: string[] = [];
	for (let index = 0; index < value.length;) {
		if (operandEnds.has(index))
			output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		const character = getCodePointAt(value, index) as string;
		// A script or prime makes a single-letter base a mathematical operand on
		// both sides of an operator. Mark its start before emitting that base.
		if (
			/^\p{L}$/u.test(character) &&
			!WORD_CHARACTER_RE.test(getCodePointBefore(value, index) ?? '')
		) {
			const next = getCodePointAt(value, index + character.length) ?? '';
			if (
				SUPERSCRIPT_RE.test(next) ||
				SUBSCRIPT_RE.test(next) ||
				PRIME_COUNTS[next] !== undefined
			)
				output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
		}
		if (character === '<' || /[hfw]/iu.test(character)) {
			const matcher = character === '<' ? RAW_TAG_RE : RAW_URL_RE;
			matcher.lastIndex = index;
			const protectedSpan = matcher.exec(value);
			if (protectedSpan !== null) {
				output.push(protectedSpan[0]);
				index += protectedSpan[0].length;
				continue;
			}
		}
		if (mathWrapperClosings.has(index)) {
			output.push(`-${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`);
			index += character.length;
			continue;
		}
		if (/[0-9.]/u.test(character)) {
			HEIGHT_RE.lastIndex = index;
			const height = HEIGHT_RE.exec(value);
			if (height !== null) {
				output.push(
					`${height[1]}-${isNumericOne(height[1]) ? 'foot' : 'feet'}-${height[2]}-${isNumericOne(height[2]) ? 'inch' : 'inches'}`,
				);
				index += height[0].length;
				continue;
			}
		}
		if (PRIME_COUNTS[character] !== undefined) {
			let end = index;
			let count = 0;
			let prime = getCodePointAt(value, end);
			while (prime !== undefined && PRIME_COUNTS[prime] !== undefined) {
				count += PRIME_COUNTS[prime];
				end += prime.length;
				prime = getCodePointAt(value, end);
			}
			const before = getCodePointBefore(value, index);
			if (before !== undefined && /[\p{L}\p{N})\]}]/u.test(before)) {
				const name =
					[
						'',
						'prime',
						'double-prime',
						'triple-prime',
						'quadruple-prime',
					][count] ?? `${count}-primes`;
				output.push(
					`-${name}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${prime !== undefined && WORD_CHARACTER_RE.test(prime) ? '-' : ''}`,
				);
			} else output.push(value.slice(index, end));
			index = end;
			continue;
		}
		const mathWrapper = MATH_WRAPPERS[character];
		const wrapperEnd = wrapperEnds.get(index);
		if (mathWrapper !== undefined && wrapperEnd !== undefined) {
			output.push(
				`${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${mathWrapper[1]}-`,
			);
			mathWrapperClosings.add(wrapperEnd - mathWrapper[0].length);
			index += character.length;
			continue;
		}
		const isSuperscript = SUPERSCRIPT_RE.test(character);
		const isSubscript = SUBSCRIPT_RE.test(character);
		if (isSuperscript || isSubscript) {
			const scriptPattern = isSuperscript ? SUPERSCRIPT_RE : SUBSCRIPT_RE;
			let end = index + character.length;
			let next = getCodePointAt(value, end);
			while (next !== undefined && scriptPattern.test(next)) {
				end += next.length;
				next = getCodePointAt(value, end);
			}
			const base = getWordBefore(value, index);
			const script = value
				.slice(index, end)
				.normalize('NFKD')
				.replaceAll('−', '-');
			// Embedded numeric subscripts in words and formulas such as H₂O/CO₂
			// retain the ordinary identifier spelling, rather than inventing algebra.
			if (
				isSubscript &&
				/^[0-9]+$/u.test(script) &&
				((next !== undefined && /\p{L}/u.test(next)) ||
					/^[A-Z]{2,}$/u.test(base))
			) {
				output.push(script);
			} else {
				const hasBase =
					base !== '' ||
					LEFT_OPERAND_WRAPPER_RE.test(
						getCodePointBefore(value, index) ?? '',
					);
				const isMathematicalBase =
					/^[0-9]+$/u.test(base) ||
					Array.from(base).length === 1 ||
					LEFT_OPERAND_WRAPPER_RE.test(
						getCodePointBefore(value, index) ?? '',
					) ||
					/^(?:sin|cos|tan|sinh|cosh|tanh|log|ln|exp)$/iu.test(base);
				const kind = isSubscript
					? base.toLowerCase() === 'log'
						? 'base'
						: 'subscript'
					: isMathematicalBase
						? 'to-the-power-of'
						: 'superscript';
				const spokenScript = script.replace(/^[+-]/u, (sign) =>
					sign === '-' ? 'negative-' : 'positive-',
				);
				output.push(
					`${hasBase ? '-' : ''}${kind}-${spokenScript}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
				);
				if (next !== undefined && WORD_CHARACTER_RE.test(next))
					output.push('-');
			}
			index = end;
			continue;
		}
		const name = unicodeMathNames[character];
		const alphabet = MATHEMATICAL_ALPHABETS[character];
		if (alphabet !== undefined) {
			const previous = getCodePointBefore(value, index);
			const next = getCodePointAt(value, index + character.length);
			if (
				(previous === undefined || !WORD_CHARACTER_RE.test(previous)) &&
				(next === undefined ||
					!WORD_CHARACTER_RE.test(next) ||
					SUPERSCRIPT_RE.test(next) ||
					SUBSCRIPT_RE.test(next))
			) {
				if (
					previous !== undefined &&
					unicodeMathNames[previous] !== undefined
				)
					output.push('-');
				output.push(
					`${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}${alphabet}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
				);
				index += character.length;
				continue;
			}
		}
		if (name !== undefined) {
			const previous = getCodePointBefore(value, index);
			let end = index + character.length;
			const negated = getCodePointAt(value, end) === '\u0338';
			if (negated) end += 1;
			const next = getCodePointAt(value, end);
			const isPrefix = MATH_PREFIX_SYMBOLS.has(character);
			const isConstant = MATH_CONSTANT_SYMBOLS.has(character);
			if (
				previous !== undefined &&
				(WORD_CHARACTER_RE.test(previous) ||
					unicodeMathNames[previous] !== undefined)
			)
				output.push('-');
			if (isPrefix || isConstant)
				output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
			output.push(`${negated ? 'not-' : ''}${name}`);
			if (isConstant) output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
			if (next !== undefined && WORD_CHARACTER_RE.test(next))
				output.push('-');
			if (isPrefix) {
				let operandStart = end;
				while (
					operandStart < value.length &&
					CONTEXT_PADDING_RE.test(value[operandStart])
				)
					operandStart += 1;
				let operandEnd = wrapperEnds.get(operandStart) ?? operandStart;
				if (operandEnd === operandStart) {
					let token = getCodePointAt(value, operandEnd);
					while (
						token !== undefined &&
						(WORD_CHARACTER_RE.test(token) ||
							SUPERSCRIPT_RE.test(token) ||
							SUBSCRIPT_RE.test(token))
					) {
						operandEnd += token.length;
						token = getCodePointAt(value, operandEnd);
					}
				}
				if (operandEnd > operandStart) operandEnds.add(operandEnd);
			}
			index = end;
			continue;
		}
		output.push(character);
		index += character.length;
	}
	if (operandEnds.has(value.length))
		output.push(SEMANTIC_NUMERIC_OPERAND_BOUNDARY);
	return output.join('');
}
