export const vulgarFractions: Readonly<Record<string, string>> = {
	'¼': 'one-quarter',
	'½': 'one-half',
	'¾': 'three-quarters',
	'⅐': 'one-seventh',
	'⅑': 'one-ninth',
	'⅒': 'one-tenth',
	'⅓': 'one-third',
	'⅔': 'two-thirds',
	'⅕': 'one-fifth',
	'⅖': 'two-fifths',
	'⅗': 'three-fifths',
	'⅘': 'four-fifths',
	'⅙': 'one-sixth',
	'⅚': 'five-sixths',
	'⅛': 'one-eighth',
	'⅜': 'three-eighths',
	'⅝': 'five-eighths',
	'⅞': 'seven-eighths',
};

export const musicalAccidentals: Readonly<Record<string, string>> = {
	'♯': 'sharp',
	'♭': 'flat',
	'♮': 'natural',
	'𝄪': 'double-sharp',
	'𝄫': 'double-flat',
};

export const negatedComparisons: Readonly<Record<string, string>> = {
	'≮': 'not-less-than',
	'≯': 'not-greater-than',
	'≰': 'not-less-than-or-equal-to',
	'≱': 'not-greater-than-or-equal-to',
};

/** Preserve distinctions that compatibility decomposition would erase. */
export const SUPERSCRIPT_RE = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ]$/u;

export const SUBSCRIPT_RE = /^[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ]$/u;

export const PRIME_COUNTS: Readonly<Record<string, number>> = {
	'′': 1,
	'″': 2,
	'‴': 3,
	'⁗': 4,
};

export const MATH_PREFIX_SYMBOLS = new Set(Array.from('√∛∜∑∏∐∫∬∭∮∯∰∇∂'));

export const MATH_CONSTANT_SYMBOLS = new Set(Array.from('∞∅ℵℶℷℸ⊤⊥'));

export const MATHEMATICAL_ALPHABETS: Readonly<Record<string, string>> = {
	ℕ: 'natural-numbers',
	ℤ: 'integers',
	ℚ: 'rational-numbers',
	ℝ: 'real-numbers',
	ℂ: 'complex-numbers',
	ℍ: 'quaternions',
	'𝔽': 'field',
};

export const MATH_WRAPPERS: Readonly<
	Record<string, readonly [string, string]>
> = {
	'⌊': ['⌋', 'floor'],
	'⌈': ['⌉', 'ceiling'],
	'⟨': ['⟩', 'angle-bracket'],
	'⟦': ['⟧', 'double-bracket'],
};
