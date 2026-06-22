import { getCampaignListForUser } from '$lib/data/campaign-list';
import {
	getCachedAdventures,
	getCachedCampaignMembers,
	getCachedCampaigns,
	getCachedCharacters,
	getCachedParts,
	isDatabaseCacheReady
} from '$lib/db/cache';

export type CampaignDbInspectSummary = {
	label: string;
	at: string;
	currentUserId: string;
	cacheReady: boolean;
	campaignCount: number;
	campaigns: Array<{
		campaign_id: string;
		campaign_name: string;
		owner_user_id: string;
		date_created: string;
	}>;
	membersForUser: Array<{
		campaign_id: string;
		role: string;
		last_played_at: string | null;
	}>;
	visibleOnHome: Array<{
		campaign_id: string;
		campaign_name: string;
		activity: string;
	}>;
	adventures: Array<{
		adventure_id: string;
		campaign_id: string;
		name: string;
		can_promote_to_campaign: boolean;
		part_count: number;
	}>;
	likelyPromotionPairs: Array<{
		promoted_campaign_id: string;
		promoted_campaign_name: string;
		source_campaign_id: string;
		source_adventure_id: string;
	}>;
	clonedCharacterCount: number;
};

function likelyPromotionPairs() {
	const campaigns = getCachedCampaigns();
	const adventures = getCachedAdventures();
	const pairs: CampaignDbInspectSummary['likelyPromotionPairs'] = [];

	for (const campaign of campaigns) {
		for (const adventure of adventures) {
			if (
				adventure.name === campaign.campaign_name &&
				adventure.campaign_id !== campaign.campaign_id
			) {
				pairs.push({
					promoted_campaign_id: campaign.campaign_id,
					promoted_campaign_name: campaign.campaign_name,
					source_campaign_id: adventure.campaign_id,
					source_adventure_id: adventure.adventure_id
				});
			}
		}
	}

	return pairs;
}

export function buildCampaignDbInspectSummary(
	userId: string,
	label = 'DM Deputy DB inspect'
): CampaignDbInspectSummary {
	const cacheReady = isDatabaseCacheReady();
	const campaigns = cacheReady ? getCachedCampaigns() : [];
	const members = cacheReady ? getCachedCampaignMembers() : [];
	const adventures = cacheReady ? getCachedAdventures() : [];
	const parts = cacheReady ? getCachedParts() : [];
	const characters = cacheReady ? getCachedCharacters() : [];
	const visibleOnHome = cacheReady ? getCampaignListForUser(userId) : [];

	return {
		label,
		at: new Date().toISOString(),
		currentUserId: userId,
		cacheReady,
		campaignCount: campaigns.length,
		campaigns: campaigns.map((campaign) => ({
			campaign_id: campaign.campaign_id,
			campaign_name: campaign.campaign_name,
			owner_user_id: campaign.owner_user_id,
			date_created: campaign.date_created
		})),
		membersForUser: members
			.filter((member) => member.user_id === userId)
			.map((member) => ({
				campaign_id: member.campaign_id,
				role: member.role,
				last_played_at: member.last_played_at
			})),
		visibleOnHome: visibleOnHome.map((entry) => ({
			campaign_id: entry.campaign.campaign_id,
			campaign_name: entry.campaign.campaign_name,
			activity: `${entry.activity.label} ${entry.activity.at}`
		})),
		adventures: adventures.map((adventure) => ({
			adventure_id: adventure.adventure_id,
			campaign_id: adventure.campaign_id,
			name: adventure.name,
			can_promote_to_campaign: adventure.can_promote_to_campaign,
			part_count: parts.filter((part) => part.adventure_id === adventure.adventure_id).length
		})),
		likelyPromotionPairs: cacheReady ? likelyPromotionPairs() : [],
		clonedCharacterCount: characters.filter((character) => character.cloned_from_character_id)
			.length
	};
}

export function logCampaignDbInspect(
	userId: string,
	label = 'DM Deputy DB inspect'
): CampaignDbInspectSummary {
	const summary = buildCampaignDbInspectSummary(userId, label);

	if (import.meta.env.DEV) {
		console.group(`[dm-deputy] ${label}`);
		console.log('Paste this JSON:');
		console.log(JSON.stringify(summary, null, 2));
		console.log(
			'Home visible:',
			summary.visibleOnHome.length,
			'of',
			summary.campaignCount,
			'campaigns'
		);
		console.log('Likely promotion pairs:', summary.likelyPromotionPairs.length);
		console.groupEnd();
	}

	return summary;
}

declare global {
	interface Window {
		__dmDeputyInspect?: (userId?: string) => CampaignDbInspectSummary;
	}
}

export function installCampaignDbInspect(getUserId: () => string): void {
	if (typeof window === 'undefined' || !import.meta.env.DEV) return;

	window.__dmDeputyInspect = (userId = getUserId()) =>
		logCampaignDbInspect(userId, 'manual inspect');
}
