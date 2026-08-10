import { tick } from 'svelte';

/** Keep the focused element visually fixed when layout shifts above it (e.g. list inserts). */
export async function preserveViewportAnchor<T>(run: () => Promise<T> | T): Promise<T> {
	const anchor = document.activeElement;
	const anchorTop = anchor instanceof Element ? anchor.getBoundingClientRect().top : null;

	const result = await run();
	await tick();

	if (anchor instanceof Element && anchorTop !== null) {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const delta = anchor.getBoundingClientRect().top - anchorTop;
				if (Math.abs(delta) > 0.5) {
					window.scrollBy({ top: delta, left: 0 });
				}
			});
		});
	}

	return result;
}
