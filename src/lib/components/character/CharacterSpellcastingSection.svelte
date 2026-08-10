<script lang="ts">
	import { Button, Label, Switch } from 'bits-ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import InlineEditableSelect from '$lib/components/shared/InlineEditableSelect.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import {
		appendLoadoutRowKey,
		addLoadoutEntry,
		removeLoadoutEntry,
		removeLoadoutRowKey,
		syncLoadoutRowKeys
	} from '$lib/domain/loadout-rows';
	import {
		createEmptyCharacterSpellDraft,
		formatSpellSelectLabel,
		getAbilityScoreForSpellcasting,
		groupSpellDraftRowsByLevel,
		groupSpellsByLevel,
		resolveSpellDisplayLevels,
		SPELLCASTING_ABILITY_LABELS,
		spellLevelLabel,
		updateSpellSlot,
		type CharacterSpellcastingDraft,
		type CharacterSpellDraft
	} from '$lib/domain/spellcasting';
	import {
		formatSignedModifier,
		spellAttackBonus,
		spellSaveDc
	} from '$lib/games/dnd5e/rules/formulae';
	import type { AbilityScores, Spell, SpellSlotLevel } from '$lib/types/schema';
	import { SPELL_SLOT_LEVELS } from '$lib/types/schema';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';

	type Props = {
		sheet: CharacterSheetStore;
		abilities: AbilityScores;
		level: number;
		defaultClassName?: string;
		catalogSpells?: Spell[];
		disabled?: boolean;
	};

	let {
		sheet,
		abilities,
		level,
		defaultClassName = '',
		catalogSpells = [],
		disabled = false
	}: Props = $props();

	let spellRowKeys = $state<string[]>([]);

	const spellcasting = $derived(sheet.extras.spellcasting);
	const spells = $derived(sheet.extras.loadout.spells);

	const spellsById = $derived(new Map(catalogSpells.map((spell) => [spell.spell_id, spell])));
	const spellsByLevel = $derived(groupSpellsByLevel(catalogSpells));
	const groupedRows = $derived(groupSpellDraftRowsByLevel(spells, spellsById));
	const abilityScore = $derived(
		spellcasting
			? getAbilityScoreForSpellcasting(abilities, spellcasting.spellcasting_ability)
			: null
	);
	const spellSaveDcValue = $derived(abilityScore != null ? spellSaveDc(abilityScore, level) : null);
	const spellAttackValue = $derived(
		abilityScore != null ? spellAttackBonus(abilityScore, level) : null
	);
	const spellcastingAbilityLabel = $derived(
		spellcasting?.spellcasting_ability
			? SPELLCASTING_ABILITY_LABELS[
					spellcasting.spellcasting_ability as keyof typeof SPELLCASTING_ABILITY_LABELS
				]
			: ''
	);

	const displayLevels = $derived(
		resolveSpellDisplayLevels(
			catalogSpells,
			groupedRows,
			spellsById,
			spellcasting?.slots_total ?? {}
		)
	);

	$effect(() => {
		const nextKeys = syncLoadoutRowKeys(spellRowKeys, 'spells', spells.length);
		if (nextKeys !== spellRowKeys) {
			spellRowKeys = nextKeys;
		}
	});

	function updateSpellcasting(patch: Partial<CharacterSpellcastingDraft>) {
		sheet.extras = {
			...sheet.extras,
			spellcasting: { ...sheet.extras.spellcasting, ...patch }
		};
	}

	function updateSpells(next: CharacterSpellDraft[]) {
		sheet.extras = {
			...sheet.extras,
			loadout: { ...sheet.extras.loadout, spells: next }
		};
	}

	function updateSpellEntry(index: number, patch: Partial<CharacterSpellDraft>) {
		updateSpells(
			spells.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
		);
	}

	function removeSpellEntry(index: number) {
		spellRowKeys = removeLoadoutRowKey(spellRowKeys, index);
		updateSpells(removeLoadoutEntry(spells, index, createEmptyCharacterSpellDraft()));
	}

	function addSpellAtLevel(spellLevel: number) {
		spellRowKeys = appendLoadoutRowKey(spellRowKeys, 'spells');
		updateSpells(
			addLoadoutEntry(spells, {
				spell_id: '',
				prepared: spellLevel > 0 ? false : true,
				draft_level: spellLevel
			})
		);
	}

	function updateSlotTotal(slotLevel: SpellSlotLevel, value: number) {
		updateSpellcasting({
			slots_total: updateSpellSlot(spellcasting.slots_total, slotLevel, value)
		});
	}

	function updateSlotExpended(slotLevel: SpellSlotLevel, value: number) {
		updateSpellcasting({
			slots_expended: updateSpellSlot(spellcasting.slots_expended, slotLevel, value)
		});
	}

	function spellDisplayLabel(spellId: string): string {
		const spell = spellsById.get(spellId);
		return spell ? formatSpellSelectLabel(spell) : '';
	}
