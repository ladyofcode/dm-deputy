import type { Adventure, Campaign } from '$lib/types/schema';

export function getCampaignDisplayName(campaign: Pick<Campaign, 'nickname' | 'campaign_name'>): string {
	return campaign.nickname?.trim() || campaign.campaign_name;
}

export function getAdventureDisplayName(adventure: Pick<Adventure, 'shorthand' | 'name'>): string {
	return adventure.shorthand?.trim() || adventure.name;
}
