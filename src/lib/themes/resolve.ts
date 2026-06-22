import { getCampaignById, getUserById } from '$lib/data';
import { preferences } from '$lib/stores/preferences.svelte';
import { getStoredCampaignTheme, getStoredUserTheme } from '$lib/themes/storage';
import type { CampaignTheme, ThemePreset } from './types';

export function getUserTheme(
	userId: string,
	userThemes: Record<string, ThemePreset> = preferences.userThemes
): ThemePreset {
	return (
		userThemes[userId] ?? getStoredUserTheme(userId) ?? getUserById(userId)?.theme ?? 'default'
	);
}

export function getCampaignTheme(
	campaignId: string,
	campaignThemes: Record<string, CampaignTheme> = preferences.campaignThemes
): CampaignTheme {
	return (
		campaignThemes[campaignId] ??
		getStoredCampaignTheme(campaignId) ??
		getCampaignById(campaignId)?.theme ??
		'default'
	);
}

export function resolveActiveTheme(
	userId: string,
	campaignId: string | undefined,
	userThemes: Record<string, ThemePreset> = preferences.userThemes,
	campaignThemes: Record<string, CampaignTheme> = preferences.campaignThemes
): ThemePreset {
	if (campaignId) {
		const campaignTheme = getCampaignTheme(campaignId, campaignThemes);
		if (campaignTheme !== 'default') {
			return campaignTheme;
		}
	}

	return getUserTheme(userId, userThemes);
}
