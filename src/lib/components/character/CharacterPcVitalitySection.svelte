<script lang="ts">
	import { Label } from 'bits-ui';
	import StatHistoryTooltip from '$lib/components/character/StatHistoryTooltip.svelte';
	import type { CharacterCombatDraft, CharacterVitalityDraft, NpcExtrasDraft } from '$lib/domain/npc-draft';
	import {
		abilityModifier,
		formatSignedModifier,
		proficiencyBonus
	} from '$lib/games/dnd5e/rules/formulae';

	type Props = {
		extras?: NpcExtrasDraft;
		statEvents?: import('$lib/types/schema').CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
		disabled?: boolean;
	};

	let {
		extras = $bindable(),
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 },
		disabled = false
	}: Props = $props();

	const proficiency = $derived(extras ? proficiencyBonus(extras.level) : 2);
	const dexModifier = $derived(extras ? abilityModifier(extras.abilities.dex) : 0);
	const suggestedInitiative = $derived(formatSignedModifier(dexModifier));

	function updateCombatField<K extends keyof CharacterCombatDraft>(
		key: K,
		value: CharacterCombatDraft[K]
	) {
		if (!extras) return;
		extras = {
			...extras,
			combat: { ...extras.combat, [key]: value }
		};
	}

	function updateVitalityField<K extends keyof CharacterVitalityDraft>(
		key: K,
		value: CharacterVitalityDraft[K]
	) {
		if (!extras) return;
		extras = {
			...extras,
			vitality: { ...extras.vitality, [key]: value }
		};
	}
</script>

{#if extras}
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
					checked={extras.vitality.inspiration}
					onchange={(event) => updateVitalityField('inspiration', event.currentTarget.checked)}
					disabled={disabled}
				/>
				Inspiration
			</label>
		</div>

		<div class="stats-grid">
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="pc_sheet_xp">XP</Label.Root>
					<StatHistoryTooltip
						stat="experience"
						events={statEvents}
						currentValue={extras.experience}
						baseValue={statBases.experience}
						label="XP"
						variant="icon"
					/>
				</div>
				<input
					id="pc_sheet_xp"
					type="number"
					min="0"
					step="1"
					bind:value={extras.experience}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_ac">Armor class</Label.Root>
				<input
					id="pc_sheet_ac"
					type="number"
					min="0"
					step="1"
					value={extras.combat.armor_class}
					oninput={(event) =>
						updateCombatField('armor_class', Number(event.currentTarget.value) || 0)}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_ac_notes">AC notes</Label.Root>
				<input
					id="pc_sheet_ac_notes"
					value={extras.combat.armor_class_notes}
					oninput={(event) => updateCombatField('armor_class_notes', event.currentTarget.value)}
					placeholder="chain mail, shield"
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_initiative">Initiative override</Label.Root>
				<input
					id="pc_sheet_initiative"
					type="number"
					step="1"
					value={extras.vitality.initiative ?? ''}
					oninput={(event) => {
						const raw = event.currentTarget.value.trim();
						updateVitalityField('initiative', raw === '' ? null : Number(raw) || 0);
					}}
					placeholder={suggestedInitiative}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_speed">Speed</Label.Root>
				<input
					id="pc_sheet_speed"
					value={extras.combat.speed}
					oninput={(event) => updateCombatField('speed', event.currentTarget.value)}
					placeholder="30 ft."
					disabled={disabled}
				/>
			</div>
		</div>

		<div class="stats-grid">
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="pc_sheet_hp_max">HP max</Label.Root>
					<StatHistoryTooltip
						stat="hp_max"
						events={statEvents}
						currentValue={extras.hp_max}
						baseValue={statBases.hp_max}
						label="HP max"
						variant="icon"
					/>
				</div>
				<input
					id="pc_sheet_hp_max"
					type="number"
					min="0"
					step="1"
					bind:value={extras.hp_max}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="pc_sheet_hp_current">HP current</Label.Root>
					<StatHistoryTooltip
						stat="hp_current"
						events={statEvents}
						currentValue={extras.hp_current}
						baseValue={statBases.hp_current}
						label="HP current"
						variant="icon"
					/>
				</div>
				<input
					id="pc_sheet_hp_current"
					type="number"
					min="0"
					step="1"
					bind:value={extras.hp_current}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_temp_hp">Temp HP</Label.Root>
				<input
					id="pc_sheet_temp_hp"
					type="number"
					min="0"
					step="1"
					bind:value={extras.vitality.temp_hp}
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_hp_dice">Hit dice (total)</Label.Root>
				<input
					id="pc_sheet_hp_dice"
					value={extras.combat.hp_dice}
					oninput={(event) => updateCombatField('hp_dice', event.currentTarget.value)}
					placeholder="1d10"
					disabled={disabled}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_hp_dice_remaining">Hit dice (remaining)</Label.Root>
				<input
					id="pc_sheet_hp_dice_remaining"
					bind:value={extras.vitality.hit_dice_remaining}
					placeholder="3d10"
					disabled={disabled}
				/>
			</div>
		</div>

		<div class="field">
			<Label.Root>Death saves</Label.Root>
			<div class="death-save-row">
				<div class="field field-inline">
					<Label.Root for="pc_sheet_death_successes">Successes</Label.Root>
					<input
						id="pc_sheet_death_successes"
						type="number"
						min="0"
						max="3"
						step="1"
						bind:value={extras.vitality.death_save_successes}
						disabled={disabled}
					/>
				</div>
				<div class="field field-inline">
					<Label.Root for="pc_sheet_death_failures">Failures</Label.Root>
					<input
						id="pc_sheet_death_failures"
						type="number"
						min="0"
						max="3"
						step="1"
						bind:value={extras.vitality.death_save_failures}
						disabled={disabled}
					/>
				</div>
			</div>
		</div>

		<div class="stats-grid">
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_skills">Skills</Label.Root>
				<input
					id="pc_sheet_skills"
					value={extras.combat.skills}
					oninput={(event) => updateCombatField('skills', event.currentTarget.value)}
					placeholder="Perception +3, Stealth +5"
					disabled={disabled}
				/>
			</div>
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_senses">Senses</Label.Root>
				<input
					id="pc_sheet_senses"
					value={extras.combat.senses}
					oninput={(event) => updateCombatField('senses', event.currentTarget.value)}
					placeholder="darkvision 60 ft., passive Perception 13"
					disabled={disabled}
				/>
			</div>
		</div>

		<div class="field field-inline">
			<Label.Root for="pc_sheet_reputation">Reputation</Label.Root>
			<input
				id="pc_sheet_reputation"
				bind:value={extras.reputation}
				placeholder="Optional reputation note"
				disabled={disabled}
			/>
		</div>
	</section>
{/if}

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
		color: var(--color-muted, #667085);
		font-size: 0.92rem;
	}

	.inspiration-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.death-save-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	@media (min-width: 48rem) {
		.stats-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
