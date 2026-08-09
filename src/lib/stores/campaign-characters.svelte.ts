import { SvelteMap } from 'svelte/reactivity';
import {
	getCachedCampaignMembers,
	getCachedCampaignNpcs,
	getCachedCharacters,
	getCachedUsers
} from '$lib/db/cache';
import { isActiveNpc } from '$lib/types/schema';
import type { CampaignMember, Character, User } from '$lib/types/schema';
import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters-revision.svelte';

function buildUsersById(users: User[]): Map<string, User> {
	return new Map(users.map((user) => [user.user_id, user]));
}

function isActivePlayerUser(userId: string, usersById: Map<string, User>): boolean {
	const user = usersById.get(userId);
	return user != null && !user.date_deleted;
}

function getPlayerCharacterIdsForCampaign(campaignId: string): Set<string> {
	return new Set(
		getCachedCampaignMembers()
			.filter(
				(member) =>
					member.campaign_id === campaignId &&
					member.role === 'player' &&
					member.character_id !== null
			)
			.map((member) => member.character_id as string)
	);
}

function getNpcCharacterIdsForCampaign(campaignId: string): Set<string> {
	return new Set(
		getCachedCampaignNpcs()
			.filter((entry) => entry.campaign_id === campaignId)
			.map((entry) => entry.character_id)
	);
}

function buildCampaignMembersByCharacterId(
	members: CampaignMember[],
	campaignId: string
): Map<string, CampaignMember> {
	const membersByCharacterId = new SvelteMap<string, CampaignMember>();

	for (const member of members) {
		if (member.campaign_id !== campaignId || member.role !== 'player' || !member.character_id) {
			continue;
		}

		membersByCharacterId.set(member.character_id, member);
	}

	return membersByCharacterId;
}

function buildPlayerMembersByCharacterId(members: CampaignMember[]): Map<string, CampaignMember> {
	const membersByCharacterId = new SvelteMap<string, CampaignMember>();

	for (const member of members) {
		if (member.role !== 'player' || !member.character_id) continue;
		membersByCharacterId.set(member.character_id, member);
	}

	return membersByCharacterId;
}

class CampaignCharactersState {
	forCampaign(campaignId: string): Character[] {
		trackCampaignCharactersRevision();
		const npcCharacterIds = getNpcCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter((character) => isActiveNpc(character) && npcCharacterIds.has(character.character_id))
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	forCampaignPcs(campaignId: string): Character[] {
		trackCampaignCharactersRevision();
		const playerCharacterIds = getPlayerCharacterIdsForCampaign(campaignId);
		const membersByCharacterId = buildCampaignMembersByCharacterId(
			getCachedCampaignMembers(),
			campaignId
		);
		const usersById = buildUsersById(getCachedUsers());

		return getCachedCharacters()
			.filter(
				(character) => character.kind === 'pc' && playerCharacterIds.has(character.character_id)
			)
			.filter((character) => {
				const member = membersByCharacterId.get(character.character_id);
				return member != null && isActivePlayerUser(member.user_id, usersById);
			})
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	allNpcs(): Character[] {
		trackCampaignCharactersRevision();
		return getCachedCharacters()
			.filter((character) => isActiveNpc(character))
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	availableNpcsForCampaign(campaignId: string): Character[] {
		trackCampaignCharactersRevision();
		const linkedNpcIds = getNpcCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter((character) => isActiveNpc(character))
			.filter((character) => !linkedNpcIds.has(character.character_id))
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	availablePcsForCampaign(campaignId: string): Character[] {
		trackCampaignCharactersRevision();
		const linkedPcIds = getPlayerCharacterIdsForCampaign(campaignId);
		const playerMembersByCharacterId = buildPlayerMembersByCharacterId(getCachedCampaignMembers());
		const usersById = buildUsersById(getCachedUsers());

		return getCachedCharacters()
			.filter((character) => character.kind === 'pc')
			.filter((character) => !linkedPcIds.has(character.character_id))
			.filter((character) => {
				const member = playerMembersByCharacterId.get(character.character_id);
				if (!member) return true;
				return isActivePlayerUser(member.user_id, usersById);
			})
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}
}

export const campaignCharacters = new CampaignCharactersState();

export {
	bumpCampaignCharactersRevision,
	trackCampaignCharactersRevision
} from '$lib/stores/campaign-characters-revision.svelte';

export function getReactiveNpcsForCampaign(campaignId: string): Character[] {
	return campaignCharacters.forCampaign(campaignId);
}

export function getReactivePcsForCampaign(campaignId: string): Character[] {
	return campaignCharacters.forCampaignPcs(campaignId);
}

export function getReactiveAvailableNpcsForCampaign(campaignId: string): Character[] {
	return campaignCharacters.availableNpcsForCampaign(campaignId);
}

export function getReactiveAvailablePcsForCampaign(campaignId: string): Character[] {
	return campaignCharacters.availablePcsForCampaign(campaignId);
}
