import type { CharacterLoadout } from '$lib/db/types';
import type { Character, NpcCharacterKind } from '$lib/types/schema';

export type NpcLoadoutDraft = {
	weapons: string[];
	armor: string;
	items: string[];
	spells: string[];
};

export type NpcExtrasDraft = {
	level: number;
	experience: number;
	hp_max: number;
	hp_current: number;
	reputation: string;
	loadout: NpcLoadoutDraft;
};

export type NpcDraftLine = {
	id: string;
	kind: NpcCharacterKind;
	name: string;
	description: string;
	extras: NpcExtrasDraft;
};

export function createDefaultNpcLoadout(): NpcLoadoutDraft {
	return {
		weapons: [''],
		armor: '',
		items: [''],
		spells: ['']
	};
}

export function createDefaultNpcExtras(): NpcExtrasDraft {
	return {
		level: 1,
		experience: 0,
		hp_max: 0,
		hp_current: 0,
		reputation: '',
		loadout: createDefaultNpcLoadout()
	};
}

export function createEmptyNpcDraftLine(): NpcDraftLine {
	return {
		id: crypto.randomUUID(),
		kind: 'npc_general',
		name: '',
		description: '',
		extras: createDefaultNpcExtras()
	};
}

export function cloneNpcExtras(extras: NpcExtrasDraft): NpcExtrasDraft {
	return {
		level: extras.level,
		experience: extras.experience,
		hp_max: extras.hp_max,
		hp_current: extras.hp_current,
		reputation: extras.reputation,
		loadout: {
			weapons: [...extras.loadout.weapons],
			armor: extras.loadout.armor,
			items: [...extras.loadout.items],
			spells: [...extras.loadout.spells]
		}
	};
}

export function loadoutToNpcLoadoutDraft(loadout: CharacterLoadout): NpcLoadoutDraft {
	return {
		weapons: loadout.weapon_ids.length ? loadout.weapon_ids : [''],
		armor: loadout.armor_ids[0] ?? '',
		items: loadout.item_ids.length ? loadout.item_ids : [''],
		spells: loadout.spell_ids.length ? loadout.spell_ids : ['']
	};
}

export function characterToNpcExtrasDraft(
	character: Character,
	loadout: CharacterLoadout
): NpcExtrasDraft {
	return {
		level: character.level,
		experience: character.experience,
		hp_max: character.hp_max,
		hp_current: character.hp_current,
		reputation: character.reputation ?? '',
		loadout: loadoutToNpcLoadoutDraft(loadout)
	};
}

export function npcDraftLineHasStats(extras: NpcExtrasDraft): boolean {
	const loadout = extras.loadout;
	return (
		extras.level !== 1 ||
		extras.experience !== 0 ||
		extras.hp_max !== 0 ||
		extras.hp_current !== 0 ||
		extras.reputation.trim().length > 0 ||
		loadout.weapons.some(Boolean) ||
		Boolean(loadout.armor) ||
		loadout.items.some(Boolean) ||
		loadout.spells.some(Boolean)
	);
}
