import { loadMediaLibrarySnapshot } from '$lib/db/client';
import type { MediaAsset } from '$lib/domain/media-asset';
import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

let items: MediaAsset[] = [];
let loadPromise: Promise<void> | null = null;

export function getMediaLibraryItems(): MediaAsset[] {
	revision.track();
	return items;
}

export function getMediaLibraryItemById(mediaId: string): MediaAsset | undefined {
	revision.track();
	return items.find((item) => item.media_id === mediaId);
}

export function clearMediaLibraryCache(): void {
	items = [];
	loadPromise = null;
	revision.bump();
}

export async function ensureMediaLibraryLoaded(forceReload = false): Promise<void> {
	if (!forceReload && items.length > 0) return;

	if (!forceReload && loadPromise) {
		return loadPromise;
	}

	const run = (async () => {
		items = await loadMediaLibrarySnapshot();
		revision.bump();
	})();

	loadPromise = run;

	try {
		await run;
	} finally {
		if (loadPromise === run) {
			loadPromise = null;
		}
	}
}

export function refreshMediaLibrary(): Promise<void> {
	clearMediaLibraryCache();
	return ensureMediaLibraryLoaded(true);
}
