import { resolve } from '$app/paths';

export function resolveCampaignHref(campaignId: string) {
	return resolve('/campaigns/[campaignId]', { campaignId });
}

export function resolveCharacterHref(campaignId: string, characterId: string) {
	return resolve('/campaigns/[campaignId]/characters/[characterId]', { campaignId, characterId });
}
