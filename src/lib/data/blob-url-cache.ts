type BlobVariant = 'thumb' | 'full';

export type BlobUrlCache = {
	getObjectUrl: (id: string, variant: BlobVariant) => Promise<string | null>;
	revokeObjectUrls: (id: string) => void;
	clear: () => void;
};

export function createBlobUrlCache(
	loadFn: (id: string, variant: BlobVariant) => Promise<ArrayBuffer | null>,
	getMimeType?: (id: string) => string | null | undefined
): BlobUrlCache {
	const urlCache = new Map<string, string>();

	function cacheKey(id: string, variant: BlobVariant): string {
		return `${id}:${variant}`;
	}

	async function getObjectUrl(id: string, variant: BlobVariant): Promise<string | null> {
		const key = cacheKey(id, variant);
		const cached = urlCache.get(key);
		if (cached) return cached;

		const buffer = await loadFn(id, variant);
		if (!buffer) return null;

		const mimeType = getMimeType?.(id) ?? 'image/jpeg';
		const blob = new Blob([buffer], { type: mimeType });
		const url = URL.createObjectURL(blob);
		urlCache.set(key, url);
		return url;
	}

	function revokeObjectUrls(id: string): void {
		for (const variant of ['thumb', 'full'] as const) {
			const key = cacheKey(id, variant);
			const url = urlCache.get(key);
			if (!url) continue;

			URL.revokeObjectURL(url);
			urlCache.delete(key);
		}
	}

	function clear(): void {
		for (const url of urlCache.values()) {
			URL.revokeObjectURL(url);
		}

		urlCache.clear();
	}

	return { getObjectUrl, revokeObjectUrls, clear };
}
