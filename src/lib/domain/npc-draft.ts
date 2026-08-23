import type { AbilityKey } from '$lib/games/dnd5e/data/abilities';
import type { NormalizedCropRect } from '$lib/domain/crop-image';
import type { CharacterLoadout } from '$lib/db/types';
import type { AbilityScores, Character, NpcCharacterKind } from '$lib/types/schema';
import { DEFAULT_ABILITY_SCORES as defaultAbilityScores } from '$lib/types/schema';
import {
	characterToSpellcastingDraft,
	createDefaultCharacterSpellcasting,
	createEmptyCharacterSpellDraft,
	type CharacterSpellcastingDraft,
	type CharacterSpellDraft
} from '$lib/domain/spellcasting';
import {
	characterToPhysicalDraft,
	characterToRoleplayDraft,
	characterToVitalityDraft,
	createDefaultCharacterPhysical,
	createDefaultCharacterRoleplay,
	createDefaultCharacterVitality,
	type CharacterPhysicalDraft,
	type CharacterRoleplayDraft,
	type CharacterVitalityDraft
} from '$lib/domain/pc-sheet';

export type { CharacterSpellcastingDraft, CharacterSpellDraft };
export type { CharacterPhysicalDraft, CharacterRoleplayDraft, CharacterVitalityDraft };

export type NpcLoadoutDraft = {
	weapons: string[];
	armor: string;
	items: string[];
	spells: CharacterSpellDraft[];
};

export type CharacterIdentityDraft = {
	race: string;
	creature_type: string;
	alignment: string;
	age: string;
	class_name: string;
	role_label: string;
	presentation: string;
};

export type CharacterAbilitiesDraft = AbilityScores;

export type CharacterCombatDraft = {
	armor_class: number;
	armor_class_notes: string;
	speed: string;
	hp_dice: string;
	skills: string;
	senses: string;
	languages: string;
	challenge_rating: string;
	traits: string;
	actions: string;
};

export type CharacterExtrasDraft = {
	level: number;
	experience: number;
	hp_max: number;
	hp_current: number;
	reputation: string;
	abilities: CharacterAbilitiesDraft;
	combat: CharacterCombatDraft;
	spellcasting: CharacterSpellcastingDraft;
	physical: CharacterPhysicalDraft;
	roleplay: CharacterRoleplayDraft;
	vitality: CharacterVitalityDraft;
	loadout: NpcLoadoutDraft;
};

export type NpcDraftLine = {
	id: string;
	kind: NpcCharacterKind;
	name: string;
	description: string;
	identity: CharacterIdentityDraft;
	extras: CharacterExtrasDraft;
	portraitFile: File | null;
	portraitThumbCropFile: File | null;
	portraitThumbCropRect: NormalizedCropRect | null;
	portraitImageSource: string | null;
	portraitExistingMediaId: string | null;
	presentationFile: File | null;
	presentationThumbCropFile: File | null;
	presentationThumbCropRect: NormalizedCropRect | null;
	presentationImageSource: string | null;
};

export function createDefaultCharacterAbilities(): CharacterAbilitiesDraft {
	return { ...defaultAbilityScores };
}

export function createDefaultCharacterCombat(): CharacterCombatDraft {
	return {
		armor_class: 0,
		armor_class_notes: '',
		speed: '',
		hp_dice: '',
		skills: '',
		senses: '',
		languages: '',
		challenge_rating: '',
		traits: '',
		actions: ''
	};
}

export function createDefaultCharacterIdentity(): CharacterIdentityDraft {
	return {
		race: '',
		creature_type: '',
		alignment: '',
		age: '',
		class_name: '',
		role_label: '',
		presentation: ''
	};
}

export function createDefaultNpcLoadout(): NpcLoadoutDraft {
	return {
		weapons: [''],
		armor: '',
		items: [''],
		spells: [createEmptyCharacterSpellDraft()]
	};
}

export function createDefaultCharacterExtras(): CharacterExtrasDraft {
	return {
		level: 1,
		experience: 0,
		hp_max: 0,
		hp_current: 0,
		reputation: '',
		abilities: createDefaultCharacterAbilities(),
		combat: createDefaultCharacterCombat(),
		spellcasting: createDefaultCharacterSpellcasting(),
		physical: createDefaultCharacterPhysical(),
		roleplay: createDefaultCharacterRoleplay(),
		vitality: createDefaultCharacterVitality(),
		loadout: createDefaultNpcLoadout()
	};
}

export function createEmptyNpcDraftLine(): NpcDraftLine {
	return {
		id: crypto.randomUUID(),
		kind: 'npc_general',
		name: '',
		description: '',
		identity: createDefaultCharacterIdentity(),
		extras: createDefaultCharacterExtras(),
		portraitFile: null,
		portraitThumbCropFile: null,
		portraitThumbCropRect: null,
		portraitImageSource: null,
		portraitExistingMediaId: null,
		presentationFile: null,
		presentationThumbCropFile: null,
		presentationThumbCropRect: null,
		presentationImageSource: null
	};
}

export function cloneCharacterAbilities(
	abilities: CharacterAbilitiesDraft
): CharacterAbilitiesDraft {
	return { ...abilities };
}

export function cloneCharacterCombat(combat: CharacterCombatDraft): CharacterCombatDraft {
	return { ...combat };
}

export function cloneCharacterIdentity(identity: CharacterIdentityDraft): CharacterIdentityDraft {
	return {
		race: identity.race,
		creature_type: identity.creature_type,
		alignment: identity.alignment,
		age: identity.age,
		class_name: identity.class_name,
		role_label: identity.role_label,
		presentation: identity.presentation
	};
}

