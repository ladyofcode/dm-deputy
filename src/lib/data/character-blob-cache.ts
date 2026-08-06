import { loadCharacterPortraitBlobInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';

type BlobVariant = 'thumb' | 'full';

const urlCache = new Map<string, string>();

function cacheKey(characterId: string, variant: BlobVariant): string {
	return `${characterId}:${variant}`;
}

export async function getCharacterPortraitObjectUrl(
	characterId: string,
	variant: BlobVariant
): Promise<string | null> {
	const key = cacheKey(characterId, variant);
	const cached = urlCache.get(key);
	if (cached) return cached;

	const buffer = await loadCharacterPortraitBlobInDb(characterId, variant);
	if (!buffer) return null;

	const mimeType = getCharacterById(characterId)?.mime_type ?? 'image/jpeg';
	const blob = new Blob([buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	urlCache.set(key, url);
	return url;
}

export function revokeCharacterPortraitObjectUrls(characterId: string): void {
	for (const variant of ['thumb', 'full'] as const) {
		const key = cacheKey(characterId, variant);
		const url = urlCache.get(key);
		if (!url) continue;

		URL.revokeObjectURL(url);
		urlCache.delete(key);
	}
}

export function clearCharacterPortraitObjectUrlCache(): void {
	for (const url of urlCache.values()) {
		URL.revokeObjectURL(url);
	}

	urlCache.clear();
}
