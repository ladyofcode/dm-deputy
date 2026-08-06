const ABILITY_MODIFIER_BY_SCORE = [
	-5,
	-4,
	-4,
	-3,
	-3,
	-2,
	-2,
	-1,
	-1,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10
] as const;

export function abilityModifier(score: number): number {
	const clamped = Math.min(30, Math.max(1, Math.round(score)));
	return ABILITY_MODIFIER_BY_SCORE[clamped - 1] ?? 0;
}

export function proficiencyBonus(level: number): number {
	const clamped = Math.min(20, Math.max(1, level));
	return 2 + Math.floor((clamped - 1) / 4);
}

export function spellSaveDc(abilityScore: number, level: number): number {
	return 8 + abilityModifier(abilityScore) + proficiencyBonus(level);
}

export function spellAttackBonus(abilityScore: number, level: number): number {
	return abilityModifier(abilityScore) + proficiencyBonus(level);
}

export function formatSignedModifier(value: number): string {
	return value >= 0 ? `+${value}` : `${value}`;
}
