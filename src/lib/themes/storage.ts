import { LOCAL_USER_ID } from '$lib/constants/user';
import type { CampaignTheme, ThemePreset } from './types';

const STORAGE_PREFIX = 'dm-deputy:theme';

function isThemePreset(value: string | null): value is ThemePreset {
	return value === 'default' || value === 'medieval';
}

function isCampaignTheme(value: string | null): value is CampaignTheme {
	return value === 'default' || value === 'medieval';
}

export function getStoredUserTheme(userId: string): ThemePreset | null {
	if (typeof localStorage === 'undefined') return null;

	const stored = localStorage.getItem(`${STORAGE_PREFIX}:user:${userId}`);
	return isThemePreset(stored) ? stored : null;
}

export function setStoredUserTheme(userId: string, theme: ThemePreset): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(`${STORAGE_PREFIX}:user:${userId}`, theme);
}

export function getStoredCampaignTheme(campaignId: string): CampaignTheme | null {
	if (typeof localStorage === 'undefined') return null;

	const stored = localStorage.getItem(`${STORAGE_PREFIX}:campaign:${campaignId}`);
	return isCampaignTheme(stored) ? stored : null;
}

export function setStoredCampaignTheme(campaignId: string, theme: CampaignTheme): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(`${STORAGE_PREFIX}:campaign:${campaignId}`, theme);
}

export function parseCampaignIdFromPath(pathname: string): string | undefined {
	const match = pathname.match(/\/campaigns\/([^/]+)/);
	return match?.[1];
}

export function resolveStoredActiveTheme(
	userId: string = LOCAL_USER_ID,
	campaignId?: string
): ThemePreset {
	if (campaignId) {
		const campaignTheme = getStoredCampaignTheme(campaignId);
		if (campaignTheme && campaignTheme !== 'default') {
			return campaignTheme;
		}
	}

	return getStoredUserTheme(userId) ?? 'default';
}
