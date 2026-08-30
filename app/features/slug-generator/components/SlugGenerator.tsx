import { Input } from '~/components/ui/input';
import { useState } from 'react';
import { slugify } from '~/features/slug-generator/utils/slugify';

export default function SlugGenerator() {
	const [text, setText] = useState('');
	const slug = slugify(text);

	return (
		<div className="flex flex-col gap-4 p-5">
			<Input
				value={text}
				onChange={(event) => setText(event.target.value)}
			/>
			<output aira-live="polite">{slug}</output>
		</div>
	);
}
