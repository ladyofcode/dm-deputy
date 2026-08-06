<script lang="ts">
	import { Label, Switch } from 'bits-ui';
	import StatHistoryTooltip from '$lib/components/character/StatHistoryTooltip.svelte';
	import type { NpcExtrasDraft } from '$lib/domain/npc-draft';

	type Props = {
		mode?: 'npc' | 'pc';
		extras?: NpcExtrasDraft;
		showCombat?: boolean;
		combatExpanded?: boolean | null;
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
		combatExpanded = $bindable(null),
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

	function updateCombatField<K extends keyof NpcExtrasDraft['combat']>(
		key: K,
		value: NpcExtrasDraft['combat'][K]
	) {
		if (!extras) return;
		extras = {
			...extras,
			combat: {
				...extras.combat,
				[key]: value
			}
		};
	}
</script>

{#if mode === 'npc'}
	<div class="combat-toggle-row">
		<Label.Root for="character_sheet_combat_toggle">Combat</Label.Root>
		<Switch.Root
			id="character_sheet_combat_toggle"
			checked={showCombat}
			onCheckedChange={(checked) => (combatExpanded = checked)}
		>
			<Switch.Thumb />
		</Switch.Root>
	</div>
{/if}

{#if mode === 'npc' && showCombat && extras}
	<section class="sheet-section">
		<h2>Stats</h2>
		<div class="stats-grid">
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="character_sheet_xp">XP</Label.Root>
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
					id="character_sheet_xp"
					type="number"
					min="0"
					step="1"
					bind:value={extras.experience}
				/>
			</div>
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="character_sheet_hp_max">HP max</Label.Root>
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
					id="character_sheet_hp_max"
					type="number"
					min="0"
					step="1"
					bind:value={extras.hp_max}
				/>
			</div>
			<div class="field field-inline">
				<div class="field-inline-label">
					<Label.Root for="character_sheet_hp_current">HP current</Label.Root>
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
					id="character_sheet_hp_current"
					type="number"
					min="0"
					step="1"
					bind:value={extras.hp_current}
				/>
			</div>
		</div>
		<div class="field field-inline">
			<Label.Root for="character_sheet_reputation">Reputation</Label.Root>
			<input
				id="character_sheet_reputation"
				bind:value={extras.reputation}
				placeholder="Optional reputation note"
			/>
		</div>

		<div class="stats-grid">
			<div class="field field-inline">
				<Label.Root for="character_sheet_ac">Armor class</Label.Root>
				<input
					id="character_sheet_ac"
					type="number"
					min="0"
					step="1"
					value={extras.combat.armor_class}
					oninput={(event) =>
						updateCombatField('armor_class', Number(event.currentTarget.value) || 0)}
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="character_sheet_ac_notes">AC notes</Label.Root>
				<input
					id="character_sheet_ac_notes"
					value={extras.combat.armor_class_notes}
					oninput={(event) => updateCombatField('armor_class_notes', event.currentTarget.value)}
					placeholder="hide armor, shield"
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="character_sheet_speed">Speed</Label.Root>
				<input
					id="character_sheet_speed"
					value={extras.combat.speed}
					oninput={(event) => updateCombatField('speed', event.currentTarget.value)}
					placeholder="30 ft."
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="character_sheet_hp_dice">Hit dice</Label.Root>
				<input
					id="character_sheet_hp_dice"
					value={extras.combat.hp_dice}
					oninput={(event) => updateCombatField('hp_dice', event.currentTarget.value)}
					placeholder="5d8 + 5"
				/>
			</div>
			<div class="field field-inline">
				<Label.Root for="character_sheet_cr">Challenge rating</Label.Root>
				<input
					id="character_sheet_cr"
					value={extras.combat.challenge_rating}
					oninput={(event) => updateCombatField('challenge_rating', event.currentTarget.value)}
					placeholder="1"
				/>
			</div>
		</div>

		<div class="field field-stacked">
			<Label.Root for="character_sheet_skills">Skills</Label.Root>
			<input
				id="character_sheet_skills"
				value={extras.combat.skills}
				oninput={(event) => updateCombatField('skills', event.currentTarget.value)}
				placeholder="Stealth +6, Survival +2"
			/>
		</div>

		<div class="field field-stacked">
			<Label.Root for="character_sheet_senses">Senses</Label.Root>
			<input
				id="character_sheet_senses"
				value={extras.combat.senses}
				oninput={(event) => updateCombatField('senses', event.currentTarget.value)}
				placeholder="darkvision 60 ft., passive Perception 10"
			/>
		</div>

		<div class="field field-stacked">
			<Label.Root for="character_sheet_languages">Languages</Label.Root>
			<input
				id="character_sheet_languages"
				value={extras.combat.languages}
				oninput={(event) => updateCombatField('languages', event.currentTarget.value)}
				placeholder="Common, Goblin"
			/>
		</div>

		<div class="field field-stacked">
			<Label.Root for="character_sheet_traits">Traits</Label.Root>
			<textarea
				id="character_sheet_traits"
				value={extras.combat.traits}
				oninput={(event) => updateCombatField('traits', event.currentTarget.value)}
				placeholder="Passive abilities and special traits"
				rows="4"
			></textarea>
		</div>

		<div class="field field-stacked">
			<Label.Root for="character_sheet_actions">Actions</Label.Root>
			<textarea
				id="character_sheet_actions"
				value={extras.combat.actions}
				oninput={(event) => updateCombatField('actions', event.currentTarget.value)}
				placeholder="Attacks and other actions"
				rows="4"
			></textarea>
		</div>
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

	.stats-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.field-inline {
		display: grid;
		gap: var(--space-field);
		grid-template-columns: minmax(0, 1fr);
	}

	.field-stacked {
		display: grid;
		gap: var(--space-field);
		grid-template-columns: minmax(0, 1fr);
	}

	.field-inline-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.field-inline :global(label) {
		margin: 0;
	}

	@media (min-width: 40rem) {
		.field-inline {
			grid-template-columns: 6.75rem minmax(0, 1fr);
			align-items: center;
		}

		.stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