export function cloneCharacterExtras(extras: CharacterExtrasDraft): CharacterExtrasDraft {
	return {
		level: extras.level,
		experience: extras.experience,
		hp_max: extras.hp_max,
		hp_current: extras.hp_current,
		reputation: extras.reputation,
		abilities: cloneCharacterAbilities(extras.abilities),
		combat: cloneCharacterCombat(extras.combat),
		spellcasting: {
			...extras.spellcasting,
			slots_total: { ...extras.spellcasting.slots_total },
			slots_expended: { ...extras.spellcasting.slots_expended }
		},
		physical: { ...extras.physical },
		roleplay: { ...extras.roleplay },
		vitality: { ...extras.vitality },
		loadout: {
			weapons: [...extras.loadout.weapons],
			armor: extras.loadout.armor,
			items: [...extras.loadout.items],
			spells: extras.loadout.spells.map((entry) => ({ ...entry }))
		}
	};
}

export function characterToAbilitiesDraft(character: Character): CharacterAbilitiesDraft {
	return {
		str: character.ability_str ?? defaultAbilityScores.str,
		dex: character.ability_dex ?? defaultAbilityScores.dex,
		con: character.ability_con ?? defaultAbilityScores.con,
		int: character.ability_int ?? defaultAbilityScores.int,
		wis: character.ability_wis ?? defaultAbilityScores.wis,
		cha: character.ability_cha ?? defaultAbilityScores.cha
	};
}

export function characterToCombatDraft(character: Character): CharacterCombatDraft {
	return {
		armor_class: character.armor_class ?? 0,
		armor_class_notes: character.armor_class_notes ?? '',
		speed: character.speed ?? '',
		hp_dice: character.hp_dice ?? '',
		skills: character.skills ?? '',
		senses: character.senses ?? '',
		languages: character.languages ?? '',
		challenge_rating: character.challenge_rating ?? '',
		traits: character.traits ?? '',
		actions: character.actions ?? ''
	};
}

export function characterToIdentityDraft(character: Character): CharacterIdentityDraft {
	return {
		race: character.race ?? '',
		creature_type: character.creature_type ?? '',
		alignment: character.alignment ?? '',
		age: character.age ?? '',
		class_name: character.class_name ?? '',
		role_label: character.role_label ?? '',
		presentation: character.presentation ?? ''
	};
}

export function loadoutToNpcLoadoutDraft(loadout: CharacterLoadout): NpcLoadoutDraft {
	return {
		weapons: loadout.weapon_ids.length ? loadout.weapon_ids : [''],
		armor: loadout.armor_ids[0] ?? '',
		items: loadout.item_ids.length ? loadout.item_ids : [''],
		spells: loadout.spells.length
			? loadout.spells.map((entry) => ({ ...entry }))
			: [createEmptyCharacterSpellDraft()]
	};
}

export function characterToCharacterExtrasDraft(
	character: Character,
	loadout: CharacterLoadout
): CharacterExtrasDraft {
	return {
		level: character.level,
		experience: character.experience,
		hp_max: character.hp_max,
		hp_current: character.hp_current,
		reputation: character.reputation ?? '',
		abilities: characterToAbilitiesDraft(character),
		combat: characterToCombatDraft(character),
		spellcasting: characterToSpellcastingDraft(character),
		physical: characterToPhysicalDraft(character),
		roleplay: characterToRoleplayDraft(character),
		vitality: characterToVitalityDraft(character),
		loadout: loadoutToNpcLoadoutDraft(loadout)
	};
}

function hasNonDefaultAbilities(abilities: CharacterAbilitiesDraft): boolean {
	return (
		abilities.str !== defaultAbilityScores.str ||
		abilities.dex !== defaultAbilityScores.dex ||
		abilities.con !== defaultAbilityScores.con ||
		abilities.int !== defaultAbilityScores.int ||
		abilities.wis !== defaultAbilityScores.wis ||
		abilities.cha !== defaultAbilityScores.cha
	);
}

function hasCombatBlockStats(combat: CharacterCombatDraft): boolean {
	return (
		combat.armor_class !== 0 ||
		combat.armor_class_notes.trim().length > 0 ||
		combat.speed.trim().length > 0 ||
		combat.hp_dice.trim().length > 0 ||
		combat.skills.trim().length > 0 ||
		combat.senses.trim().length > 0 ||
		combat.languages.trim().length > 0 ||
		combat.challenge_rating.trim().length > 0 ||
		combat.traits.trim().length > 0 ||
		combat.actions.trim().length > 0
	);
}

export function npcDraftLineHasStats(extras: CharacterExtrasDraft): boolean {
	const loadout = extras.loadout;
	return (
		extras.experience !== 0 ||
		extras.hp_max !== 0 ||
		extras.hp_current !== 0 ||
		extras.reputation.trim().length > 0 ||
		hasNonDefaultAbilities(extras.abilities) ||
		hasCombatBlockStats(extras.combat) ||
		loadout.weapons.some(Boolean) ||
		Boolean(loadout.armor) ||
		loadout.items.some(Boolean) ||
		loadout.spells.some((entry) => entry.spell_id) ||
		extras.spellcasting.enabled
	);
}

export function characterSheetHasCombatStats(extras: CharacterExtrasDraft): boolean {
	return npcDraftLineHasStats(extras);
}

export function normalizeHpCurrent(extras: CharacterExtrasDraft): CharacterExtrasDraft {
	if (extras.hp_max > 0 && extras.hp_current === 0) {
		return { ...extras, hp_current: extras.hp_max };
	}

	return extras;
}

export function updateAbilityDraft(
	extras: CharacterExtrasDraft,
	key: AbilityKey,
	value: number
): CharacterExtrasDraft {
	return {
		...extras,
		abilities: {
			...extras.abilities,
			[key]: value
		}
	};
}
