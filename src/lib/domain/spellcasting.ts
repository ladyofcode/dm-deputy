import type {
	AbilityScores,
	Character,
	CharacterSpellEntry,
	Spell,
	SpellcastingAbilityKey,
	SpellSlotLevel,
	SpellSlotsByLevel
} from '$lib/types/schema';
import { SPELL_SLOT_LEVELS } from '$lib/types/schema';

export type CharacterSpellcastingDraft = {
	enabled: boolean;
	spellcasting_class: string;
	spellcasting_ability: SpellcastingAbilityKey | '';
	slots_total: SpellSlotsByLevel;
	slots_expended: SpellSlotsByLevel;
};

export type CharacterSpellDraft = CharacterSpellEntry & {
	/** UI-only level hint while the spell picker is still empty. */
	draft_level?: number;
};

export const SPELLCASTING_ABILITY_LABELS: Record<SpellcastingAbilityKey, string> = {
	str: 'Strength',
	dex: 'Dexterity',
	con: 'Constitution',
	int: 'Intelligence',
	wis: 'Wisdom',
	cha: 'Charisma'
};

export function createDefaultCharacterSpellcasting(): CharacterSpellcastingDraft {
	return {
		enabled: false,
		spellcasting_class: '',
		spellcasting_ability: '',
		slots_total: {},
		slots_expended: {}
	};
}

export function createEmptyCharacterSpellDraft(): CharacterSpellDraft {
	return { spell_id: '', prepared: false };
}

export function parseSpellSlotsJson(value: string | null | undefined): SpellSlotsByLevel {
	if (!value?.trim()) return {};

	try {
		const parsed = JSON.parse(value) as Record<string, number>;
		const slots: SpellSlotsByLevel = {};

		for (const level of SPELL_SLOT_LEVELS) {
			const raw = parsed[String(level)];
			if (typeof raw === 'number' && raw >= 0) {
				slots[level] = raw;
			}
		}

		return slots;
	} catch {
		return {};
	}
}

export function serializeSpellSlots(slots: SpellSlotsByLevel): string | null {
	const payload: Record<string, number> = {};

	for (const level of SPELL_SLOT_LEVELS) {
		const value = slots[level];
		if (typeof value === 'number' && value > 0) {
			payload[String(level)] = value;
		}
	}

	return Object.keys(payload).length ? JSON.stringify(payload) : null;
}

export function characterToSpellcastingDraft(character: Character): CharacterSpellcastingDraft {
	return {
		enabled: character.is_spellcaster,
		spellcasting_class: character.spellcasting_class ?? '',
		spellcasting_ability: character.spellcasting_ability ?? '',
		slots_total: character.spell_slots_total ?? {},
		slots_expended: character.spell_slots_expended ?? {}
	};
}

export function spellcastingDraftToDbFields(spellcasting: CharacterSpellcastingDraft) {
	return {
		is_spellcaster: spellcasting.enabled ? 1 : 0,
		spellcasting_class: spellcasting.enabled
			? spellcasting.spellcasting_class.trim() || null
			: null,
		spellcasting_ability:
			spellcasting.enabled && spellcasting.spellcasting_ability
				? spellcasting.spellcasting_ability
				: null,
		spell_slots_total_json: spellcasting.enabled
			? serializeSpellSlots(spellcasting.slots_total)
			: null,
		spell_slots_expended_json: spellcasting.enabled
			? serializeSpellSlots(spellcasting.slots_expended)
			: null
	};
}

export function getAbilityScoreForSpellcasting(
	abilities: AbilityScores,
	ability: SpellcastingAbilityKey | ''
): number | null {
	if (!ability) return null;
	return abilities[ability];
}

export function spellLevelLabel(level: number): string {
	return level === 0 ? 'Cantrips' : `Level ${level}`;
}

export function spellsForLevel(spells: Spell[], level: number): Spell[] {
	return spells
		.filter((spell) => spell.spell_level === level)
		.sort((left, right) => left.spell_name.localeCompare(right.spell_name));
}

export type SpellDraftRow = {
	index: number;
	entry: CharacterSpellDraft;
};

export function groupSpellDraftRowsByLevel(
	spellDrafts: CharacterSpellDraft[],
	spellsById: Map<string, Spell>
): Map<number, SpellDraftRow[]> {
	const grouped = new Map<number, SpellDraftRow[]>();

	for (const [index, entry] of spellDrafts.entries()) {
		const spell = entry.spell_id ? spellsById.get(entry.spell_id) : undefined;
		if (!entry.spell_id && entry.draft_level == null) continue;

		const level = spell?.spell_level ?? entry.draft_level ?? 0;
		const rows = grouped.get(level) ?? [];
		rows.push({ index, entry });
		grouped.set(level, rows);
	}

	return grouped;
}

export function formatSpellSelectLabel(spell: Spell): string {
	const ritual = spell.is_ritual ? ', ritual' : '';
	return `${spell.spell_name} (${spell.casting_time}, ${spell.spell_school}${ritual})`;
}

export function updateSpellSlot(
	slots: SpellSlotsByLevel,
	level: SpellSlotLevel,
	value: number
): SpellSlotsByLevel {
	const next = { ...slots };

	if (value > 0) {
		next[level] = value;
	} else {
		delete next[level];
	}

	return next;
}
