export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
	const clamped = Math.min(20, Math.max(1, level));
	return 2 + Math.floor((clamped - 1) / 4);
}
