import type { CampaignTheme, ThemePreset } from '$lib/themes/types';

class PreferencesState {
	userThemes = $state.raw<Record<string, ThemePreset>>({});
	campaignThemes = $state.raw<Record<string, CampaignTheme>>({});

	setUserTheme(userId: string, theme: ThemePreset) {
		if (this.userThemes[userId] === theme) return;
		this.userThemes = { ...this.userThemes, [userId]: theme };
	}

	setCampaignTheme(campaignId: string, theme: CampaignTheme) {
		if (this.campaignThemes[campaignId] === theme) return;
		this.campaignThemes = { ...this.campaignThemes, [campaignId]: theme };
	}
}

export const preferences = new PreferencesState();
