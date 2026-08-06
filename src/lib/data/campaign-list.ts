import { getCachedCampaignMembers, getCachedCampaigns } from '$lib/db/cache';
import type { Campaign } from '$lib/types/schema';

function getCampaignById(campaignId: string): Campaign | undefined {
	return getCachedCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

function buildLatestPlayedByCampaignId(): Map<string, string> {
	const latestByCampaign = new Map<string, string>();

	for (const member of getCachedCampaignMembers()) {
		if (!member.last_played_at) continue;

		const current = latestByCampaign.get(member.campaign_id);
		if (!current || member.last_played_at > current) {
			latestByCampaign.set(member.campaign_id, member.last_played_at);
		}
	}

	return latestByCampaign;
}

export type CampaignActivity = {
	label: 'Last played' | 'Created';
	at: string;
};

export type CampaignListEntry = {
	campaign: Campaign;
	activity: CampaignActivity;
};

export function getCampaignActivity(
	campaignId: string,
	latestPlayedByCampaignId = buildLatestPlayedByCampaignId()
): CampaignActivity {
	const latestPlayed = latestPlayedByCampaignId.get(campaignId);

	if (latestPlayed) {
		return { label: 'Last played', at: latestPlayed };
	}

	const campaign = getCampaignById(campaignId);
	return { label: 'Created', at: campaign?.date_created ?? '' };
}

export function getCampaignListForUser(userId: string): CampaignListEntry[] {
	const campaignIds = new Set<string>();

	for (const campaign of getCachedCampaigns()) {
		if (campaign.owner_user_id === userId) {
			campaignIds.add(campaign.campaign_id);
		}
	}

	for (const member of getCachedCampaignMembers()) {
		if (member.user_id === userId) {
			campaignIds.add(member.campaign_id);
		}
	}

	const latestPlayedByCampaignId = buildLatestPlayedByCampaignId();

	return getCachedCampaigns()
		.filter((campaign) => campaignIds.has(campaign.campaign_id))
		.map((campaign) => ({
			campaign,
			activity: getCampaignActivity(campaign.campaign_id, latestPlayedByCampaignId)
		}))
		.sort((a, b) => b.activity.at.localeCompare(a.activity.at));
}
