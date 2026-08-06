import { loadCharacterPortraitBlobInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';

const cache = createBlobUrlCache(
	(characterId, variant) => loadCharacterPortraitBlobInDb(characterId, variant),
	(characterId) => getCharacterById(characterId)?.mime_type ?? 'image/jpeg'
);

export const getCharacterPortraitObjectUrl = cache.getObjectUrl;
export const revokeCharacterPortraitObjectUrls = cache.revokeObjectUrls;
export const clearCharacterPortraitObjectUrlCache = cache.clear;
