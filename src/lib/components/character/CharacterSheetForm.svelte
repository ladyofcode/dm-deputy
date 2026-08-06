<script lang="ts">
	import { Button, Label, Switch, Tooltip } from 'bits-ui';
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
	import CharacterPcStorySection from '$lib/components/character/CharacterPcStorySection.svelte';
	import CharacterPcVitalitySection from '$lib/components/character/CharacterPcVitalitySection.svelte';
	import CharacterSpellcastingSection from '$lib/components/character/CharacterSpellcastingSection.svelte';
	import StatHistoryTooltip from '$lib/components/character/StatHistoryTooltip.svelte';
	import {
		getCachedArmor,
		getCachedItems,
		getCachedSpells,
		getCachedWeapons,
		isCatalogCacheReady
	} from '$lib/db/catalog-cache';
	import { CHARACTER_ALIGNMENTS } from '$lib/domain/character-alignments';
	import {
		characterSheetHasCombatStats,
		createDefaultCharacterIdentity,
		createDefaultNpcExtras,
		type CharacterIdentityDraft,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import { abilityModifier, formatSignedModifier } from '$lib/games/dnd5e/rules/formulae';
	import {
		formatArmorSelectLabel,
		formatItemSelectLabel,
		formatWeaponSelectLabel,
		groupArmorByCategory,
		groupItemsByCategory,
		groupWeaponsByCategory,
		ITEM_CATEGORY_ORDER
	} from '$lib/domain/catalog-select';
	import { ITEM_CATEGORY_LABELS } from '$lib/domain/catalog';
	import { loadMonsterTemplateIntoDraft } from '$lib/games/dnd5e/data/monsters';
	import {
		getMonsterTemplates,
		getStoredMonsterTemplateById,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { CHARACTER_KIND_LABELS, type ItemCategory, type NpcCharacterKind } from '$lib/types/schema';

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
	let selectedTemplateId = $state('');
	let loadingTemplate = $state(false);
	let itemCategoryFilter = $state<ItemCategory | ''>('');
	const showCombat = $derived(
		mode === 'pc' ? true : (combatExpanded ?? characterSheetHasCombatStats(extras))
	);
	const showAbilities = $derived(mode === 'pc' || showCombat);

	const weapons = $derived(isCatalogCacheReady() ? getCachedWeapons() : []);
	const armor = $derived(isCatalogCacheReady() ? getCachedArmor() : []);
	const items = $derived(isCatalogCacheReady() ? getCachedItems() : []);
	const spells = $derived(isCatalogCacheReady() ? getCachedSpells() : []);
	const weaponGroups = $derived(groupWeaponsByCategory(weapons));
	const armorGroups = $derived(groupArmorByCategory(armor));
	const itemGroups = $derived(groupItemsByCategory(items, itemCategoryFilter));
	const monsterTemplates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return getMonsterTemplates();
	});

	function addLoadoutRow(field: 'weapons' | 'items' | 'spells') {
		extras = {
			...extras,
			loadout: {
				...extras.loadout,
				[field]: [...extras.loadout[field], '']
			}
		};
	}

	function removeLoadoutRow(field: 'weapons' | 'items' | 'spells', index: number) {
		const next = extras.loadout[field].filter((_, rowIndex) => rowIndex !== index);
		extras = {
			...extras,
			loadout: {
				...extras.loadout,
				[field]: next.length ? next : ['']
			}
		};
	}

	function updateLoadoutRow(field: 'weapons' | 'items' | 'spells', index: number, value: string) {
		const next = [...extras.loadout[field]];
		next[index] = value;
		extras = {
			...extras,
			loadout: {
				...extras.loadout,
				[field]: next
			}
		};
	}

	function updateAbility(key: AbilityKey, value: number) {
		extras = {
			...extras,
			abilities: {
				...extras.abilities,
				[key]: value
			}
		};
	}

	function updateCombatField<K extends keyof NpcExtrasDraft['combat']>(
		key: K,
		value: NpcExtrasDraft['combat'][K]
	) {
		extras = {
			...extras,
			combat: {
				...extras.combat,
				[key]: value
			}
		};
	}

	async function handleLoadTemplate() {
		if (!selectedTemplateId || loadingTemplate) return;

		const template = getStoredMonsterTemplateById(selectedTemplateId);
		if (!template) return;

		loadingTemplate = true;

		try {
			const loaded = await loadMonsterTemplateIntoDraft(template, weapons, armor);
			kind = loaded.kind;
			name = loaded.name;
			identity = loaded.identity;
			extras = loaded.extras;
			portraitFile = loaded.portraitFile;
			portraitImageSource = loaded.portraitImageSource;
			combatExpanded = true;
		} finally {
			loadingTemplate = false;
		}
	}
