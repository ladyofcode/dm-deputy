import { assignPartOrder, partOrderSnapshot, reorderParts } from '$lib/domain/part-reorder';
import type { Part } from '$lib/types/schema';

export function createPartReorder(onCommit: (parts: Part[]) => Promise<void>) {
	let displayParts = $state<Part[]>([]);
	let draggedPartId = $state<string | null>(null);
	let dragOrderSnapshot = $state('');
	let isReordering = $state(false);

	function movePartOverTarget(targetPartId: string) {
		if (!draggedPartId || draggedPartId === targetPartId) return;

		const fromIndex = displayParts.findIndex((part) => part.part_id === draggedPartId);
		const toIndex = displayParts.findIndex((part) => part.part_id === targetPartId);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

		displayParts = reorderParts(displayParts, fromIndex, toIndex);
	}

	function handleWindowPointerMove(event: PointerEvent) {
		if (!draggedPartId) return;

		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest('[data-part-id]');
		const targetPartId = target?.getAttribute('data-part-id');
		if (targetPartId) {
			movePartOverTarget(targetPartId);
		}
	}

	async function finishReorder() {
		if (!draggedPartId || isReordering) return;

		const nextParts = displayParts;
		const orderChanged = partOrderSnapshot(nextParts) !== dragOrderSnapshot;

		draggedPartId = null;
		dragOrderSnapshot = '';

		if (!orderChanged) return;

		isReordering = true;
		try {
			await onCommit(nextParts);
		} finally {
			isReordering = false;
		}
	}

	function handleWindowPointerUp() {
		void finishReorder();
	}

	function handleHandlePointerDown(partId: string, event: PointerEvent) {
		if (event.button !== 0) return;

		event.preventDefault();
		draggedPartId = partId;
		dragOrderSnapshot = partOrderSnapshot(displayParts);
	}

	function setDisplayParts(parts: Part[]) {
		displayParts = parts;
	}

	function commitDisplayParts(parts: Part[]) {
		displayParts = assignPartOrder(parts);
	}

	return {
		get displayParts() {
			return displayParts;
		},
		get draggedPartId() {
			return draggedPartId;
		},
		get isReordering() {
			return isReordering;
		},
		setDisplayParts,
		commitDisplayParts,
		handleWindowPointerMove,
		handleWindowPointerUp,
		handleHandlePointerDown
	};
}
