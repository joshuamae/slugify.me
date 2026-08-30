import { Input } from '~/components/ui/input';
import { useState } from 'react';
import { slugify } from '~/features/slug-generator/utils/slugify';

export default function SlugGenerator() {
	const [text, setText] = useState('');
	const slug = slugify(text);

	return (
		<div className="flex flex-col gap-4 p-5">
			<Input
				aria-label="Text to slugify"
				placeholder="Enter text"
				value={text}
				onChange={(event) => setText(event.target.value)}
			/>
			<output aria-label="Generated slug" aria-live="polite">
				{slug}
			</output>
		</div>
	);
}
