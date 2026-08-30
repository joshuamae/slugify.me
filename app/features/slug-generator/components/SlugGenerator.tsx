import { Input } from '~/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field';
import { useState } from 'react';
import { slugify } from '~/features/slug-generator/utils/slugify';

export default function SlugGenerator() {
	const [text, setText] = useState('');
	const slug = slugify(text);

	return (
		<FieldGroup className="flex flex-col gap-4 p-5">
			<Field>
				<FieldLabel htmlFor="text-to-slugify">
					Text to slugify
				</FieldLabel>
				<Input
					id="text-to-slugify"
					placeholder="Enter text"
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="generated-slug">Generated slug</FieldLabel>
				<output
					id="generated-slug"
					htmlFor="text-to-slugify"
					aria-live="polite"
					aria-atomic="true"
				>
					{slug || 'Your slug will appear here'}
				</output>
			</Field>
		</FieldGroup>
	);
}
