import type { Part } from '$lib/types/schema';

const STORAGE_PREFIX = 'dm-deputy:part-order';

export function getStoredPartOrder(adventureId: string): string[] | null {
	if (typeof localStorage === 'undefined') return null;

	const raw = localStorage.getItem(`${STORAGE_PREFIX}:${adventureId}`);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

export function setStoredPartOrder(adventureId: string, partIds: string[]): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(`${STORAGE_PREFIX}:${adventureId}`, JSON.stringify(partIds));
}

export function applyPartIdOrder(parts: Part[], order: string[]): Part[] {
	const byId = new Map(parts.map((part) => [part.part_id, part]));
	const ordered: Part[] = [];

	for (const partId of order) {
		const part = byId.get(partId);
		if (part) {
			ordered.push(part);
			byId.delete(partId);
		}
	}

	for (const part of byId.values()) {
		ordered.push(part);
	}

	return ordered.map((part, index) => ({ ...part, sort_order: index + 1 }));
}

export function sortPartsByOrder(parts: Part[]): Part[] {
	return [...parts].sort((left, right) => Number(left.sort_order) - Number(right.sort_order));
}