</script>

{#if spellcasting}
	<section class="sheet-section spellcasting-section">
		<div class="spellcasting-header">
			<h2>Spellcasting</h2>
			<div class="spellcaster-toggle">
				<Label.Root for="character_sheet_spellcaster_toggle">Spellcaster</Label.Root>
				<Switch.Root
					id="character_sheet_spellcaster_toggle"
					checked={spellcasting.enabled}
					onCheckedChange={(checked) => {
						if (!spellcasting) return;
						updateSpellcasting({
							enabled: checked,
							spellcasting_class:
								checked && !spellcasting.spellcasting_class
									? defaultClassName
									: spellcasting.spellcasting_class
						});
					}}
					{disabled}
				>
					<Switch.Thumb />
				</Switch.Root>
			</div>
		</div>

		{#if spellcasting.enabled}
			<div class="spellcasting-meta">
				<InlineEditableField
					id="character_sheet_spellcasting_class"
					label="Spellcasting class"
					layout="inline"
					bind:value={sheet.extras.spellcasting.spellcasting_class}
					placeholder="Wizard, Cleric, Bard…"
					{disabled}
				/>
				<InlineEditableSelect
					id="character_sheet_spellcasting_ability"
					label="Spellcasting ability"
					layout="inline"
					bind:value={sheet.extras.spellcasting.spellcasting_ability}
					displayValue={spellcastingAbilityLabel}
					emptyLabel="Choose ability…"
					{disabled}
				>
					{#snippet options()}
						{#each Object.entries(SPELLCASTING_ABILITY_LABELS) as [key, label] (key)}
							<option value={key}>{label}</option>
						{/each}
					{/snippet}
				</InlineEditableSelect>
				<div class="spellcasting-stat">
					<span class="stat-label">Spell save DC</span>
					<strong>{spellSaveDcValue ?? '—'}</strong>
				</div>
				<div class="spellcasting-stat">
					<span class="stat-label">Spell attack</span>
					<strong>{spellAttackValue != null ? formatSignedModifier(spellAttackValue) : '—'}</strong>
				</div>
			</div>

			<div class="spell-slots-block">
				<span class="spell-slots-heading">Spell slots</span>
				<div class="table-wrap">
					<table class="data-table spell-slots-table">
						<thead>
							<tr>
								<th scope="col">Level</th>
								<th scope="col">Total</th>
								<th scope="col">Expended</th>
							</tr>
						</thead>
						<tbody>
							{#each SPELL_SLOT_LEVELS as slotLevel (slotLevel)}
								<tr>
									<th scope="row">{slotLevel}</th>
									<td>
										<InlineEditableField
											hideLabel
											type="number"
											min={0}
											step={1}
											class="slot-field"
											value={spellcasting.slots_total[slotLevel] ?? 0}
											oncommit={(next) =>
												updateSlotTotal(slotLevel, typeof next === 'number' ? next : 0)}
											aria-label={`Level ${slotLevel} slots total`}
											{disabled}
										/>
									</td>
									<td>
										<InlineEditableField
											hideLabel
											type="number"
											min={0}
											step={1}
											class="slot-field"
											value={spellcasting.slots_expended[slotLevel] ?? 0}
											oncommit={(next) =>
												updateSlotExpended(slotLevel, typeof next === 'number' ? next : 0)}
											aria-label={`Level ${slotLevel} slots expended`}
											{disabled}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div class="spell-level-grid">
				{#each displayLevels as spellLevel (spellLevel)}
					<div class="spell-level-block">
						<div class="spell-level-heading">
							<h3>{spellLevelLabel(spellLevel)}</h3>
							<Button.Root type="button" {disabled} onclick={() => addSpellAtLevel(spellLevel)}>
								Add spell
							</Button.Root>
						</div>

						{#if (groupedRows.get(spellLevel) ?? []).length}
							<div class="table-wrap">
								<table class="data-table spell-list-table">
									<thead>
										<tr>
											{#if spellLevel > 0}
												<th scope="col">Prepared</th>
											{/if}
											<th scope="col">Spell</th>
											<th scope="col"></th>
										</tr>
									</thead>
									<tbody>
										{#each groupedRows.get(spellLevel) ?? [] as row (spellRowKeys[row.index] ?? row.index)}
											<tr>
												{#if spellLevel > 0}
													<td class="prepared-cell">
														<input
															type="checkbox"
															checked={row.entry.prepared}
															onchange={(event) =>
																updateSpellEntry(row.index, {
																	prepared: event.currentTarget.checked
																})}
															{disabled}
															aria-label="Prepared"
														/>
													</td>
												{/if}
												<td>
													<InlineEditableSelect
														value={row.entry.spell_id}
														displayValue={spellDisplayLabel(row.entry.spell_id)}
														emptyLabel="Choose spell…"
														aria-label="Spell"
														{disabled}
														onchange={(event) =>
															updateSpellEntry(row.index, {
																spell_id: event.currentTarget.value,
																draft_level: undefined
															})}
													>
														{#snippet options()}
															{#each spellsByLevel.get(spellLevel) ?? [] as spell (spell.spell_id)}
																<option value={spell.spell_id}
																	>{formatSpellSelectLabel(spell)}</option
																>
															{/each}
														{/snippet}
													</InlineEditableSelect>
												</td>
												<td class="actions-cell">
													<RemoveIconButton
														ariaLabel="Remove spell"
														disabled={disabled}
														onclick={() => removeSpellEntry(row.index)}
													/>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<EmptyState message="No spells added yet." />
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.spellcasting-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
	}

	.spellcasting-header h2 {
		margin: 0;
		font-size: clamp(1.25rem, 4vw, 1.5rem);
		line-height: 1.2;
	}

	.spellcaster-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.spellcasting-meta {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.spellcasting-stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: 0.92rem;
	}

	.spell-slots-block {
		margin-bottom: 1rem;
	}

	.spell-slots-heading {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.spell-slots-table :global(.slot-field .inline-editable-display) {
		width: 4rem;
	}

	.spell-level-grid {
		display: grid;
		gap: 1rem;
	}

	.spell-level-block {
		display: grid;
		gap: 0.5rem;
	}

	.spell-level-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.spell-level-heading h3 {
		margin: 0;
		font-size: 0.98rem;
	}

	.table-wrap {
		width: 100%;
		max-width: 100%;
	}

	.data-table th,
	.data-table td {
		padding: 0.45rem 0.5rem;
		vertical-align: middle;
	}

	.data-table thead th {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.prepared-cell {
		width: 4.5rem;
		text-align: center;
	}

	.actions-cell {
		width: 2.5rem;
	}

	@media (--desktop) {
		.spellcasting-meta {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.spell-level-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (--wide) {
		.spell-level-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
