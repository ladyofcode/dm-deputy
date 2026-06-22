import { loadCampaignMapBlobInDb } from '$lib/db/client';
import { getCampaignMapById } from '$lib/data';

type BlobVariant = 'thumb' | 'full';

const urlCache = new Map<string, string>();

function cacheKey(mapId: string, variant: BlobVariant): string {
	return `${mapId}:${variant}`;
}

export async function getCampaignMapObjectUrl(
	mapId: string,
	variant: BlobVariant
): Promise<string | null> {
	const key = cacheKey(mapId, variant);
	const cached = urlCache.get(key);
	if (cached) return cached;

	const buffer = await loadCampaignMapBlobInDb(mapId, variant);
	if (!buffer) return null;

	const mimeType = getCampaignMapById(mapId)?.mime_type ?? 'image/jpeg';
	const blob = new Blob([buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	urlCache.set(key, url);
	return url;
}

export function revokeCampaignMapObjectUrls(mapId: string): void {
	for (const variant of ['thumb', 'full'] as const) {
		const key = cacheKey(mapId, variant);
		const url = urlCache.get(key);
		if (!url) continue;

		URL.revokeObjectURL(url);
		urlCache.delete(key);
	}
}

export function clearCampaignMapObjectUrlCache(): void {
	for (const url of urlCache.values()) {
		URL.revokeObjectURL(url);
	}

	urlCache.clear();
}
