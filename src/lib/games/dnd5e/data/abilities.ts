import type { AbilityScores } from '$lib/types/schema';

export type AbilityKey = keyof AbilityScores;

export const ABILITY_LABELS: Record<AbilityKey, { short: string; name: string }> = {
	str: { short: 'STR', name: 'Strength' },
	dex: { short: 'DEX', name: 'Dexterity' },
	con: { short: 'CON', name: 'Constitution' },
	int: { short: 'INT', name: 'Intelligence' },
	wis: { short: 'WIS', name: 'Wisdom' },
	cha: { short: 'CHA', name: 'Charisma' }
};

export const ABILITY_KEYS = Object.keys(ABILITY_LABELS) as AbilityKey[];
