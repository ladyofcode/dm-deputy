/** Prototype-only types — replace or remove when wiring up SQLite. */

import type { Adventure, Campaign, CampaignMember, Part, User } from './schema';

export type SessionScenario = 'returning' | 'new-gm';

export type DummyData = {
	users: User[];
	campaigns: Campaign[];
	campaignMembers: CampaignMember[];
	adventures: Adventure[];
	parts: Part[];
};

export type OnboardingCampaignDraft = {
	campaign_name: string;
	description: string;
	game_schema: string;
};

export type OnboardingAdventureDraft = {
	name: string;
	overview: string;
	adventure_hook: string;
	can_promote_to_campaign: boolean;
};
