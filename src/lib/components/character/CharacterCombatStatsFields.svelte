<script lang="ts">
	import StatHistoryTooltip from '$lib/components/character/StatHistoryTooltip.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import {
		combatScalarFieldsForMode,
		combatTextareaFieldsForMode,
		getCombatFieldValue,
		setCombatFieldValue,
		STAT_HISTORY_FIELDS,
		type CombatScalarFieldConfig,
		type CombatTextareaFieldConfig
	} from '$lib/domain/character-sheet-fields';
	import type { CharacterExtrasDraft } from '$lib/domain/npc-draft';
	import type { CharacterStatEvent, StatKind } from '$lib/types/schema';

	type Props = {
		mode?: 'pc' | 'npc';
		idPrefix?: string;
		extras?: CharacterExtrasDraft;
		statEvents?: CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
		disabled?: boolean;
		showStatHistory?: boolean;
		showReputation?: boolean;
		showScalars?: boolean;
		showTextareas?: boolean;
		statHistoryStats?: StatKind[];
		scalarFields?: CombatScalarFieldConfig[];
		textareaFields?: CombatTextareaFieldConfig[];
		scalarGridClass?: string;
		bareStatHistory?: boolean;
		bareScalars?: boolean;
	};

	let {
		mode = 'npc',
		idPrefix = 'character_sheet',
		extras = $bindable(),
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 },
		disabled = false,
		showStatHistory = true,
		showReputation = true,
		showScalars = true,
		showTextareas = true,
		statHistoryStats,
		scalarFields = combatScalarFieldsForMode(mode),
		textareaFields = combatTextareaFieldsForMode(mode),
		scalarGridClass = `stats-grid stats-grid--combat-${mode}`,
		bareStatHistory = false,
		bareScalars = false
	}: Props = $props();

	const statHistoryFields = $derived(
		statHistoryStats
			? STAT_HISTORY_FIELDS.filter((field) => statHistoryStats.includes(field.stat))
			: STAT_HISTORY_FIELDS
	);

	function fieldId(suffix: string) {
		return `${idPrefix}_${suffix}`;
	}

	function updateExtras(next: CharacterExtrasDraft) {
		extras = next;
	}

	function updateStat(stat: StatKind, value: number) {
		if (!extras) return;
		updateExtras({ ...extras, [stat]: value });
	}

	function updateCombatField(
		path: CombatScalarFieldConfig['path'] | CombatTextareaFieldConfig['path'],
		value: string | number
	) {
		if (!extras) return;
		updateExtras(setCombatFieldValue(extras, path, value));
	}
</script>

{#if extras}
	{#if showStatHistory}
		{#if bareStatHistory}
			{#each statHistoryFields as field (field.stat)}
				<InlineEditableField
					id={fieldId(field.idPrefix.replace('sheet_', ''))}
					label={field.label}
					layout="inline"
					type="number"
					min={0}
					step={1}
					value={field.getValue(extras)}
					oncommit={(next) =>
						updateStat(field.stat, typeof next === 'number' ? next : Number(next) || 0)}
					{disabled}
				>
					{#snippet labelExtra()}
						<StatHistoryTooltip
							stat={field.stat}
							events={statEvents}
							currentValue={field.getValue(extras!)}
							baseValue={statBases[field.stat]}
							label={field.label}
							variant="icon"
						/>
					{/snippet}
				</InlineEditableField>
			{/each}
		{:else}
			<div class="stats-grid stats-grid--stat-history">
				{#each statHistoryFields as field (field.stat)}
					<InlineEditableField
						id={fieldId(field.idPrefix.replace('sheet_', ''))}
						label={field.label}
						layout="inline"
						type="number"
						min={0}
						step={1}
						value={field.getValue(extras)}
						oncommit={(next) =>
							updateStat(field.stat, typeof next === 'number' ? next : Number(next) || 0)}
						{disabled}
					>
						{#snippet labelExtra()}
							<StatHistoryTooltip
								stat={field.stat}
								events={statEvents}
								currentValue={field.getValue(extras!)}
								baseValue={statBases[field.stat]}
								label={field.label}
								variant="icon"
							/>
						{/snippet}
					</InlineEditableField>
				{/each}
			</div>
		{/if}
	{/if}

	{#if showReputation}
		<InlineEditableField
			id={fieldId('reputation')}
			label="Reputation"
			layout="inline"
			bind:value={extras.reputation}
			placeholder="Optional reputation note"
			{disabled}
		/>
	{/if}

	{#if showScalars && scalarFields.length > 0}
		{#if bareScalars}
			{#each scalarFields as field (field.path)}
				<InlineEditableField
					id={fieldId(field.idPrefix.replace('sheet_', ''))}
					label={field.label}
					layout={field.layout ?? 'inline'}
					type={field.type ?? 'text'}
					min={field.min}
					step={field.step}
					value={getCombatFieldValue(extras, field.path)}
					oncommit={(next) =>
						updateCombatField(
							field.path,
							field.type === 'number'
								? typeof next === 'number'
									? next
									: Number(next) || 0
								: typeof next === 'string'
									? next
									: String(next ?? '')
						)}
					placeholder={field.placeholder}
					{disabled}
				/>
			{/each}
		{:else}
			<div class={scalarGridClass}>
				{#each scalarFields as field (field.path)}
					<InlineEditableField
						id={fieldId(field.idPrefix.replace('sheet_', ''))}
						label={field.label}
						layout={field.layout ?? 'inline'}
						type={field.type ?? 'text'}
						min={field.min}
						step={field.step}
						value={getCombatFieldValue(extras, field.path)}
						oncommit={(next) =>
							updateCombatField(
								field.path,
								field.type === 'number'
									? typeof next === 'number'
										? next
										: Number(next) || 0
									: typeof next === 'string'
										? next
										: String(next ?? '')
							)}
						placeholder={field.placeholder}
						{disabled}
					/>
				{/each}
			</div>
		{/if}
	{/if}

	{#if showTextareas && textareaFields.length > 0}
		<div class="stats-grid stats-grid--textarea">
			{#each textareaFields as field (field.path)}
				<InlineEditableField
					id={fieldId(field.idPrefix.replace('sheet_', ''))}
					label={field.label}
					type="textarea"
					wide
					rows={field.rows}
					value={getCombatFieldValue(extras, field.path)}
					oncommit={(next) =>
						updateCombatField(field.path, typeof next === 'string' ? next : String(next ?? ''))}
					placeholder={field.placeholder}
					{disabled}
				/>
			{/each}
		</div>
	{/if}
{/if}
