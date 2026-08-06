<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import CharacterPcStorySection from '$lib/components/character/CharacterPcStorySection.svelte';
	import CharacterPcVitalitySection from '$lib/components/character/CharacterPcVitalitySection.svelte';
	import CharacterSheetCombatSection from '$lib/components/character/CharacterSheetCombatSection.svelte';
	import CharacterSheetEquipmentSection from '$lib/components/character/CharacterSheetEquipmentSection.svelte';
	import CharacterSheetIdentitySection from '$lib/components/character/CharacterSheetIdentitySection.svelte';
	import CharacterSpellcastingSection from '$lib/components/character/CharacterSpellcastingSection.svelte';
	import { getReactiveCatalogSpells } from '$lib/stores/catalog.svelte';
	import {
		characterSheetHasCombatStats,
		createDefaultCharacterIdentity,
		createDefaultNpcExtras,
		type CharacterIdentityDraft,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import { abilityModifier, formatSignedModifier } from '$lib/games/dnd5e/rules/formulae';
	import type { NpcCharacterKind } from '$lib/types/schema';

	type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

	const ABILITY_LABELS: Record<AbilityKey, { short: string; name: string }> = {
		str: { short: 'STR', name: 'Strength' },
		dex: { short: 'DEX', name: 'Dexterity' },
		con: { short: 'CON', name: 'Constitution' },
		int: { short: 'INT', name: 'Intelligence' },
		wis: { short: 'WIS', name: 'Wisdom' },
		cha: { short: 'CHA', name: 'Charisma' }
	};

	type Props = {
		mode?: 'npc' | 'pc';
		kind?: NpcCharacterKind;
		name?: string;
		playerName?: string;
		description?: string;
		identity?: CharacterIdentityDraft;
		extras?: NpcExtrasDraft;
		characterId?: string;
		portraitFile?: File | null;
		portraitImageSource?: string | null;
		showPortrait?: boolean;
		loading?: boolean;
		statEvents?: import('$lib/types/schema').CharacterStatEvent[];
		statBases?: {
			experience: number;
			hp_max: number;
			hp_current: number;
		};
	};

	let {
		mode = 'pc',
		kind = $bindable('npc_general' as NpcCharacterKind),
		name = $bindable(''),
		playerName = $bindable(''),
		description = $bindable(''),
		identity = $bindable(createDefaultCharacterIdentity()),
		extras = $bindable(createDefaultNpcExtras()),
		characterId,
		portraitFile = $bindable(null),
		portraitImageSource = $bindable(null),
		showPortrait = true,
		loading = false,
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

	let combatExpanded = $state<boolean | null>(null);

	const showCombat = $derived(
		mode === 'pc' ? true : (combatExpanded ?? characterSheetHasCombatStats(extras))
	);
	const showAbilities = $derived(mode === 'pc' || showCombat);
	const spells = $derived(getReactiveCatalogSpells());

	function updateAbility(key: AbilityKey, value: number) {
		extras = {
			...extras,
			abilities: {
				...extras.abilities,
				[key]: value
			}
		};
	}
</script>

<div class="sheet-form">
	{#if loading}
		<p class="hint">Loading sheet…</p>
	{:else}
		<CharacterSheetIdentitySection
			{mode}
			bind:kind
			bind:name
			bind:playerName
			bind:description
			bind:identity
			bind:extras
			{characterId}
			bind:portraitFile
			bind:portraitImageSource
			{showPortrait}
			{loading}
			bind:combatExpanded
		/>

		{#if showAbilities}
			<section class="sheet-section">
				<h2>Abilities</h2>
				<p class="hint abilities-hint">Score on the left, modifier on the right.</p>
				<div class="abilities-grid" role="group" aria-label="Ability scores">
					{#each Object.entries(ABILITY_LABELS) as [key, label] (key)}
						{@const abilityKey = key as AbilityKey}
						{@const score = extras.abilities[abilityKey]}
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
							<input
								id={`character_sheet_${abilityKey}_score`}
								class="ability-score"
								type="number"
								min="1"
								max="30"
								step="1"
								value={score}
								aria-label="{label.name} score"
								oninput={(event) =>
									updateAbility(abilityKey, Number(event.currentTarget.value) || 10)}
							/>
							<span class="ability-modifier" aria-label="{label.name} modifier">
								{formatSignedModifier(modifier)}
							</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if mode === 'pc'}
			<CharacterPcVitalitySection
				bind:extras
				{statEvents}
				{statBases}
				disabled={loading}
			/>
		{:else}
			<CharacterSheetCombatSection
				{mode}
				bind:extras
				{showCombat}
				bind:combatExpanded
				{statEvents}
				{statBases}
			/>
		{/if}

		{#if mode === 'pc' || showCombat}
			<CharacterSheetEquipmentSection bind:extras />

			<CharacterSpellcastingSection
				bind:spellcasting={extras.spellcasting}
				bind:spells={extras.loadout.spells}
				abilities={extras.abilities}
				level={extras.level}
				defaultClassName={identity.class_name}
				catalogSpells={spells}
				disabled={loading}
			/>
		{/if}

		{#if mode === 'pc'}
			<CharacterPcStorySection
				bind:identity
				bind:physical={extras.physical}
				bind:roleplay={extras.roleplay}
				bind:description
				disabled={loading}
			/>
		{/if}
	{/if}
</div>

<style>
	.sheet-form {
		display: grid;
		gap: var(--space-page);
	}

	.sheet-form :global(.sheet-section h2) {
		margin: 0 0 0.65rem;
		font-size: 1.05rem;
	}

	.sheet-form :global(.sheet-section .field) {
		margin-bottom: 0;
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

	.ability-score {
		min-width: 0;
		width: 100%;
	}

	.ability-modifier {
		min-width: 2.25rem;
		font-weight: 600;
		text-align: right;
		color: var(--color-text-muted, #667085);
	}

	@media (min-width: 40rem) {
		.abilities-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
