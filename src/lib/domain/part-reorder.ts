import type { Part } from '$lib/types/schema';

export function assignPartOrder(items: Part[]): Part[] {
	return items.map((part, index) => ({ ...part, sort_order: index + 1 }));
}

export function reorderParts(items: Part[], fromIndex: number, toIndex: number): Part[] {
	if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;

	const next = [...items];
	const [moved] = next.splice(fromIndex, 1);
	if (!moved) return items;

	next.splice(toIndex, 0, moved);
	return assignPartOrder(next);
}

export function partOrderSnapshot(parts: Part[]): string {
	return parts.map((part) => part.part_id).join('\n');
}
