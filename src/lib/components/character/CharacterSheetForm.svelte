<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import CharacterPcStorySection from '$lib/components/character/CharacterPcStorySection.svelte';
	import CharacterPcVitalitySection from '$lib/components/character/CharacterPcVitalitySection.svelte';
	import CharacterSheetCombatSection from '$lib/components/character/CharacterSheetCombatSection.svelte';
	import CharacterSheetEquipmentSection from '$lib/components/character/CharacterSheetEquipmentSection.svelte';
	import CharacterSheetIdentitySection from '$lib/components/character/CharacterSheetIdentitySection.svelte';
	import CharacterSheetPresentationSection from '$lib/components/character/CharacterSheetPresentationSection.svelte';
	import CharacterSpellcastingSection from '$lib/components/character/CharacterSpellcastingSection.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import { resolveSheetSections } from '$lib/domain/resolve-sheet-sections';
	import { updateAbilityDraft } from '$lib/domain/npc-draft';
	import { getReactiveCatalogSpells } from '$lib/stores/catalog.svelte';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { ABILITY_LABELS, type AbilityKey } from '$lib/games/dnd5e/data/abilities';
	import { abilityModifier, formatSignedModifier } from '$lib/games/dnd5e/rules/formulae';
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		sheet: CharacterSheetStore;
		mode?: 'npc' | 'pc';
		characterId?: string;
		showPortrait?: boolean;
		templateMode?: boolean;
		readOnly?: boolean;
		onPortraitFileChange?: (result: ImageUploadResult) => void;
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
	};

	let {
		sheet,
		mode = 'pc',
		characterId,
		showPortrait = true,
		templateMode = false,
		readOnly = false,
		onPortraitFileChange,
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

	const { showCombat, showAbilities } = $derived(
		resolveSheetSections(mode, sheet.extras, sheet.combatExpanded)
	);
	const spells = $derived(getReactiveCatalogSpells());

	function updateAbility(key: AbilityKey, value: number) {
		sheet.extras = updateAbilityDraft(sheet.extras, key, value);
	}
</script>

<div class="sheet-form">
	{#if sheet.loading}
		<LoadingState message="Loading sheet…" />
	{:else}
		<CharacterSheetIdentitySection
			{mode}
			bind:kind={sheet.kind}
			bind:name={sheet.name}
			bind:playerName={sheet.playerName}
			bind:description={sheet.description}
			bind:identity={sheet.identity}
			bind:extras={sheet.extras}
			{characterId}
			bind:portraitFile={sheet.portraitFile}
			bind:portraitImageSource={sheet.portraitImageSource}
			{showPortrait}
			descriptionBeforeNotes={templateMode}
			{onPortraitFileChange}
			loading={sheet.loading}
			{readOnly}
		/>

		{#if mode === 'npc' && !templateMode}
			<CharacterSheetPresentationSection
				bind:identity={sheet.identity}
				{characterId}
				bind:presentationFile={sheet.presentationFile}
				bind:presentationImageSource={sheet.presentationImageSource}
				loading={sheet.loading}
				{readOnly}
			/>
		{/if}

		{#if showAbilities}
			<section class="sheet-section">
				<h2>Abilities</h2>
				{#if readOnly}
					<div class="abilities-grid" role="group" aria-label="Ability scores">
						{#each Object.entries(ABILITY_LABELS) as [key, label] (key)}
							{@const abilityKey = key as AbilityKey}
							{@const score = sheet.extras.abilities[abilityKey]}
							{@const modifier = abilityModifier(score)}
							<div class="ability-row ability-row-readonly">
								<span class="ability-short">{label.short}</span>
								<span class="ability-score-readonly">{score}</span>
								<span class="ability-modifier">{formatSignedModifier(modifier)}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="hint abilities-hint">Score on the left, modifier on the right.</p>
					<div class="abilities-grid" role="group" aria-label="Ability scores">
						{#each Object.entries(ABILITY_LABELS) as [key, label] (key)}
							{@const abilityKey = key as AbilityKey}
							{@const score = sheet.extras.abilities[abilityKey]}
							{@const modifier = abilityModifier(score)}
							<div class="ability-row">
								<Tooltip.Root>
									<Tooltip.Trigger class="ability-short" type="button">
										{label.short}
									</Tooltip.Trigger>
									<Tooltip.Portal>
										<Tooltip.Content>{label.name}</Tooltip.Content>
									</Tooltip.Portal>
								</Tooltip.Root>
								<InlineEditableField
									id={`character_sheet_${abilityKey}_score`}
									class="ability-score-field"
									hideLabel
									type="number"
									min={1}
									max={30}
									step={1}
									value={score}
									oncommit={(next) =>
										updateAbility(abilityKey, typeof next === 'number' ? next : 10)}
									aria-label="{label.name} score"
								/>
								<span class="ability-modifier" aria-label="{label.name} modifier">
									{formatSignedModifier(modifier)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<fieldset class="sheet-editable-body" disabled={readOnly}>
			{#if mode === 'pc'}
				<CharacterPcVitalitySection
					bind:extras={sheet.extras}
					statEvents={sheet.statEvents}
					{statBases}
					disabled={sheet.loading || readOnly}
				/>
			{:else}
				<CharacterSheetCombatSection
					{mode}
					bind:extras={sheet.extras}
					{showCombat}
					bind:combatExpanded={sheet.combatExpanded}
					{readOnly}
					statEvents={sheet.statEvents}
					{statBases}
				/>
			{/if}

			{#if mode === 'pc' || showCombat}
				<CharacterSheetEquipmentSection bind:extras={sheet.extras} />

				<CharacterSpellcastingSection
					bind:spellcasting={sheet.extras.spellcasting}
					bind:spells={sheet.extras.loadout.spells}
					abilities={sheet.extras.abilities}
					level={sheet.extras.level}
					defaultClassName={sheet.identity.class_name}
					catalogSpells={spells}
					disabled={sheet.loading || readOnly}
				/>
			{/if}

			{#if mode === 'pc'}
				<CharacterPcStorySection
					bind:identity={sheet.identity}
					bind:physical={sheet.extras.physical}
					bind:roleplay={sheet.extras.roleplay}
					bind:description={sheet.description}
					disabled={sheet.loading || readOnly}
				/>
			{/if}
		</fieldset>
	{/if}
</div>

<style>
	.sheet-form {
		display: grid;
		gap: var(--space-page);
	}

	.sheet-form :global(.sheet-section h2) {
		margin: 0 0 0.85rem;
		font-size: clamp(1.25rem, 4vw, 1.5rem);
		line-height: 1.2;
	}

	.sheet-form :global(.sheet-section .field) {
		margin-bottom: 0;
	}

	.sheet-editable-body {
		display: grid;
		gap: var(--space-page);
		margin: 0;
		padding: 0;
		border: none;
		min-width: 0;
	}

	.abilities-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem 1rem;
	}

	.abilities-hint {
		margin: -0.35rem 0 0.65rem;
	}

	.ability-row {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr) auto;
		gap: 0.5rem;
		align-items: center;
	}

	.ability-row-readonly .ability-short {
		font-weight: 700;
		font-size: 0.95rem;
	}

	.ability-score-readonly {
		font-weight: 600;
	}

	:global(.ability-short) {
		font-weight: 700;
		font-size: 0.95rem;
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: help;
	}

	:global(.ability-score-field) {
		min-width: 0;
	}

	:global(.ability-score-field .inline-editable-display) {
		font-weight: 600;
	}

	.ability-modifier {
		min-width: 2.25rem;
		font-weight: 600;
		text-align: right;
		color: var(--color-text-muted);
	}

	@media (--layout) {
		.abilities-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
