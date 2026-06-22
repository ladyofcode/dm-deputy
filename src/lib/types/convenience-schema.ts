export type OnboardingCampaignDraft = {
	campaign_name: string;
	description: string;
	game_schema: string;
	player_names: string[];
};

export type OnboardingAdventureDraft = {
	name: string;
	overview: string;
	adventure_hook: string;
};
