import { getCachedCampaignMembers, getCachedCampaigns } from '$lib/db/cache';
import type { Campaign } from '$lib/types/schema';

function getCampaignById(campaignId: string): Campaign | undefined {
	return getCachedCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

export type CampaignActivity = {
	label: 'Last played' | 'Created';
	at: string;
};

export type CampaignListEntry = {
	campaign: Campaign;
	activity: CampaignActivity;
};

export function getCampaignActivity(campaignId: string): CampaignActivity {
	const campaign = getCampaignById(campaignId);
	let latestPlayed: string | null = null;

	for (const member of getCachedCampaignMembers()) {
		if (member.campaign_id !== campaignId || !member.last_played_at) continue;
		if (!latestPlayed || member.last_played_at > latestPlayed) {
			latestPlayed = member.last_played_at;
		}
	}

	if (latestPlayed) {
		return { label: 'Last played', at: latestPlayed };
	}

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

	return getCachedCampaigns()
		.filter((campaign) => campaignIds.has(campaign.campaign_id))
		.map((campaign) => ({
			campaign,
			activity: getCampaignActivity(campaign.campaign_id)
		}))
		.sort((a, b) => b.activity.at.localeCompare(a.activity.at));
}
