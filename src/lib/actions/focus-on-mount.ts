import type { Attachment } from 'svelte/attachments';

export function focusOnMount(): Attachment<HTMLElement> {
	return (element) => {
		element.focus();
	};
}
