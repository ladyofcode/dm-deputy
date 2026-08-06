import { getCachedCampaignMaps } from '$lib/db/cache';
import type { CampaignMap } from '$lib/types/schema';
import { trackCampaignMapsRevision } from '$lib/stores/campaign-maps-revision.svelte';

class CampaignMapsState {
	forCampaign(campaignId: string): CampaignMap[] {
		trackCampaignMapsRevision();
		return getCachedCampaignMaps()
			.filter((map) => map.campaign_id === campaignId)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	all(): CampaignMap[] {
		trackCampaignMapsRevision();
		return getCachedCampaignMaps().sort((a, b) => a.name.localeCompare(b.name));
	}

	byId(mapId: string): CampaignMap | undefined {
		trackCampaignMapsRevision();
		return getCachedCampaignMaps().find((map) => map.map_id === mapId);
	}
}

export const campaignMaps = new CampaignMapsState();

export { bumpCampaignMapsRevision } from '$lib/stores/campaign-maps-revision.svelte';

export function getReactiveCampaignMapsForCampaign(campaignId: string): CampaignMap[] {
	return campaignMaps.forCampaign(campaignId);
}

export function getReactiveAllCampaignMaps(): CampaignMap[] {
	return campaignMaps.all();
}

export function getReactiveCampaignMapById(mapId: string): CampaignMap | undefined {
	return campaignMaps.byId(mapId);
}
