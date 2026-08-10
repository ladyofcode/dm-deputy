import { loadCharacterPresentationBlobInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';

const cache = createBlobUrlCache(
	(characterId, variant) => loadCharacterPresentationBlobInDb(characterId, variant),
	(characterId, variant) => {
		const character = getCharacterById(characterId);
		if (!character) return 'image/jpeg';

		if (variant === 'original') {
			return (
				character.presentation_original_mime_type ??
				character.presentation_mime_type ??
				'image/jpeg'
			);
		}

		return character.presentation_mime_type ?? 'image/jpeg';
	}
);

export const getCharacterPresentationObjectUrl = cache.getObjectUrl;
export const revokeCharacterPresentationObjectUrls = cache.revokeObjectUrls;
export const clearCharacterPresentationObjectUrlCache = cache.clear;

export async function getCharacterPresentationCropSourceUrl(
	characterId: string
): Promise<string | null> {
	return (
		(await getCharacterPresentationObjectUrl(characterId, 'original')) ??
		(await getCharacterPresentationObjectUrl(characterId, 'full'))
	);
}
