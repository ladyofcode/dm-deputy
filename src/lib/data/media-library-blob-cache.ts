import { loadMediaLibraryBlobInDb } from '$lib/db/client';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';
import { getMediaLibraryAssetById } from '$lib/stores/media-library.svelte';

const cache = createBlobUrlCache(
	(mediaId, variant) => {
		if (variant === 'original') return Promise.resolve(null);
		return loadMediaLibraryBlobInDb(mediaId, variant);
	},
	(mediaId) => getMediaLibraryAssetById(mediaId)?.mime_type ?? 'image/jpeg'
);

export const getMediaLibraryObjectUrl = cache.getObjectUrl;
export const clearMediaLibraryObjectUrlCache = cache.clear;

export async function getMediaLibraryThumbUrl(mediaId: string): Promise<string | null> {
	return getMediaLibraryObjectUrl(mediaId, 'thumb');
}

export async function getMediaLibraryFullUrl(mediaId: string): Promise<string | null> {
	return getMediaLibraryObjectUrl(mediaId, 'full');
}
