import {
	getCachedCampaignMembers,
	getCachedCampaignNpcs,
	getCachedCharacters,
	getCachedUsers
} from '$lib/db/cache';
import { isNpcCharacterKind } from '$lib/types/schema';
import type { Character } from '$lib/types/schema';

function isActivePlayerUser(userId: string): boolean {
	const user = getCachedUsers().find((entry) => entry.user_id === userId);
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

class CampaignCharactersState {
	revision = $state(0);

	bump(): void {
		this.revision += 1;
	}

	track(): number {
		return this.revision;
	}

	forCampaign(campaignId: string): Character[] {
		this.track();
		const npcCharacterIds = getNpcCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter(
				(character) =>
					isNpcCharacterKind(character.kind) && npcCharacterIds.has(character.character_id)
			)
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	forCampaignPcs(campaignId: string): Character[] {
		this.track();
		const playerCharacterIds = getPlayerCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter(
				(character) => character.kind === 'pc' && playerCharacterIds.has(character.character_id)
			)
			.filter((character) => {
				const member = getCachedCampaignMembers().find(
					(entry) =>
						entry.campaign_id === campaignId &&
						entry.character_id === character.character_id &&
						entry.role === 'player'
				);
				return member != null && isActivePlayerUser(member.user_id);
			})
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	allNpcs(): Character[] {
		this.track();
		return getCachedCharacters()
			.filter((character) => isNpcCharacterKind(character.kind))
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	availableNpcsForCampaign(campaignId: string): Character[] {
		this.track();
		const linkedNpcIds = getNpcCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter((character) => isNpcCharacterKind(character.kind))
			.filter((character) => !linkedNpcIds.has(character.character_id))
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}

	availablePcsForCampaign(campaignId: string): Character[] {
		this.track();
		const linkedPcIds = getPlayerCharacterIdsForCampaign(campaignId);

		return getCachedCharacters()
			.filter((character) => character.kind === 'pc')
			.filter((character) => !linkedPcIds.has(character.character_id))
			.filter((character) => {
				const member = getCachedCampaignMembers().find(
					(entry) => entry.character_id === character.character_id && entry.role === 'player'
				);
				if (!member) return true;
				return isActivePlayerUser(member.user_id);
			})
			.sort((a, b) => a.display_name.localeCompare(b.display_name));
	}
}

export const campaignCharacters = new CampaignCharactersState();

export function bumpCampaignCharactersRevision(): void {
	campaignCharacters.bump();
}

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

export function getReactiveAllNpcs(): Character[] {
	return campaignCharacters.allNpcs();
}

export function trackCampaignCharactersRevision(): number {
	return campaignCharacters.track();
}
