import {
	getCachedAdventures,
	getCachedCampaignMembers,
	getCachedCampaignNpcs,
	getCachedCampaigns,
	getCachedCharacters,
	getCachedCampaignMaps,
	getCachedParts,
	getCachedUsers,
	isDatabaseCacheReady
} from '$lib/db/cache';
import {
	applyPartIdOrder,
	getStoredPartOrder,
	sortPartsByOrder
} from '$lib/data/part-order-storage';
import { isNpcCharacterKind, type CharacterKind } from '$lib/types/schema';
import type {
	Adventure,
	Campaign,
	CampaignMap,
	CampaignMember,
	Character,
	Part,
	User
} from '$lib/types/schema';

function assertReady(): void {
	if (!isDatabaseCacheReady()) {
		throw new Error('Database is not ready yet');
	}
}

export function getUsers(): User[] {
	assertReady();
	return getCachedUsers();
}

export function getCampaigns(): Campaign[] {
	assertReady();
	return getCachedCampaigns();
}

export function getCampaignMembers(): CampaignMember[] {
	assertReady();
	return getCachedCampaignMembers();
}

export function getAdventures(): Adventure[] {
	assertReady();
	return getCachedAdventures();
}

export function getParts(): Part[] {
	assertReady();
	return getCachedParts();
}

export function getCharacters(): Character[] {
	assertReady();
	return getCachedCharacters();
}

export function getCharactersForCampaign(campaignId: string): Character[] {
	return getCharacters().filter((character) => character.campaign_id === campaignId);
}

export function getCharacterById(characterId: string): Character | undefined {
	return getCharacters().find((character) => character.character_id === characterId);
}

export function isActivePlayerUser(userId: string): boolean {
	const user = getUserById(userId);
	return user != null && !user.date_deleted;
}

export function isPcMemberOfCampaign(campaignId: string, characterId: string): boolean {
	return getCachedCampaignMembers().some(
		(member) =>
			member.campaign_id === campaignId &&
			member.character_id === characterId &&
			member.role === 'player' &&
			isActivePlayerUser(member.user_id)
	);
}

export function isNpcMemberOfCampaign(campaignId: string, characterId: string): boolean {
	return getCachedCampaignNpcs().some(
		(entry) => entry.campaign_id === campaignId && entry.character_id === characterId
	);
}

export function isCharacterInCampaign(campaignId: string, characterId: string): boolean {
	return (
		isPcMemberOfCampaign(campaignId, characterId) ||
		isNpcMemberOfCampaign(campaignId, characterId)
	);
}

export function getPrimaryCampaignIdForNpc(characterId: string): string | null {
	const campaigns = getCachedCampaignNpcs()
		.filter((entry) => entry.character_id === characterId)
		.map((entry) => getCampaignById(entry.campaign_id))
		.filter((campaign): campaign is Campaign => Boolean(campaign))
		.sort((a, b) => a.campaign_name.localeCompare(b.campaign_name));

	return campaigns[0]?.campaign_id ?? null;
}

