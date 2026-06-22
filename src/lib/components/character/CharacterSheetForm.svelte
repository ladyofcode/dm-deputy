<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import StatHistoryTooltip from '$lib/components/character/StatHistoryTooltip.svelte';
	import {
		getCachedArmor,
		getCachedItems,
		getCachedSpells,
		getCachedWeapons,
		isCatalogCacheReady
	} from '$lib/db/catalog-cache';
	import { createDefaultNpcExtras, type NpcExtrasDraft } from '$lib/domain/npc-draft';
	import { CHARACTER_KIND_LABELS, type NpcCharacterKind } from '$lib/types/schema';

	type Props = {
		mode?: 'npc' | 'pc';
		kind?: NpcCharacterKind;
		name?: string;
		description?: string;
		extras?: NpcExtrasDraft;
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
		extras = $bindable(createDefaultNpcExtras()),
		loading = false,
		statEvents = [],
		statBases = { experience: 0, hp_max: 0, hp_current: 0 }
	}: Props = $props();

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
		<section class="sheet-section">
			<h2>Identity</h2>
			<div class="identity-row">
				{#if mode === 'npc'}
					<select bind:value={kind} aria-label="NPC type">
						<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
						<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
					</select>
				{/if}
				<input bind:value={name} placeholder="Name" aria-label="Character name" />
			</div>
			<div class="field">
				<Label.Root for="character_sheet_notes">Notes</Label.Root>
				<textarea
					id="character_sheet_notes"
					bind:value={description}
					placeholder="Optional description or notes"
					rows="4"
				></textarea>
			</div>
		</section>

		<section class="sheet-section">
			<h2>Stats</h2>
			<div class="stats-grid">
				<div class="field">
					<Label.Root for="character_sheet_level">Level</Label.Root>
					<input
						id="character_sheet_level"
						type="number"
						min="1"
						step="1"
						bind:value={extras.level}
					/>
				</div>
				<div class="field">
					<div class="stat-label-row">
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
				<div class="field">
					<div class="stat-label-row">
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
				<div class="field">
					<div class="stat-label-row">
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
			<div class="field">
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

			<div class="field">
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
								onchange={(event) => updateLoadoutRow('spells', index, event.currentTarget.value)}
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

	.identity-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.identity-row select {
		flex: 0 0 9rem;
		min-width: 0;
	}

	.identity-row input {
		flex: 1;
		min-width: 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.stat-label-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.35rem;
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
</style>
