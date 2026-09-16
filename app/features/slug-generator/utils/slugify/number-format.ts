const NUMERIC_COLLATOR = new Intl.Collator('en', { numeric: true });

export function isNumericOne(value: string): boolean {
	const [whole, fraction] = value.split('.');

	return (
		NUMERIC_COLLATOR.compare(whole, '1') === 0 &&
		(fraction === undefined ||
			NUMERIC_COLLATOR.compare(fraction, '0') === 0)
	);
}