</script>

<div class="sheet-form">
	{#if loading}
		<p class="hint">Loading sheet…</p>
	{:else}
		<section class="sheet-section identity-section">
			<h2>Identity</h2>

			{#if mode === 'npc'}
				<div class="template-row">
					<div class="field field-inline template-field">
						<Label.Root for="character_sheet_template">Monster template</Label.Root>
						<select id="character_sheet_template" bind:value={selectedTemplateId}>
							<option value="">Choose a monster…</option>
							{#each monsterTemplates as template (template.id)}
								<option value={template.id}>{template.name}</option>
							{/each}
						</select>
					</div>
					<Button.Root
						type="button"
						disabled={!selectedTemplateId || loading || loadingTemplate}
						onclick={handleLoadTemplate}
					>
						{loadingTemplate ? 'Loading…' : 'Load template'}
					</Button.Root>
				</div>
			{/if}

			<div class="identity-top" class:identity-top-single={!showPortrait}>
				<div class="identity-intro">
					{#if mode === 'pc'}
						<div class="field field-inline">
							<Label.Root for="character_sheet_player_name">Player name</Label.Root>
							<input
								id="character_sheet_player_name"
								bind:value={playerName}
								placeholder="Player name"
								aria-label="Player name"
							/>
						</div>
					{/if}

					<div class="field field-inline">
						<Label.Root for="character_sheet_name">
							{mode === 'pc' ? 'Character name' : 'Name'}
						</Label.Root>
						<input
							id="character_sheet_name"
							bind:value={name}
							placeholder={mode === 'pc' ? 'Character name' : 'Character name'}
							aria-label="Character name"
						/>
					</div>

					<div class="field field-inline">
						<Label.Root for="character_sheet_race">{mode === 'npc' ? 'Species' : 'Race'}</Label.Root>
						<input
							id="character_sheet_race"
							bind:value={identity.race}
							placeholder={mode === 'npc' ? 'Species' : 'Race'}
						/>
					</div>

					{#if mode === 'npc'}
						<div class="field field-inline">
							<Label.Root for="character_sheet_creature_type">Size / type</Label.Root>
							<input
								id="character_sheet_creature_type"
								bind:value={identity.creature_type}
								placeholder="Medium humanoid (goblinoid)"
							/>
						</div>
					{/if}
				</div>

				{#if showPortrait}
					<CharacterPortraitField
						{characterId}
						bind:portraitFile
						bind:portraitImageSource
						disabled={loading}
					/>
				{/if}
			</div>

			<div class="identity-details">
				<div class="field field-inline">
					<Label.Root for="character_sheet_alignment">Alignment</Label.Root>
					<select id="character_sheet_alignment" bind:value={identity.alignment}>
						<option value="">Choose alignment…</option>
						{#each CHARACTER_ALIGNMENTS as alignment (alignment)}
							<option value={alignment}>{alignment}</option>
						{/each}
					</select>
				</div>

				{#if mode === 'npc'}
					<div class="field field-inline">
						<Label.Root for="character_sheet_type">Type</Label.Root>
						<select id="character_sheet_type" bind:value={kind} aria-label="NPC type">
							<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
							<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
						</select>
					</div>
				{/if}

				<div class="field field-inline">
					<Label.Root for="character_sheet_class">Class</Label.Root>
					<input
						id="character_sheet_class"
						bind:value={identity.class_name}
						placeholder="Class"
					/>
				</div>

				<div class="field field-inline">
					<Label.Root for="character_sheet_level">Level</Label.Root>
					<input
						id="character_sheet_level"
						type="number"
						min="1"
						max="20"
						step="1"
						bind:value={extras.level}
					/>
				</div>

				{#if mode === 'pc'}
					<div class="field field-inline">
						<Label.Root for="character_sheet_background">Background</Label.Root>
						<input
							id="character_sheet_background"
							bind:value={extras.roleplay.background}
							placeholder="Background"
						/>
					</div>
				{/if}

				{#if mode === 'npc'}
					<div class="field field-inline">
						<Label.Root for="character_sheet_age">Age</Label.Root>
						<input id="character_sheet_age" bind:value={identity.age} placeholder="Age" />
					</div>
				{/if}

				{#if mode === 'npc'}
				<div class="field field-stacked identity-notes">
					<Label.Root for="character_sheet_presentation">Presentation</Label.Root>
					<textarea
						id="character_sheet_presentation"
						bind:value={identity.presentation}
						placeholder="How this character presents — appearance, mannerisms, voice…"
						rows="3"
					></textarea>
				</div>

				<div class="field field-stacked identity-notes">
					<Label.Root for="character_sheet_notes">Notes</Label.Root>
					<textarea
						id="character_sheet_notes"
						bind:value={description}
						placeholder="Optional description or notes"
						rows="4"
					></textarea>
				</div>
				{/if}
			</div>
		</section>

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

		{#if mode === 'pc'}
			<CharacterPcVitalitySection
				bind:extras
				{statEvents}
				{statBases}
				disabled={loading}
			/>
		{:else if showCombat}
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

		{#if mode === 'pc' || showCombat}
			<section class="sheet-section">
				<h2>Equipment</h2>

				<div class="field">
					<Label.Root>Weapons</Label.Root>
					<ul class="loadout-lines list-plain">
						{#each extras.loadout.weapons as weaponId, index (index)}
							<li class="loadout-line">
								<select
									class="catalog-select"
									value={weaponId}
									aria-label="Weapon"
									onchange={(event) =>
										updateLoadoutRow('weapons', index, event.currentTarget.value)}
								>
									<option value="">None</option>
									{#each weaponGroups as group (group.label)}
										<optgroup label={group.label}>
											{#each group.entries as weapon (weapon.weapon_id)}
												<option value={weapon.weapon_id}>
													{formatWeaponSelectLabel(weapon)}
												</option>
											{/each}
										</optgroup>
									{/each}
								</select>
								{#if extras.loadout.weapons.length > 1 || weaponId}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Remove weapon"
										onclick={() => removeLoadoutRow('weapons', index)}
									>
										−
									</Button.Root>
								{/if}
								{#if index === extras.loadout.weapons.length - 1}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Add weapon"
										onclick={() => addLoadoutRow('weapons')}
									>
										+
									</Button.Root>
								{/if}
							</li>
						{/each}
					</ul>
				</div>

				<div class="field field-inline">
					<Label.Root for="character_sheet_armor">Armor</Label.Root>
					<select id="character_sheet_armor" class="catalog-select" bind:value={extras.loadout.armor}>
						<option value="">None</option>
						{#each armorGroups as group (group.label)}
							<optgroup label={group.label}>
								{#each group.entries as entry (entry.armor_id)}
									<option value={entry.armor_id}>{formatArmorSelectLabel(entry)}</option>
								{/each}
							</optgroup>
						{/each}
					</select>
				</div>

				<div class="field field-inline">
					<Label.Root for="character_sheet_item_category">Gear category</Label.Root>
					<select id="character_sheet_item_category" bind:value={itemCategoryFilter}>
						<option value="">All categories</option>
						{#each ITEM_CATEGORY_ORDER as category (category)}
							<option value={category}>{ITEM_CATEGORY_LABELS[category]}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<Label.Root>Items</Label.Root>
					<ul class="loadout-lines list-plain">
						{#each extras.loadout.items as itemId, index (index)}
							<li class="loadout-line">
								<select
									class="catalog-select"
									value={itemId}
									aria-label="Item"
									onchange={(event) => updateLoadoutRow('items', index, event.currentTarget.value)}
								>
									<option value="">None</option>
									{#each itemGroups as group (group.label)}
										<optgroup label={group.label}>
											{#each group.entries as item (item.item_id)}
												<option value={item.item_id}>{formatItemSelectLabel(item)}</option>
											{/each}
										</optgroup>
									{/each}
								</select>
								{#if extras.loadout.items.length > 1 || itemId}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Remove item"
										onclick={() => removeLoadoutRow('items', index)}
									>
										−
									</Button.Root>
								{/if}
								{#if index === extras.loadout.items.length - 1}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Add item"
										onclick={() => addLoadoutRow('items')}
									>
										+
									</Button.Root>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</section>

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
	.template-row {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.template-field {
		flex: 1;
		min-width: min(100%, 14rem);
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

	.sheet-form {
		display: grid;
		gap: var(--space-page);
	}

	.sheet-section h2 {
		margin: 0 0 0.65rem;
		font-size: 1.05rem;
	}

	.sheet-section .field {
		margin-bottom: 0;
	}

	.identity-intro {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

	.identity-top {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1fr);
	}

	.identity-details {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
		margin-top: 0.75rem;
	}

	.identity-notes {
		grid-column: 1 / -1;
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

	.loadout-lines {
		display: grid;
		gap: 0.5rem;
	}

	.loadout-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.loadout-line select {
		flex: 1;
		min-width: 0;
	}

	@media (min-width: 40rem) {
		.abilities-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.field-inline {
			grid-template-columns: 6.75rem minmax(0, 1fr);
			align-items: center;
		}

		.identity-top:not(.identity-top-single) {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: start;
		}

		.identity-details {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
