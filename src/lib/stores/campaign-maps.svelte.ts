import { getCachedCampaignMaps } from '$lib/db/cache';
import type { CampaignMap } from '$lib/types/schema';

class CampaignMapsState {
	revision = $state(0);

	bump(): void {
		this.revision += 1;
	}

	track(): number {
		return this.revision;
	}

	forCampaign(campaignId: string): CampaignMap[] {
		this.track();
		return getCachedCampaignMaps()
			.filter((map) => map.campaign_id === campaignId)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	all(): CampaignMap[] {
		this.track();
		return getCachedCampaignMaps().sort((a, b) => a.name.localeCompare(b.name));
	}

	byId(mapId: string): CampaignMap | undefined {
		this.track();
		return getCachedCampaignMaps().find((map) => map.map_id === mapId);
	}
}

export const campaignMaps = new CampaignMapsState();

export function bumpCampaignMapsRevision(): void {
	campaignMaps.bump();
}

export function getReactiveCampaignMapsForCampaign(campaignId: string): CampaignMap[] {
	return campaignMaps.forCampaign(campaignId);
}

export function getReactiveAllCampaignMaps(): CampaignMap[] {
	return campaignMaps.all();
}

export function getReactiveCampaignMapById(mapId: string): CampaignMap | undefined {
	return campaignMaps.byId(mapId);
}
