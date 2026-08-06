import type { Character } from '$lib/types/schema';

export type CharacterPhysicalDraft = {
	height: string;
	weight: string;
	eyes: string;
	skin: string;
	hair: string;
};

export type CharacterRoleplayDraft = {
	background: string;
	personality_traits: string;
	ideals: string;
	bonds: string;
	flaws: string;
	backstory: string;
	allies: string;
	features: string;
	proficiencies: string;
	treasure: string;
};

export type CharacterVitalityDraft = {
	inspiration: boolean;
	initiative: number | null;
	temp_hp: number;
	hit_dice_remaining: string;
	death_save_successes: number;
	death_save_failures: number;
};

export function createDefaultCharacterPhysical(): CharacterPhysicalDraft {
	return {
		height: '',
		weight: '',
		eyes: '',
		skin: '',
		hair: ''
	};
}

export function createDefaultCharacterRoleplay(): CharacterRoleplayDraft {
	return {
		background: '',
		personality_traits: '',
		ideals: '',
		bonds: '',
		flaws: '',
		backstory: '',
		allies: '',
		features: '',
		proficiencies: '',
		treasure: ''
	};
}

export function createDefaultCharacterVitality(): CharacterVitalityDraft {
	return {
		inspiration: false,
		initiative: null,
		temp_hp: 0,
		hit_dice_remaining: '',
		death_save_successes: 0,
		death_save_failures: 0
	};
}

export function characterToPhysicalDraft(character: Character): CharacterPhysicalDraft {
	return {
		height: character.height ?? '',
		weight: character.weight ?? '',
		eyes: character.eyes ?? '',
		skin: character.skin ?? '',
		hair: character.hair ?? ''
	};
}

export function characterToRoleplayDraft(character: Character): CharacterRoleplayDraft {
	return {
		background: character.background ?? '',
		personality_traits: character.personality_traits ?? '',
		ideals: character.ideals ?? '',
		bonds: character.bonds ?? '',
		flaws: character.flaws ?? '',
		backstory: character.backstory ?? '',
		allies: character.allies ?? '',
		features: character.features ?? '',
		proficiencies: character.proficiencies ?? '',
		treasure: character.treasure ?? ''
	};
}

export function characterToVitalityDraft(character: Character): CharacterVitalityDraft {
	return {
		inspiration: character.inspiration,
		initiative: character.initiative,
		temp_hp: character.temp_hp ?? 0,
		hit_dice_remaining: character.hit_dice_remaining ?? '',
		death_save_successes: character.death_save_successes ?? 0,
		death_save_failures: character.death_save_failures ?? 0
	};
}

export function physicalDraftToDbFields(physical: CharacterPhysicalDraft) {
	return {
		height: physical.height.trim() || null,
		weight: physical.weight.trim() || null,
		eyes: physical.eyes.trim() || null,
		skin: physical.skin.trim() || null,
		hair: physical.hair.trim() || null
	};
}

export function roleplayDraftToDbFields(roleplay: CharacterRoleplayDraft) {
	return {
		background: roleplay.background.trim() || null,
		personality_traits: roleplay.personality_traits.trim() || null,
		ideals: roleplay.ideals.trim() || null,
		bonds: roleplay.bonds.trim() || null,
		flaws: roleplay.flaws.trim() || null,
		backstory: roleplay.backstory.trim() || null,
		allies: roleplay.allies.trim() || null,
		features: roleplay.features.trim() || null,
		proficiencies: roleplay.proficiencies.trim() || null,
		treasure: roleplay.treasure.trim() || null
	};
}

export function vitalityDraftToDbFields(vitality: CharacterVitalityDraft) {
	return {
		inspiration: vitality.inspiration ? 1 : 0,
		initiative: vitality.initiative,
		temp_hp: vitality.temp_hp > 0 ? vitality.temp_hp : null,
		hit_dice_remaining: vitality.hit_dice_remaining.trim() || null,
		death_save_successes: Math.min(3, Math.max(0, vitality.death_save_successes)),
		death_save_failures: Math.min(3, Math.max(0, vitality.death_save_failures))
	};
}
