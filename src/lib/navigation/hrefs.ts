import { resolve } from '$app/paths';

export function resolveCampaignHref(campaignId: string) {
	return resolve('/campaigns/[campaignId]', { campaignId });
}

export function resolveSessionZeroHref(campaignId: string) {
	return resolve('/campaigns/[campaignId]/session-0', { campaignId });
}

export function resolveCharacterHref(characterId: string) {
	return resolve('/library/characters/[characterId]', { characterId });
}

export function resolveTemplateHref(templateId: string) {
	return resolve('/templates/[templateId]', { templateId });
}

export function resolveLibraryCharactersHref(options?: { section?: 'templates' }) {
	return options?.section === 'templates'
		? resolve('/library/players#templates')
		: resolve('/library/players');
}
