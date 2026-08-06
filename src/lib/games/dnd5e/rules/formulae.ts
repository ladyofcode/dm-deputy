/** D&D 5e ability score → modifier (PHB table, scores 1–30). */
const ABILITY_MODIFIER_BY_SCORE = [
	-5, // 1
	-4,
	-4, // 2–3
	-3,
	-3, // 4–5
	-2,
	-2, // 6–7
	-1,
	-1, // 8–9
	0,
	0, // 10–11
	1,
	1, // 12–13
	2,
	2, // 14–15
	3,
	3, // 16–17
	4,
	4, // 18–19
	5,
	5, // 20–21
	6,
	6, // 22–23
	7,
	7, // 24–25
	8,
	8, // 26–27
	9,
	9, // 28–29
	10 // 30
] as const;

export function abilityModifier(score: number): number {
	const clamped = Math.min(30, Math.max(1, Math.round(score)));
	return ABILITY_MODIFIER_BY_SCORE[clamped - 1];
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
