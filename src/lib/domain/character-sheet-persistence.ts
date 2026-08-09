import type { CharacterIdentityDraft, CharacterExtrasDraft } from '$lib/domain/npc-draft';
import {
	physicalDraftToDbFields,
	roleplayDraftToDbFields,
	vitalityDraftToDbFields
} from '$lib/domain/pc-sheet';
import { spellcastingDraftToDbFields } from '$lib/domain/spellcasting';

export function identityDraftToDbFields(identity: CharacterIdentityDraft) {
	return {
		race: identity.race.trim() || null,
		creature_type: identity.creature_type.trim() || null,
		alignment: identity.alignment.trim() || null,
		age: identity.age.trim() || null,
		class_name: identity.class_name.trim() || null,
		presentation: identity.presentation.trim() || null
	};
}

export function extrasDraftToDbFields(extras: CharacterExtrasDraft) {
	const { abilities, combat, spellcasting, physical, roleplay, vitality } = extras;

	return {
		armor_class: combat.armor_class > 0 ? combat.armor_class : null,
		armor_class_notes: combat.armor_class_notes.trim() || null,
		speed: combat.speed.trim() || null,
		hp_dice: combat.hp_dice.trim() || null,
		ability_str: abilities.str,
		ability_dex: abilities.dex,
		ability_con: abilities.con,
		ability_int: abilities.int,
		ability_wis: abilities.wis,
		ability_cha: abilities.cha,
		skills: combat.skills.trim() || null,
		senses: combat.senses.trim() || null,
		languages: combat.languages.trim() || null,
		challenge_rating: combat.challenge_rating.trim() || null,
		traits: combat.traits.trim() || null,
		actions: combat.actions.trim() || null,
		...spellcastingDraftToDbFields(spellcasting),
		...physicalDraftToDbFields(physical),
		...roleplayDraftToDbFields(roleplay),
		...vitalityDraftToDbFields(vitality)
	};
}
