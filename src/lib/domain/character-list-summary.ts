import type { Character } from '$lib/types/schema';

export const CHARACTER_LIST_SUMMARY_SEP = ' · ';

export function formatNpcCampaignListSummary(
	character: Pick<Character, 'race' | 'class_name' | 'role_label' | 'level'>,
	options?: { defaultLevel?: number }
): string | null {
	const defaultLevel = options?.defaultLevel ?? 1;
	const parts: string[] = [];

	const race = character.race?.trim();
	if (race) parts.push(race);

	const className = character.class_name?.trim();
	if (className) parts.push(className);

	const roleLabel = character.role_label?.trim();
	if (roleLabel) parts.push(roleLabel);

	if (character.level > defaultLevel) {
		parts.push(`Level ${character.level}`);
	}

	return parts.length ? parts.join(CHARACTER_LIST_SUMMARY_SEP) : null;
}

export function formatPcCampaignListSummary(
	character: Pick<Character, 'level' | 'hp_max' | 'hp_current' | 'experience' | 'reputation'>,
	options?: { defaultLevel?: number }
): string | null {
	const defaultLevel = options?.defaultLevel ?? 0;
	const parts: string[] = [];

	if (character.level > defaultLevel) parts.push(`Level ${character.level}`);
	if (character.hp_max > 0) parts.push(`HP ${character.hp_current}/${character.hp_max}`);
	if (character.experience > 0) parts.push(`${character.experience} XP`);
	if (character.reputation?.trim()) parts.push(character.reputation.trim());

	return parts.length ? parts.join(CHARACTER_LIST_SUMMARY_SEP) : null;
}
