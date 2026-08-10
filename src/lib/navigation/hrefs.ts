import { resolve } from '$app/paths';

export function sanitizeReturnTo(value: string | null | undefined): string | null {
	if (!value) return null;
	if (!value.startsWith('/') || value.startsWith('//')) return null;
	return value;
}

export function resolveCampaignHref(campaignId: string) {
	return resolve('/campaigns/[campaignId]', { campaignId });
}

export function resolveSessionZeroHref(campaignId: string) {
	return resolve('/campaigns/[campaignId]/session-0', { campaignId });
}

export function resolveCharacterHref(characterId: string, options?: { returnTo?: string | null }) {
	const href = resolve('/library/characters/[characterId]', { characterId });
	const returnTo = sanitizeReturnTo(options?.returnTo);
	if (!returnTo) return href;

	const params = new URLSearchParams({ from: returnTo });
	return `${href}?${params.toString()}`;
}

export function resolveTemplateHref(templateId: string) {
	return resolve('/templates/[templateId]', { templateId });
}

export function resolveLibraryCharactersHref(options?: { section?: 'templates' }) {
	return options?.section === 'templates'
		? resolve('/library/players#templates')
		: resolve('/library/players');
}
