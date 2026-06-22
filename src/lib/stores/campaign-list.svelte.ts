import { getCampaignById } from '$lib/data';
import { getCampaignListForUser, type CampaignListEntry } from '$lib/data/campaign-list';

class CampaignListState {
	revision = $state(0);

	bump(): void {
		this.revision += 1;
	}

	forUser(userId: string): CampaignListEntry[] {
		void this.revision;
		return getCampaignListForUser(userId);
	}

	forCampaign(campaignId: string) {
		void this.revision;
		return getCampaignById(campaignId);
	}
}

export const campaignList = new CampaignListState();

export function bumpCampaignListRevision(): void {
	campaignList.bump();
}

export function getReactiveCampaignListForUser(userId: string): CampaignListEntry[] {
	return campaignList.forUser(userId);
}

export function getReactiveCampaignById(campaignId: string) {
	return campaignList.forCampaign(campaignId);
}