export function getNpcsForCampaign(campaignId: string): Character[] {
	const npcCharacterIds = new Set(
		getCachedCampaignNpcs()
			.filter((entry) => entry.campaign_id === campaignId)
			.map((entry) => entry.character_id)
	);

	return getCharacters()
		.filter(
			(character) =>
				isNpcCharacterKind(character.kind) && npcCharacterIds.has(character.character_id)
		)
		.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function getAllNpcs(): Character[] {
	return getCharacters()
		.filter((character) => isNpcCharacterKind(character.kind))
		.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function getCampaignNamesForNpc(characterId: string): string[] {
	return getCachedCampaignNpcs()
		.filter((entry) => entry.character_id === characterId)
		.map((entry) => getCampaignById(entry.campaign_id)?.campaign_name)
		.filter((name): name is string => Boolean(name))
		.sort((a, b) => a.localeCompare(b));
}

export type PlayerLibraryRow = {
	playerId: string;
	userId: string;
	username: string;
	characterId: string;
	characterName: string;
	campaignId: string;
	campaignName: string;
	level: number;
	hpCurrent: number;
	hpMax: number;
};

export function getAllPlayerRows(): PlayerLibraryRow[] {
	const rows: PlayerLibraryRow[] = [];

	for (const member of getCampaignMembers()) {
		if (member.role !== 'player' || !member.character_id) continue;

		const user = getUserById(member.user_id);
		const character = getCharacters().find(
			(entry) => entry.character_id === member.character_id && entry.kind === 'pc'
		);
		const campaign = getCampaignById(member.campaign_id);
		if (!user || user.date_deleted || !character || !campaign) continue;

		rows.push({
			playerId: member.player_id,
			userId: user.user_id,
			username: user.username,
			characterId: character.character_id,
			characterName: character.display_name,
			campaignId: campaign.campaign_id,
			campaignName: campaign.campaign_name,
			level: character.level,
			hpCurrent: character.hp_current,
			hpMax: character.hp_max
		});
	}

	return rows.sort((a, b) => {
		const byName = a.username.localeCompare(b.username);
		return byName !== 0 ? byName : a.campaignName.localeCompare(b.campaignName);
	});
}

export type NpcLibraryRow = {
	characterId: string;
	characterName: string;
	kind: CharacterKind;
	campaignId: string | null;
	campaignNames: string;
	level: number;
	hpCurrent: number;
	hpMax: number;
	experience: number;
	reputation: string | null;
};

export function getAllNpcLibraryRows(): NpcLibraryRow[] {
	return getAllNpcs().map((npc) => {
		const campaignNames = getCampaignNamesForNpc(npc.character_id);

		return {
			characterId: npc.character_id,
			characterName: npc.display_name,
			kind: npc.kind,
			campaignId: getPrimaryCampaignIdForNpc(npc.character_id),
			campaignNames: campaignNames.length ? campaignNames.join(', ') : '—',
			level: npc.level,
			hpCurrent: npc.hp_current,
			hpMax: npc.hp_max,
			experience: npc.experience,
			reputation: npc.reputation
		};
	});
}

export function getAllCampaignMaps(): CampaignMap[] {
	return getCachedCampaignMaps().sort((a, b) => a.name.localeCompare(b.name));
}

export function getUserById(userId: string): User | undefined {
	return getUsers().find((user) => user.user_id === userId);
}

export function getCampaignById(campaignId: string): Campaign | undefined {
	if (!isDatabaseCacheReady()) return undefined;

	return getCachedCampaigns().find((campaign) => campaign.campaign_id === campaignId);
}

export function getCampaignMapsForCampaign(campaignId: string): CampaignMap[] {
	return getCachedCampaignMaps()
		.filter((map) => map.campaign_id === campaignId)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function getCampaignMapById(mapId: string): CampaignMap | undefined {
	return getCachedCampaignMaps().find((map) => map.map_id === mapId);
}

export function getAdventureById(adventureId: string): Adventure | undefined {
	if (!isDatabaseCacheReady()) return undefined;

	return getCachedAdventures().find((adventure) => adventure.adventure_id === adventureId);
}

export function getAdventuresForCampaign(campaignId: string): Adventure[] {
	if (!isDatabaseCacheReady()) return [];

	return getCachedAdventures().filter((adventure) => adventure.campaign_id === campaignId);
}

export function getPartsForAdventure(adventureId: string): Part[] {
	if (!isDatabaseCacheReady()) return [];

	const parts = sortPartsByOrder(
		getCachedParts().filter((part) => part.adventure_id === adventureId)
	);
	const storedOrder = getStoredPartOrder(adventureId);

	if (!storedOrder?.length) {
		return parts;
	}

	return applyPartIdOrder(parts, storedOrder);
}

export function getPartById(partId: string): Part | undefined {
	if (!isDatabaseCacheReady()) return undefined;

	return getCachedParts().find((part) => part.part_id === partId);
}

export function getMostRecentCampaignForUser(userId: string): {
	campaign: Campaign;
	membership: CampaignMember;
} | null {
	const memberships = getCampaignMembers()
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

export {
	getCampaignActivity,
	getCampaignListForUser,
	type CampaignActivity,
	type CampaignListEntry
} from '$lib/data/campaign-list';

export function getCampaignHref(campaignId: string): string {
	return `/campaigns/${campaignId}`;
}
