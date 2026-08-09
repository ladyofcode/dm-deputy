import { loadCharacterPresentationBlobInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';

const cache = createBlobUrlCache(
	(characterId, variant) => loadCharacterPresentationBlobInDb(characterId, variant),
	(characterId) => getCharacterById(characterId)?.presentation_mime_type ?? 'image/jpeg'
);

export const getCharacterPresentationObjectUrl = cache.getObjectUrl;
export const revokeCharacterPresentationObjectUrls = cache.revokeObjectUrls;
export const clearCharacterPresentationObjectUrlCache = cache.clear;
