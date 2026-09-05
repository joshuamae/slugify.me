import {
	CONTEXT_PADDING_RE,
	getCodePointAt,
	getCodePointBefore,
	WORD_CHARACTER_RE,
} from './character-context';
import {
	musicalAccidentals,
	negatedComparisons,
	vulgarFractions,
} from './data/notation';
import { isNumericOne } from './number-format';
import { type NotationSpan, replaceNotationSpans } from './notation-spans';
import { getBinaryContext } from './operand-context';
import { SEMANTIC_NUMERIC_OPERAND_BOUNDARY } from './operand-markers';
import { URL_LIKE_RE } from './protected-spans';

const fractionNames = new Map(
	Object.entries(vulgarFractions).map(([symbol, name]) => [
		symbol.normalize('NFKD').replace('⁄', '/'),
		name,
	]),
);

const QUANTITY_UNIT =
	'(?:cups?|teaspoons?|tablespoons?|tsp|tbsp|ounces?|oz|pounds?|lbs?|inches|inch|feet|foot|ft|yards?|yd|miles?|hours?|minutes?|seconds?)\\b';

const QUANTITY_FRACTION_RE = new RegExp(
	`(?<![\\p{L}\\p{N}./])(?:([0-9]+)[ \\t]+)?([0-9]+)/([1-9][0-9]*)(?=[ \\t-]+${QUANTITY_UNIT})`,
	'gu',
);

const QUANTITY_LEADING_DECIMAL_RE = new RegExp(
	`(?<![\\p{L}\\p{N}.])\\.([0-9]+)(?=[ \\t]+${QUANTITY_UNIT})`,
	'gu',
);

const PRESERVED_UNICODE_MEANING_RE = new RegExp(
	`(${URL_LIKE_RE.source})|([≠≮≯≰≱])|(?<![\\p{L}\\p{N}])([\\p{Nd}]*)([¼½¾⅐-⅞])(?![\\p{L}\\p{N}])`,
	'giu',
);

function formatFraction(
	whole: string | undefined,
	numerator: string,
	denominator: string,
): string {
	const fraction =
		fractionNames.get(`${numerator}/${denominator}`) ??
		`${numerator}-over-${denominator}`;
	return `${whole ? `${whole}-and-` : ''}${fraction}`;
}

export function preserveUnicodeMeaning(input: string): string {
	const source = input.normalize('NFC');
	const spans: NotationSpan[] = [];
	for (const match of source.matchAll(PRESERVED_UNICODE_MEANING_RE)) {
		const [, url, relation, whole, fraction] = match;
		if (url !== undefined) continue;
		const start = match.index;
		const end = start + match[0].length;
		if (relation !== undefined) {
			const reading =
				relation === '≠'
					? '!='
					: getBinaryContext(source, start, end)
						? ` ${negatedComparisons[relation]} `
						: ' ';
			spans.push({ kind: 'text', start, end, reading });
		} else {
			spans.push({
				kind: 'numeric',
				start,
				end,
				reading: `${whole ? `${whole}-and-` : ''}${vulgarFractions[fraction]}`,
			});
		}
	}
	return replaceNotationSpans(source, spans);
}

function applyFractionContexts(source: string, pattern: RegExp): string {
	const spans: NotationSpan[] = [];
	for (const match of source.matchAll(pattern)) {
		spans.push({
			kind: 'numeric',
			start: match.index,
			end: match.index + match[0].length,
			reading: formatFraction(match[1], match[2], match[3]),
		});
	}
	return replaceNotationSpans(source, spans);
}

