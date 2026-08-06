import type { NodePosition } from '$lib/data/part-story-layout';

const PAN_STORAGE_PREFIX = 'dm-deputy:part-canvas-pan:';

export type PartCanvasPan = NodePosition;

export function loadPartCanvasPan(partId: string): PartCanvasPan | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(`${PAN_STORAGE_PREFIX}${partId}`);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as PartCanvasPan;
		if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;

		return parsed;
	} catch {
		return null;
	}
}

export function savePartCanvasPan(partId: string, pan: PartCanvasPan): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(`${PAN_STORAGE_PREFIX}${partId}`, JSON.stringify(pan));
}

export function centerPanForBounds(
	viewportWidth: number,
	viewportHeight: number,
	bounds: { minX: number; minY: number; maxX: number; maxY: number }
): PartCanvasPan {
	return {
		x: viewportWidth / 2 - (bounds.minX + bounds.maxX) / 2,
		y: viewportHeight / 2 - (bounds.minY + bounds.maxY) / 2
	};
}
