import {
	getCachedAdventures,
	getCachedCampaignMembers,
	getCachedCampaigns,
	getCachedPartStory,
	getCachedParts
} from '$lib/db/cache';
import { getStoredPartOrder, sortPartsByOrder } from '$lib/data/part-order-storage';
import type { Campaign } from '$lib/types/schema';

function getCampaignById(campaignId: string): Campaign | undefined {
	return getCachedCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

function getPartsForAdventure(adventureId: string) {
	const parts = sortPartsByOrder(
		getCachedParts().filter((part) => part.adventure_id === adventureId)
	);
	const storedOrder = getStoredPartOrder(adventureId);

	if (!storedOrder?.length) {
		return parts;
	}

	const orderIndex = new Map(storedOrder.map((partId, index) => [partId, index]));
	return [...parts].sort((left, right) => {
		const leftIndex = orderIndex.get(left.part_id);
		const rightIndex = orderIndex.get(right.part_id);

		if (leftIndex === undefined && rightIndex === undefined) {
			return left.sort_order - right.sort_order;
		}

		if (leftIndex === undefined) return 1;
		if (rightIndex === undefined) return -1;

		return leftIndex - rightIndex;
	});
}

export type CampaignActivity = {
	label: 'Last played' | 'Created';
	at: string;
};

export type CampaignListEntry = {
	campaign: Campaign;
	activity: CampaignActivity;
};

export function getCampaignActivity(campaignId: string): CampaignActivity {
	const campaign = getCampaignById(campaignId);
	let latestActivation: string | null = null;

	for (const adventure of getCachedAdventures().filter(
		(entry) => entry.campaign_id === campaignId
	)) {
		for (const part of getPartsForAdventure(adventure.adventure_id)) {
			const nodes = getCachedPartStory(part.part_id)?.nodes ?? [];
			for (const node of nodes) {
				if (node.activated_at && (!latestActivation || node.activated_at > latestActivation)) {
					latestActivation = node.activated_at;
				}
			}
		}
	}

	if (latestActivation) {
		return { label: 'Last played', at: latestActivation };
	}

	return { label: 'Created', at: campaign?.date_created ?? '' };
}

export function getCampaignListForUser(userId: string): CampaignListEntry[] {
	const campaignIds = new Set<string>();

	for (const campaign of getCachedCampaigns()) {
		if (campaign.owner_user_id === userId) {
			campaignIds.add(campaign.campaign_id);
		}
	}

	for (const member of getCachedCampaignMembers()) {
		if (member.user_id === userId) {
			campaignIds.add(member.campaign_id);
		}
	}

	return getCachedCampaigns()
		.filter((campaign) => campaignIds.has(campaign.campaign_id))
		.map((campaign) => ({
			campaign,
			activity: getCampaignActivity(campaign.campaign_id)
		}))
		.sort((a, b) => b.activity.at.localeCompare(a.activity.at));
}
