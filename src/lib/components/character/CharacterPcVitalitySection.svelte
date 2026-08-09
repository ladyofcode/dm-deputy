<script lang="ts">
	import CharacterCombatStatsFields from '$lib/components/character/CharacterCombatStatsFields.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import type { CharacterExtrasDraft } from '$lib/domain/npc-draft';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { formatSignedModifier, vitalityDerivedStats } from '$lib/games/dnd5e/rules/formulae';

	type Props = {
		sheet: CharacterSheetStore;
		statEvents?: import('$lib/types/schema').CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
		disabled?: boolean;
	};

	let {
		sheet,
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 },
		disabled = false
	}: Props = $props();

	const derivedStats = $derived(
		vitalityDerivedStats(sheet.extras.level, sheet.extras.abilities.dex)
	);
	const suggestedInitiative = $derived(
		derivedStats?.suggestedInitiative ?? formatSignedModifier(0)
	);
	const proficiency = $derived(derivedStats?.proficiency ?? 2);

	function updateVitalityField<K extends keyof CharacterExtrasDraft['vitality']>(
		key: K,
		value: CharacterExtrasDraft['vitality'][K]
	) {
		sheet.extras = {
			...sheet.extras,
			vitality: { ...sheet.extras.vitality, [key]: value }
		};
	}
</script>

<section class="sheet-section">
	<h2>Combat &amp; vitality</h2>

	<div class="stat-banner">
		<div class="stat-chip">
			<span class="stat-label">Proficiency</span>
			<strong>{formatSignedModifier(proficiency)}</strong>
		</div>
		<div class="stat-chip">
			<span class="stat-label">Suggested initiative</span>
			<strong>{suggestedInitiative}</strong>
		</div>
		<label class="inspiration-toggle">
			<input
				type="checkbox"
				checked={sheet.extras.vitality.inspiration}
				onchange={(event) => updateVitalityField('inspiration', event.currentTarget.checked)}
				{disabled}
			/>
			Inspiration
		</label>
	</div>

	<div class="stats-grid stats-grid--combat-pc">
		<CharacterCombatStatsFields
			{sheet}
			mode="pc"
			idPrefix="pc_sheet"
			{statEvents}
			{statBases}
			{disabled}
			statHistoryStats={['experience']}
			showReputation={false}
			showTextareas={false}
			bareStatHistory
			bareScalars
			scalarFields={[
				{
					path: 'combat.armor_class',
					label: 'Armor class',
					idPrefix: 'sheet_ac',
					type: 'number',
					min: 0,
					step: 1,
					layout: 'inline'
				},
				{
					path: 'combat.armor_class_notes',
					label: 'AC notes',
					idPrefix: 'sheet_ac_notes',
					layout: 'inline',
					placeholder: 'chain mail, shield'
				},
				{
					path: 'combat.speed',
					label: 'Speed',
					idPrefix: 'sheet_speed',
					layout: 'inline',
					placeholder: '30 ft.'
				}
			]}
		/>
		<InlineEditableField
			id="pc_sheet_initiative"
			label="Initiative override"
			layout="inline"
			type="number"
			step={1}
			nullable
			bind:value={sheet.extras.vitality.initiative}
			placeholder={suggestedInitiative}
			{disabled}
		/>
	</div>

	<div class="stats-grid stats-grid--combat-pc">
		<CharacterCombatStatsFields
			{sheet}
			mode="pc"
			idPrefix="pc_sheet"
			{statEvents}
			{statBases}
			{disabled}
			statHistoryStats={['hp_max', 'hp_current']}
			showReputation={false}
			showScalars={false}
			showTextareas={false}
			bareStatHistory
		/>
		<InlineEditableField
			id="pc_sheet_temp_hp"
			label="Temp HP"
			layout="inline"
			type="number"
			min={0}
			step={1}
			bind:value={sheet.extras.vitality.temp_hp}
			{disabled}
		/>
		<InlineEditableField
			id="pc_sheet_hp_dice"
			label="Hit dice (total)"
			layout="inline"
			bind:value={sheet.extras.combat.hp_dice}
			placeholder="1d10"
			{disabled}
		/>
		<InlineEditableField
			id="pc_sheet_hp_dice_remaining"
			label="Hit dice (remaining)"
			layout="inline"
			bind:value={sheet.extras.vitality.hit_dice_remaining}
			placeholder="3d10"
			{disabled}
		/>
	</div>

	<div class="death-save-block">
		<span class="death-save-heading">Death saves</span>
		<div class="death-save-row">
			<InlineEditableField
				id="pc_sheet_death_successes"
				label="Successes"
				layout="inline"
				type="number"
				min={0}
				max={3}
				step={1}
				bind:value={sheet.extras.vitality.death_save_successes}
				{disabled}
			/>
			<InlineEditableField
				id="pc_sheet_death_failures"
				label="Failures"
				layout="inline"
				type="number"
				min={0}
				max={3}
				step={1}
				bind:value={sheet.extras.vitality.death_save_failures}
				{disabled}
			/>
		</div>
	</div>

	<CharacterCombatStatsFields
		{sheet}
		mode="pc"
		idPrefix="pc_sheet"
		{statEvents}
		{statBases}
		{disabled}
		showStatHistory={false}
		showScalars={false}
	/>
</section>

<style>
	.stat-banner {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
		margin-bottom: 0.85rem;
	}

	.stat-chip {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: 0.92rem;
	}

	.inspiration-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}

	.death-save-block {
		margin-bottom: 0.75rem;
	}

	.death-save-heading {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.death-save-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
</style>
