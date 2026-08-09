import { characterSheetHasCombatStats, type CharacterExtrasDraft } from '$lib/domain/npc-draft';

export function resolveSheetSections(
	mode: 'npc' | 'pc',
	extras: CharacterExtrasDraft,
	combatExpanded: boolean | null
): { showCombat: boolean; showAbilities: boolean } {
	const showCombat =
		mode === 'pc' ? true : (combatExpanded ?? characterSheetHasCombatStats(extras));
	const showAbilities = mode === 'pc' || showCombat;

	return { showCombat, showAbilities };
}
