import { tick } from 'svelte';

export async function focusDraftRowInput(
	getInput: () => HTMLInputElement | HTMLSelectElement | undefined
): Promise<void> {
	await tick();
	getInput()?.focus();
}
