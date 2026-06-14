import dummy from './dummy.json';
import type { DummyData } from '$lib/types/convenience-schema';
import type { Adventure, Campaign, CampaignMember, Part, User } from '$lib/types/schema';

const data = dummy as DummyData;

export function getUsers(): User[] {
	return data.users;
}

export function getCampaigns(): Campaign[] {
	return data.campaigns.filter((campaign) => campaign.date_deleted === null);
}

export function getCampaignMembers(): CampaignMember[] {
	return data.campaignMembers;
}

export function getAdventures(): Adventure[] {
	return data.adventures;
}

export function getParts(): Part[] {
	return data.parts;
}

export function getUserById(userId: string): User | undefined {
	return data.users.find((user) => user.user_id === userId);
}

export function getCampaignById(campaignId: string): Campaign | undefined {
	return getCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

export function getAdventureById(adventureId: string): Adventure | undefined {
	return data.adventures.find((adventure) => adventure.adventure_id === adventureId);
}

export function getAdventuresForCampaign(campaignId: string): Adventure[] {
	return data.adventures.filter((adventure) => adventure.campaign_id === campaignId);
}

export function getPartsForAdventure(adventureId: string): Part[] {
	return data.parts
		.filter((part) => part.adventure_id === adventureId)
		.sort((a, b) => a.sort_order - b.sort_order);
}

export function getPartById(partId: string): Part | undefined {
	return data.parts.find((part) => part.part_id === partId);
}

export function getMostRecentCampaignForUser(userId: string): {
	campaign: Campaign;
	membership: CampaignMember;
} | null {
	const memberships = data.campaignMembers
		.filter((member) => member.user_id === userId && member.last_played_at !== null)
		.sort(
			(a, b) =>
				new Date(b.last_played_at ?? 0).getTime() - new Date(a.last_played_at ?? 0).getTime()
		);

	const membership = memberships[0];
	if (!membership) return null;

	const campaign = getCampaignById(membership.campaign_id);
	if (!campaign) return null;

	return { campaign, membership };
}
