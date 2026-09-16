import { DECIMAL_DIGIT_RE, getCodePointAt } from './character-context';
import { contextualOperatorMappingsByInitial } from './data/operator-mappings';
import { hasProseOperands } from './english-notation';
import {
	getBinaryContext,
	getOperandCodePointBefore,
	getSemanticSignedNumericOperandSign,
	supportsOperandMode,
} from './operand-context';
import {
	CONDITIONAL_THEN_BOUNDARY,
	isConditionalBoundary,
	SEMANTIC_NUMERIC_OPERAND_BOUNDARY,
} from './operand-markers';
import { DATE_LIKE_RE } from './postfix-context';

function getNumericSlashIndexes(value: string): ReadonlySet<number> {
	const indexes = new Set<number>();

	for (const match of value.matchAll(DATE_LIKE_RE)) {
		if (match.index === undefined) {
			continue;
		}

		for (let offset = 0; offset < match[0].length; offset += 1) {
			if (match[0][offset] === '/') {
				indexes.add(match.index + offset);
			}
		}
	}

	return indexes;
}

function getPercentReplacement(
	value: string,
	index: number,
): string | undefined {
	const context = getBinaryContext(value, index, index + 1);

	if (
		context !== undefined &&
		context.leftIsNumeric &&
		context.rightIsNumeric
	) {
		return 'modulo';
	}

	const left = getOperandCodePointBefore(value, index);
	const leftIsNumeric =
		left === SEMANTIC_NUMERIC_OPERAND_BOUNDARY ||
		(left !== undefined && DECIMAL_DIGIT_RE.test(left));

	if (
		leftIsNumeric &&
		getSemanticSignedNumericOperandSign(value, index + 1) !== undefined
	) {
		return 'modulo';
	}

	return undefined;
}

function getCaretReplacement(value: string, index: number): string | undefined {
	const context = getBinaryContext(value, index, index + 1);

	if (context === undefined) {
		return undefined;
	}

	const looksLikeExponentiation =
		context.rightIsNumeric && (context.leftIsNumeric || !context.padded);

	return looksLikeExponentiation ? 'to-the-power-of' : 'xor';
}

/** Speak operators after earlier stages have established their operand contexts. */
export function applyContextualSymbolMappings(structured: string): string {
	const numericSlashIndexes = getNumericSlashIndexes(structured);
	const output: string[] = [];

	for (let index = 0; index < structured.length;) {
		const character = getCodePointAt(structured, index);

		if (character === undefined) {
			break;
		}

		if (character === SEMANTIC_NUMERIC_OPERAND_BOUNDARY) {
			index += character.length;
			continue;
		}

		if (isConditionalBoundary(character)) {
			output.push(
				character === CONDITIONAL_THEN_BOUNDARY ? ' then ' : ' else ',
			);
			index += character.length;
			continue;
		}

		if (character === '%') {
			const replacement = getPercentReplacement(structured, index);

			if (replacement !== undefined) {
				output.push(` ${replacement} `);
				index += 1;
				continue;
			}
		}

		if (character === '^') {
			const replacement = getCaretReplacement(structured, index);

			if (replacement !== undefined) {
				output.push(` ${replacement} `);
				index += 1;
				continue;
			}
		}

		let matchedOperator = false;

		for (const mapping of contextualOperatorMappingsByInitial.get(
			character,
		) ?? []) {
			if (!structured.startsWith(mapping.source, index)) {
				continue;
			}

			if (mapping.source === '/' && numericSlashIndexes.has(index)) {
				continue;
			}

			const end = index + mapping.source.length;
			if (
				(mapping.source === '-' || mapping.source === '/') &&
				hasProseOperands(structured, index, end)
			) {
				continue;
			}
			const context = getBinaryContext(structured, index, end);

			if (
				context === undefined ||
				!supportsOperandMode(context, mapping.operandMode ?? 'any')
			) {
				continue;
			}

			output.push(` ${mapping.replacement} `);
			index = end;
			matchedOperator = true;
			break;
		}

		if (matchedOperator) {
			continue;
		}

		output.push(character);
		index += character.length;
	}

	return output.join('');
}
