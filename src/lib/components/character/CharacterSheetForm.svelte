<script lang="ts">
	import { Button, Label, Switch } from 'bits-ui';
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
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
	import { CHARACTER_KIND_LABELS, type NpcCharacterKind } from '$lib/types/schema';

	type Props = {
		mode?: 'npc' | 'pc';
		kind?: NpcCharacterKind;
		name?: string;
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
	const showCombat = $derived(combatExpanded ?? characterSheetHasCombatStats(extras));

	const weapons = $derived(isCatalogCacheReady() ? getCachedWeapons() : []);
	const armor = $derived(isCatalogCacheReady() ? getCachedArmor() : []);
	const items = $derived(isCatalogCacheReady() ? getCachedItems() : []);
	const spells = $derived(isCatalogCacheReady() ? getCachedSpells() : []);

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
</script>

<div class="sheet-form">
	{#if loading}
		<p class="hint">Loading sheet…</p>
	{:else}
		<section class="sheet-section identity-section">
			<h2>Identity</h2>

			<div class="identity-top" class:identity-top-single={!showPortrait}>
				<div class="identity-intro">
					<div class="field field-inline">
						<Label.Root for="character_sheet_name">Name</Label.Root>
						<input
							id="character_sheet_name"
							bind:value={name}
							placeholder="Character name"
							aria-label="Character name"
						/>
					</div>

					<div class="field field-inline">
						<Label.Root for="character_sheet_race">Race</Label.Root>
						<input id="character_sheet_race" bind:value={identity.race} placeholder="Race" />
					</div>
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
					<Label.Root for="character_sheet_level">Level</Label.Root>
					<input
						id="character_sheet_level"
						type="number"
						min="1"
						step="1"
						bind:value={extras.level}
					/>
				</div>

				<div class="field field-inline">
					<Label.Root for="character_sheet_age">Age</Label.Root>
					<input id="character_sheet_age" bind:value={identity.age} placeholder="Age" />
				</div>

				<div class="field field-inline">
					<Label.Root for="character_sheet_class">Class</Label.Root>
					<input
						id="character_sheet_class"
						bind:value={identity.class_name}
						placeholder="Class"
					/>
				</div>

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
			</div>
		</section>

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

		{#if showCombat}
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
			</section>

			<section class="sheet-section">
				<h2>Equipment</h2>

				<div class="field">
					<Label.Root>Weapons</Label.Root>
					<ul class="loadout-lines list-plain">
						{#each extras.loadout.weapons as weaponId, index (index)}
							<li class="loadout-line">
								<select
									value={weaponId}
									aria-label="Weapon"
									onchange={(event) =>
										updateLoadoutRow('weapons', index, event.currentTarget.value)}
								>
									<option value="">None</option>
									{#each weapons as weapon (weapon.weapon_id)}
										<option value={weapon.weapon_id}>{weapon.weapon_name}</option>
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
					<select id="character_sheet_armor" bind:value={extras.loadout.armor}>
						<option value="">None</option>
						{#each armor as entry (entry.armor_id)}
							<option value={entry.armor_id}>{entry.armor_name}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<Label.Root>Items</Label.Root>
					<ul class="loadout-lines list-plain">
						{#each extras.loadout.items as itemId, index (index)}
							<li class="loadout-line">
								<select
									value={itemId}
									aria-label="Item"
									onchange={(event) => updateLoadoutRow('items', index, event.currentTarget.value)}
								>
									<option value="">None</option>
									{#each items as item (item.item_id)}
										<option value={item.item_id}>{item.item_name}</option>
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

				<div class="field">
					<Label.Root>Spells</Label.Root>
					<ul class="loadout-lines list-plain">
						{#each extras.loadout.spells as spellId, index (index)}
							<li class="loadout-line">
								<select
									value={spellId}
									aria-label="Spell"
									onchange={(event) =>
										updateLoadoutRow('spells', index, event.currentTarget.value)}
								>
									<option value="">None</option>
									{#each spells as spell (spell.spell_id)}
										<option value={spell.spell_id}>{spell.spell_name}</option>
									{/each}
								</select>
								{#if extras.loadout.spells.length > 1 || spellId}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Remove spell"
										onclick={() => removeLoadoutRow('spells', index)}
									>
										−
									</Button.Root>
								{/if}
								{#if index === extras.loadout.spells.length - 1}
									<Button.Root
										type="button"
										data-variant="icon"
										aria-label="Add spell"
										onclick={() => addLoadoutRow('spells')}
									>
										+
									</Button.Root>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
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
