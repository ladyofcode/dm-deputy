import { loadCampaignMapBlobInDb } from '$lib/db/client';
import { getCampaignMapById } from '$lib/data';
import { createBlobUrlCache } from '$lib/data/blob-url-cache';

const cache = createBlobUrlCache(
	(mapId, variant) => loadCampaignMapBlobInDb(mapId, variant),
	(mapId) => getCampaignMapById(mapId)?.mime_type ?? 'image/jpeg'
);

export const getCampaignMapObjectUrl = cache.getObjectUrl;
export const revokeCampaignMapObjectUrls = cache.revokeObjectUrls;
export const clearCampaignMapObjectUrlCache = cache.clear;
