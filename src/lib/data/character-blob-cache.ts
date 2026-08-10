import { loadCharacterPortraitBlobInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';

const cache = createBlobUrlCache(
	(characterId, variant) => loadCharacterPortraitBlobInDb(characterId, variant),
	(characterId, variant) => {
		const character = getCharacterById(characterId);
		if (!character) return 'image/jpeg';

		if (variant === 'original') {
			return character.original_mime_type ?? character.mime_type ?? 'image/jpeg';
		}

		return character.mime_type ?? 'image/jpeg';
	}
);

export const getCharacterPortraitObjectUrl = cache.getObjectUrl;
export const revokeCharacterPortraitObjectUrls = cache.revokeObjectUrls;
export const clearCharacterPortraitObjectUrlCache = cache.clear;

export async function getCharacterPortraitCropSourceUrl(
	characterId: string
): Promise<string | null> {
	return (
		(await getCharacterPortraitObjectUrl(characterId, 'original')) ??
		(await getCharacterPortraitObjectUrl(characterId, 'full'))
	);
}
