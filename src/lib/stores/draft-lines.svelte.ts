import { focusDraftRowInput } from '$lib/actions/focus-draft-row';

export type DraftLineBase = {
	id: string;
};

export function createDraftLines<T extends DraftLineBase>(createEmpty: () => T) {
	let lines = $state<T[]>([createEmpty()]);

	function add() {
		lines = [...lines, createEmpty()];
	}

	function remove(lineId: string) {
		lines = lines.filter((line) => line.id !== lineId);
		if (lines.length === 0) {
			lines = [createEmpty()];
		}
	}

	async function handleEnter(
		event: KeyboardEvent,
		getFocusTarget: () => HTMLInputElement | HTMLSelectElement | undefined
	) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const newLine = createEmpty();
		lines = [...lines, newLine];
		await focusDraftRowInput(getFocusTarget);
	}

	function reset() {
		lines = [createEmpty()];
	}

	return {
		get lines() {
			return lines;
		},
		set lines(value: T[]) {
			lines = value;
		},
		add,
		remove,
		handleEnter,
		reset,
		createEmpty
	};
}
