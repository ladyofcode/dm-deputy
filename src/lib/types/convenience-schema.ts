export type CampaignPlayerDraft = {
	player_name: string;
	character_name: string;
};

export type OnboardingCampaignDraft = {
	campaign_name: string;
	description: string;
	game_schema: string;
	players: CampaignPlayerDraft[];
};

export type OnboardingAdventureDraft = {
	name: string;
	overview: string;
	adventure_hook: string;
};
