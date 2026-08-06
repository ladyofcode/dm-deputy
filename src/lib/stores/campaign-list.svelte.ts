import { getCachedCampaigns } from '$lib/db/cache';
import { getCampaignListForUser, type CampaignListEntry } from '$lib/data/campaign-list';
import type { Campaign } from '$lib/types/schema';
import { trackCampaignListRevision } from '$lib/stores/campaign-list-revision.svelte';

function getCampaignById(campaignId: string): Campaign | undefined {
	return getCachedCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

class CampaignListState {
	forUser(userId: string): CampaignListEntry[] {
		void trackCampaignListRevision();
		return getCampaignListForUser(userId);
	}

	forCampaign(campaignId: string) {
		void trackCampaignListRevision();
		return getCampaignById(campaignId);
	}
}

export const campaignList = new CampaignListState();

export { bumpCampaignListRevision } from '$lib/stores/campaign-list-revision.svelte';

export function getReactiveCampaignListForUser(userId: string): CampaignListEntry[] {
	return campaignList.forUser(userId);
}

export function getReactiveCampaignById(campaignId: string) {
	return campaignList.forCampaign(campaignId);
}
