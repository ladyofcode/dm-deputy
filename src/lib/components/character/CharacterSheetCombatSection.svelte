<script lang="ts">
	import { Label, Switch } from 'bits-ui';
	import CharacterCombatStatsFields from '$lib/components/character/CharacterCombatStatsFields.svelte';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';

	type Props = {
		sheet: CharacterSheetStore;
		mode?: 'npc' | 'pc';
		showCombat?: boolean;
		readOnly?: boolean;
		statEvents?: import('$lib/types/schema').CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
	};

	let {
		sheet,
		mode = 'npc',
		showCombat = false,
		readOnly = false,
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

	const combatToggleChecked = $derived(sheet.combatExpanded ?? showCombat);
</script>

{#if mode === 'npc' && !readOnly}
	<div class="combat-toggle-row">
		<Label.Root for="character_sheet_combat_toggle">Combat</Label.Root>
		<Switch.Root
			id="character_sheet_combat_toggle"
			checked={combatToggleChecked}
			onCheckedChange={(checked) => (sheet.combatExpanded = checked)}
		>
			<Switch.Thumb />
		</Switch.Root>
	</div>
{/if}

{#if mode === 'npc' && showCombat}
	<section class="sheet-section">
		<h2>Stats</h2>
		<CharacterCombatStatsFields {sheet} mode="npc" {statEvents} {statBases} />
	</section>
{/if}

<style>
	.combat-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.combat-toggle-row :global(label) {
		margin: 0;
		font-weight: 600;
	}
</style>
