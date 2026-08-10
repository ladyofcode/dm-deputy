import { tick } from 'svelte';

export async function focusDraftRowInput(
	getInput: () => HTMLInputElement | HTMLSelectElement | undefined,
	options?: { preventScroll?: boolean }
): Promise<void> {
	await tick();
	getInput()?.focus({ preventScroll: options?.preventScroll ?? true });
}
