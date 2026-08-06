<script lang="ts">
	import { Button, Label, Switch } from 'bits-ui';
	import {
		formatSpellSelectLabel,
		getAbilityScoreForSpellcasting,
		groupSpellDraftRowsByLevel,
		SPELLCASTING_ABILITY_LABELS,
		spellLevelLabel,
		spellsForLevel,
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

	type Props = {
		spellcasting?: CharacterSpellcastingDraft;
		spells?: CharacterSpellDraft[];
		abilities: AbilityScores;
		level: number;
		defaultClassName?: string;
		catalogSpells?: Spell[];
		disabled?: boolean;
	};

	let {
		spellcasting = $bindable(),
		spells = $bindable([]),
		abilities,
		level,
		defaultClassName = '',
		catalogSpells = [],
		disabled = false
	}: Props = $props();

	const spellsById = $derived(new Map(catalogSpells.map((spell) => [spell.spell_id, spell])));
	const groupedRows = $derived(groupSpellDraftRowsByLevel(spells, spellsById));
	const abilityScore = $derived(
		spellcasting ? getAbilityScoreForSpellcasting(abilities, spellcasting.spellcasting_ability) : null
	);
	const spellSaveDcValue = $derived(
		abilityScore != null ? spellSaveDc(abilityScore, level) : null
	);
	const spellAttackValue = $derived(
		abilityScore != null ? spellAttackBonus(abilityScore, level) : null
	);

	const displayLevels = $derived.by(() => {
		const levels = new Set<number>([0]);

		for (const spell of catalogSpells) {
			levels.add(spell.spell_level);
		}

		for (const rows of groupedRows.values()) {
			for (const row of rows) {
				const spell = spellsById.get(row.entry.spell_id);
				if (spell) levels.add(spell.spell_level);
			}
		}

		for (const slotLevel of SPELL_SLOT_LEVELS) {
			if ((spellcasting?.slots_total[slotLevel] ?? 0) > 0) {
				levels.add(slotLevel);
			}
		}

		return [...levels].sort((left, right) => left - right);
	});

	function updateSpellcasting(patch: Partial<CharacterSpellcastingDraft>) {
		if (!spellcasting) return;
		spellcasting = { ...spellcasting, ...patch };
	}

	function updateSpellEntry(index: number, patch: Partial<CharacterSpellDraft>) {
		spells = spells.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, ...patch } : entry
		);
	}

	function removeSpellEntry(index: number) {
		const next = spells.filter((_, entryIndex) => entryIndex !== index);
		spells = next.length ? next : [{ spell_id: '', prepared: false }];
	}

	function addSpellAtLevel(spellLevel: number) {
		spells = [
			...spells,
			{ spell_id: '', prepared: spellLevel > 0 ? false : true, draft_level: spellLevel }
		];
	}

	function updateSlotTotal(slotLevel: SpellSlotLevel, value: number) {
		if (!spellcasting) return;
		updateSpellcasting({
			slots_total: updateSpellSlot(spellcasting.slots_total, slotLevel, value)
		});
	}

	function updateSlotExpended(slotLevel: SpellSlotLevel, value: number) {
		if (!spellcasting) return;
		updateSpellcasting({
			slots_expended: updateSpellSlot(spellcasting.slots_expended, slotLevel, value)
		});
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
					disabled={disabled}
				>
					<Switch.Thumb />
				</Switch.Root>
			</div>
		</div>

		{#if spellcasting.enabled}
			<div class="spellcasting-meta">
				<div class="field field-inline">
					<Label.Root for="character_sheet_spellcasting_class">Spellcasting class</Label.Root>
					<input
						id="character_sheet_spellcasting_class"
						bind:value={spellcasting.spellcasting_class}
						placeholder="Wizard, Cleric, Bard…"
						disabled={disabled}
					/>
				</div>
				<div class="field field-inline">
					<Label.Root for="character_sheet_spellcasting_ability">Spellcasting ability</Label.Root>
					<select
						id="character_sheet_spellcasting_ability"
						bind:value={spellcasting.spellcasting_ability}
						disabled={disabled}
					>
						<option value="">Choose ability…</option>
						{#each Object.entries(SPELLCASTING_ABILITY_LABELS) as [key, label] (key)}
							<option value={key}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="field field-inline spellcasting-stat">
					<span class="stat-label">Spell save DC</span>
					<strong>{spellSaveDcValue ?? '—'}</strong>
				</div>
				<div class="field field-inline spellcasting-stat">
					<span class="stat-label">Spell attack</span>
					<strong>{spellAttackValue != null ? formatSignedModifier(spellAttackValue) : '—'}</strong>
				</div>
			</div>

			<div class="field">
				<Label.Root>Spell slots</Label.Root>
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
									<input
										type="number"
										min="0"
										step="1"
										value={spellcasting.slots_total[slotLevel] ?? 0}
										oninput={(event) =>
											updateSlotTotal(slotLevel, Number(event.currentTarget.value) || 0)}
										disabled={disabled}
										aria-label={`Level ${slotLevel} slots total`}
									/>
								</td>
								<td>
									<input
										type="number"
										min="0"
										step="1"
										value={spellcasting.slots_expended[slotLevel] ?? 0}
										oninput={(event) =>
											updateSlotExpended(slotLevel, Number(event.currentTarget.value) || 0)}
										disabled={disabled}
										aria-label={`Level ${slotLevel} slots expended`}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="spell-level-grid">
				{#each displayLevels as spellLevel (spellLevel)}
					<div class="spell-level-block">
						<div class="spell-level-heading">
							<h3>{spellLevelLabel(spellLevel)}</h3>
							<Button.Root type="button" disabled={disabled} onclick={() => addSpellAtLevel(spellLevel)}>
								Add spell
							</Button.Root>
						</div>

						{#if (groupedRows.get(spellLevel) ?? []).length}
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
									{#each groupedRows.get(spellLevel) ?? [] as row (row.index)}
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
														disabled={disabled}
														aria-label="Prepared"
													/>
												</td>
											{/if}
											<td>
												<select
													class="catalog-select"
													value={row.entry.spell_id}
													onchange={(event) =>
														updateSpellEntry(row.index, {
															spell_id: event.currentTarget.value,
															draft_level: undefined
														})}
													disabled={disabled}
													aria-label="Spell"
												>
													<option value="">Choose spell…</option>
													{#each spellsForLevel(catalogSpells, spellLevel) as spell (spell.spell_id)}
														<option value={spell.spell_id}>{formatSpellSelectLabel(spell)}</option>
													{/each}
												</select>
											</td>
											<td class="actions-cell">
												<Button.Root
													type="button"
													data-variant="icon"
													aria-label="Remove spell"
													disabled={disabled}
													onclick={() => removeSpellEntry(row.index)}
												>
													−
												</Button.Root>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{:else}
							<p class="hint">No spells added yet.</p>
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
		font-size: 1.05rem;
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
		color: var(--color-muted, #667085);
		font-size: 0.92rem;
	}

	.spell-slots-table input {
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

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th,
	.data-table td {
		padding: 0.45rem 0.5rem;
		border-bottom: 1px solid var(--color-border, #d0d5dd);
		text-align: left;
		vertical-align: middle;
	}

	.data-table thead th {
		font-size: 0.85rem;
		color: var(--color-muted, #667085);
	}

	.prepared-cell {
		width: 4.5rem;
		text-align: center;
	}

	.actions-cell {
		width: 2.5rem;
	}

	.catalog-select {
		width: 100%;
		min-width: 0;
	}

	@media (min-width: 48rem) {
		.spellcasting-meta {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.spell-level-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 72rem) {
		.spell-level-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
