import type { CampaignTheme, ThemePreset } from '$lib/themes/types';

class PreferencesState {
	userThemes = $state<Record<string, ThemePreset>>({});
	campaignThemes = $state<Record<string, CampaignTheme>>({});

	setUserTheme(userId: string, theme: ThemePreset) {
		this.userThemes = { ...this.userThemes, [userId]: theme };
	}

	setCampaignTheme(campaignId: string, theme: CampaignTheme) {
		this.campaignThemes = { ...this.campaignThemes, [campaignId]: theme };
	}
}

export const preferences = new PreferencesState();
