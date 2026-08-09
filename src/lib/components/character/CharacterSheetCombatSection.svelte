<script lang="ts">
	import { Label, Switch } from 'bits-ui';
	import CharacterCombatStatsFields from '$lib/components/character/CharacterCombatStatsFields.svelte';
	import type { CharacterExtrasDraft } from '$lib/domain/npc-draft';

	type Props = {
		mode?: 'npc' | 'pc';
		extras?: CharacterExtrasDraft;
		showCombat?: boolean;
		combatExpanded: boolean | null;
		readOnly?: boolean;
		statEvents?: import('$lib/types/schema').CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
	};

	let {
		mode = 'npc',
		extras = $bindable(),
		showCombat = false,
		combatExpanded = $bindable<boolean | null>(null),
		readOnly = false,
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

	const combatToggleChecked = $derived(combatExpanded ?? showCombat);
</script>

{#if mode === 'npc' && !readOnly}
	<div class="combat-toggle-row">
		<Label.Root for="character_sheet_combat_toggle">Combat</Label.Root>
		<Switch.Root
			id="character_sheet_combat_toggle"
			checked={combatToggleChecked}
			onCheckedChange={(checked) => (combatExpanded = checked)}
		>
			<Switch.Thumb />
		</Switch.Root>
	</div>
{/if}

{#if mode === 'npc' && showCombat && extras}
	<section class="sheet-section">
		<h2>Stats</h2>
		<CharacterCombatStatsFields mode="npc" bind:extras {statEvents} {statBases} />
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
