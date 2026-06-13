import type {
	OnboardingAdventureDraft,
	OnboardingCampaignDraft,
	SessionScenario
} from '$lib/types/convenience-schema';
import type { Part } from '$lib/types/schema';

const defaultCampaignDraft = (): OnboardingCampaignDraft => ({
	campaign_name: '',
	description: '',
	game_schema: 'dnd5e'
});

const defaultAdventureDraft = (): OnboardingAdventureDraft => ({
	name: '',
	overview: '',
	adventure_hook: '',
	can_promote_to_campaign: false
});

class WorkspaceState {
	scenario = $state<SessionScenario>('returning');
	currentUserId = $state('usr-returning-gm');

	campaignDraft = $state<OnboardingCampaignDraft>(defaultCampaignDraft());
	adventureDraft = $state<OnboardingAdventureDraft>(defaultAdventureDraft());

	createdCampaignId = $state<string | null>(null);
	createdAdventureId = $state<string | null>(null);
	onboardingParts = $state<Part[]>([]);

	setScenario(scenario: SessionScenario, userId: string) {
		this.scenario = scenario;
		this.currentUserId = userId;
		this.resetOnboarding();
	}

	resetOnboarding() {
		this.campaignDraft = defaultCampaignDraft();
		this.adventureDraft = defaultAdventureDraft();
		this.createdCampaignId = null;
		this.createdAdventureId = null;
		this.onboardingParts = [];
	}

}

export const workspace = new WorkspaceState();