/** Resolve bounded English notation after URLs and tags have been silenced. */
export function applyEnglishNotation(input: string): string {
	const unicodeFractions = applyFractionContexts(
		input,
		/(?<![\p{L}\p{N}.⁄])(?:([0-9]+)[ \t]+)?([0-9]+)⁄([1-9][0-9]*)(?![\p{L}\p{N}⁄])/gu,
	);
	return applyFractionContexts(unicodeFractions, QUANTITY_FRACTION_RE)
		.replace(QUANTITY_LEADING_DECIMAL_RE, '0.$1')
		.replace(/(?<=[a-z])(?:ʼ|\u00ad)(?=[a-z])/gu, '')
		.replace(
			/(?<![\p{L}\p{N}])ʼ(?=(?:tis|twas|twere|twill|twould|em|cause)\b)/gu,
			'',
		)
		.replace(
			/(?<![\p{L}\p{N}])([a-g])(♯|♭|♮|𝄪|𝄫)([0-9]*)(?![\p{L}\p{N}])/gu,
			(_match, note: string, accidental: string, octave: string) =>
				`${note}-${musicalAccidentals[accidental]}${octave ? `-${octave}` : ''}`,
		)
		.replace(
			/(?<![\p{L}\p{N}#])([a-g])#(?=[ \t]+(?:major|minor|scale|chord|note|triad|arpeggio)\b)/gu,
			'$1-sharp',
		)
		.replace(
			/(?<![\p{L}\p{N}])((?:ab|[abo]|rh))([+−-])(?=[ \t]+(?:blood|donor|recipient|type)\b)/gu,
			(_match, group: string, sign: string) =>
				`${group}-${sign === '+' ? 'positive' : 'negative'}`,
		)
		.replace(
			/\b(blood(?:[ \t]+(?:type|group))?|type|group|rhesus|rh)[ \t]+(ab|[abo]|rh)([+−-])(?![\p{L}\p{N}+−-])/gu,
			(_match, context: string, group: string, sign: string) =>
				`${context} ${group}-${sign === '+' ? 'positive' : 'negative'}`,
		)
		.replace(
			/\b(grade|graded|score|rating)[ \t]+([abcdf])([+−-])(?![\p{L}\p{N}+−-])/gu,
			(_match, context: string, grade: string, sign: string) =>
				`${context} ${grade}-${sign === '+' ? 'plus' : 'minus'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}])([abcdf])([+−-])(?=[ \t]+(?:grade|student|pupil|work|score|rating)\b)/gu,
			(_match, grade: string, sign: string) =>
				`${grade}-${sign === '+' ? 'plus' : 'minus'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.,/+−-])([0-9]+)\+(?=$|[ \t]+[a-z]{2,}\b)/gu,
			'$1-plus',
		)
		.replace(
			/\b(open|available|accessible|operating|online)[ \t]+24[ \t]*\/[ \t]*7(?![\p{L}\p{N}./])/gu,
			'$1 24-7',
		)
		.replace(
			/(?<![\p{L}\p{N}./])24[ \t]*\/[ \t]*7(?=[ \t]+(?:support|service|access|availability|coverage|operation|monitoring|care)\b)/gu,
			'24-7',
		)
		.replace(
			/(?<![\p{L}\p{N}./])9[ \t]*\/[ \t]*11(?=[ \t]+(?:memorial|attacks|anniversary|remembrance)\b)/gu,
			'9-11',
		)
		.replace(
			/(?<![\p{L}\p{N}./])([1-9][0-9]*)[ \t]*\/[ \t]*([1-9][0-9]*)(?=[ \t]+(?:time|meter|metre|time-signature)\b)/gu,
			'$1-$2',
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*°[ \t]*([cf])(?![\p{L}\p{N}])/gu,
			(_match, amount: string, scale: string) =>
				`${amount}-${isNumericOne(amount) ? 'degree' : 'degrees'}-${scale === 'c' ? 'celsius' : 'fahrenheit'}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*([‰‱])(?!\p{N})/gu,
			(_match, amount: string, symbol: string) =>
				`${amount}-${symbol === '‰' ? 'per-mille' : 'per-ten-thousand'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
		)
		.replace(
			/(?<![\p{L}\p{N}.])([0-9]+(?:\.[0-9]+)?)[ \t]*°(?![\p{L}\p{N}])/gu,
			(_match, amount: string) =>
				`${amount}-${isNumericOne(amount) ? 'degree' : 'degrees'}${SEMANTIC_NUMERIC_OPERAND_BOUNDARY}`,
		)
		.replace(
			/(^|[ \t(])([+−-])(?=[0-9]+(?:\.[0-9]+)?-degrees?-(?:celsius|fahrenheit)\b)/gu,
			(_match, prefix: string, sign: string) =>
				`${prefix}${sign === '+' ? 'positive' : 'negative'}-`,
		)
		.replace(
			/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([ \t]*)−(?=[ \t]*\p{Nd})/gu,
			'$1$2-',
		)
		.replace(
			/(^|[-=+*/^<>&|?:,@([{\r\n\u2028\u2029])([ \t]*)±(?=[ \t]*\p{Nd})/gu,
			'$1$2plus-or-minus-',
		);
}

/** Full words around a spaced dash or slash indicate prose, not algebra. */
export function hasProseOperands(
	value: string,
	start: number,
	end: number,
): boolean {
	let leftEnd = start;
	let rightStart = end;

	while (leftEnd > 0 && CONTEXT_PADDING_RE.test(value[leftEnd - 1])) {
		leftEnd -= 1;
	}
	while (
		rightStart < value.length &&
		CONTEXT_PADDING_RE.test(value[rightStart])
	) {
		rightStart += 1;
	}
	if (leftEnd === start || rightStart === end) {
		return false;
	}

	let leftStart = leftEnd;
	let rightEnd = rightStart;
	let leftLetters = 0;
	let rightLetters = 0;
	while (leftStart > 0) {
		const character = getCodePointBefore(value, leftStart);
		if (character === undefined || !/^\p{L}$/u.test(character)) break;
		leftStart -= character.length;
		leftLetters += 1;
	}
	while (rightEnd < value.length) {
		const character = getCodePointAt(value, rightEnd);
		if (character === undefined || !/^\p{L}$/u.test(character)) break;
		rightEnd += character.length;
		rightLetters += 1;
	}

	return (
		leftStart < leftEnd &&
		rightStart < rightEnd &&
		(leftLetters > 1 || rightLetters > 1) &&
		!WORD_CHARACTER_RE.test(getCodePointBefore(value, leftStart) ?? '') &&
		!WORD_CHARACTER_RE.test(getCodePointAt(value, rightEnd) ?? '')
	);
}
