import { Textarea } from '~/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field';
import { useState } from 'react';
import { slugify } from '~/features/slug-generator/utils/slugify';
import { Copy, Check } from 'lucide-react';
import { Button } from '~/components/ui/button';

export default function SlugGenerator() {
	const [text, setText] = useState('');
	const [copied, setCopied] = useState(false);
	const [copyMessage, setCopyMessage] = useState('');
	const slug = slugify(text);

	async function handleCopy() {
		if (!slug) return;

		try {
			await navigator.clipboard.writeText(slug);
			setCopied(true);
			setCopyMessage('Slug copied to clipboard');

			window.setTimeout(() => {
				setCopied(false);
				setCopyMessage('');
			}, 1500);
		} catch {
			setCopied(false);
			setCopyMessage('Unable to copy slug');
		}
	}

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="text-to-slugify">
					Text to slugify
				</FieldLabel>
				<Textarea
					id="text-to-slugify"
					className="field-sizing-content max-h-40 min-h-10 resize-none"
					placeholder="Enter text"
					value={text}
					onChange={(event) => {
						setText(event.target.value);
						setCopied(false);
						setCopyMessage('');
					}}
				/>
			</Field>

			<Field>
				<div className="flex">
					<FieldLabel htmlFor="generated-slug">
						Generated slug
					</FieldLabel>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onPress={handleCopy}
						aria-label="Copy generated slug"
						isDisabled={!slug}
					>
						{copied ? (
							<Check data-icon="inline-start" />
						) : (
							<Copy data-icon="inline-start"></Copy>
						)}
					</Button>
					<span className="sr-only" role="status">
						{copyMessage}
					</span>
				</div>
				<output
					id="generated-slug"
					htmlFor="text-to-slugify"
					aria-live="polite"
					aria-atomic="true"
					className="block min-h-11 w-full min-w-0 wrap-break-word rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm leading-6"
				>
					{slug || (
						<span className="text-muted-foreground">
							Your slug will appear here
						</span>
					)}
				</output>
			</Field>
		</FieldGroup>
	);
}
