<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import { fromStore } from 'svelte/store';
	import CatalogEntryDialog from '$lib/components/catalog/CatalogEntryDialog.svelte';
	import SpeciesEntryDialog from '$lib/components/catalog/SpeciesEntryDialog.svelte';
	import {
		loadCatalogIfNeeded,
		removeArmor,
		removeCondition,
		removeItem,
		removeSpecies,
		removeSpell,
		removeWeapon
	} from '$lib/data/catalog-writes';
	import {
		ARMOR_CATEGORY_LABELS,
		CATALOG_KIND_LABELS,
		formatItemCost,
		formatSpeciesTraitNames,
		formatWeaponCost,
		SPELL_SCHOOL_LABELS,
		type CatalogKind
	} from '$lib/domain/catalog';
	import { isCatalogCacheReady } from '$lib/db/catalog-cache';
	import {
		getReactiveCatalogArmor,
		getReactiveCatalogConditions,
		getReactiveCatalogItems,
		getReactiveCatalogSpecies,
		getReactiveCatalogSpells,
		getReactiveCatalogWeapons
	} from '$lib/stores/catalog.svelte';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import type { Armor, Condition, Item, Species, Spell, Weapon } from '$lib/types/schema';

	const dbReady = fromStore(dbIsReady);

	let activeTab = $state<CatalogKind>('spells');
	let catalogLoading = $state(false);
	let catalogError = $state<string | null>(null);
	let dialogOpen = $state(false);
	let speciesDialogOpen = $state(false);
	let editingEntry = $state<Spell | Weapon | Armor | Item | Condition | null>(null);
	let editingSpecies = $state<Species | null>(null);
	let deletingId = $state<string | null>(null);

	const spells = $derived(dbReady.current ? getReactiveCatalogSpells() : []);
	const weapons = $derived(dbReady.current ? getReactiveCatalogWeapons() : []);
	const armor = $derived(dbReady.current ? getReactiveCatalogArmor() : []);
	const items = $derived(dbReady.current ? getReactiveCatalogItems() : []);
	const conditions = $derived(dbReady.current ? getReactiveCatalogConditions() : []);
	const species = $derived(dbReady.current ? getReactiveCatalogSpecies() : []);

	const catalogReady = $derived(dbReady.current && isCatalogCacheReady());

	$effect(() => {
		if (!dbReady.current) return;

		catalogLoading = true;
		catalogError = null;

		void loadCatalogIfNeeded()
			.catch((cause) => {
				catalogError = cause instanceof Error ? cause.message : 'Could not load rules library';
			})
			.finally(() => {
				catalogLoading = false;
			});
	});

	function openCreateDialog() {
		if (activeTab === 'species') {
			editingSpecies = null;
			speciesDialogOpen = true;
			return;
		}

		editingEntry = null;
		dialogOpen = true;
	}

	function openEditDialog(entry: Spell | Weapon | Armor | Item | Condition) {
		editingEntry = entry;
		dialogOpen = true;
	}

	function openSpeciesDialog(entry: Species) {
		editingSpecies = entry;
		speciesDialogOpen = true;
	}

	async function handleDelete(id: string) {
		if (deletingId) return;
		if (!confirm('Delete this entry from your rules library?')) return;

		deletingId = id;
		catalogError = null;

		try {
			if (activeTab === 'spells') {
				await removeSpell(id);
			} else if (activeTab === 'weapons') {
				await removeWeapon(id);
			} else if (activeTab === 'armor') {
				await removeArmor(id);
			} else if (activeTab === 'items') {
				await removeItem(id);
			} else if (activeTab === 'conditions') {
				await removeCondition(id);
			} else {
				await removeSpecies(id);
			}
		} catch (cause) {
			catalogError = cause instanceof Error ? cause.message : 'Could not delete entry';
		} finally {
			deletingId = null;
		}
	}

	function previewDescription(description: string, maxLength = 120): string {
		const normalized = description.replace(/\s+/g, ' ').trim();
		if (normalized.length <= maxLength) return normalized;
		return `${normalized.slice(0, maxLength).trimEnd()}…`;
	}
</script>

<svelte:head>
	<title>Rules library · DM Deputy</title>
</svelte:head>

<section class="page-stack library-page">
	<nav aria-label="Back to home">
		<Button.Root href={resolve('/')}>← Home</Button.Root>
	</nav>

	<header class="library-header">
		<h1>Rules library</h1>
		<p class="hint">Add and edit spells, weapons, armor, items, conditions, and species in your local D&D 5e catalog.</p>
	</header>

	{#if dbReady.current}
		<div class="rules-toolbar">
			<div class="rules-tabs" role="tablist" aria-label="Catalog categories">
				{#each Object.entries(CATALOG_KIND_LABELS) as [kind, label] (kind)}
					<button
						type="button"
						role="tab"
						class="rules-tab"
						aria-selected={activeTab === kind}
						onclick={() => (activeTab = kind as CatalogKind)}
					>
						{label}
					</button>
				{/each}
			</div>

			<Button.Root type="button" data-variant="primary" onclick={openCreateDialog}>
				Add {activeTab === 'species' ? 'species' : CATALOG_KIND_LABELS[activeTab].slice(0, -1).toLowerCase()}
			</Button.Root>
		</div>

		{#if catalogLoading && !catalogReady}
			<p class="hint">Loading rules library…</p>
		{:else if catalogError}
			<p class="hint error" role="alert">{catalogError}</p>
		{:else if activeTab === 'spells'}
			{#if spells.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Level</th>
								<th scope="col">School</th>
								<th scope="col">Casting time</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each spells as spell (spell.spell_id)}
								<tr>
									<td class="name-cell">{spell.spell_name}</td>
									<td>{spell.spell_level}</td>
									<td>{SPELL_SCHOOL_LABELS[spell.spell_school]}</td>
									<td>{spell.casting_time}</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openEditDialog(spell)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === spell.spell_id}
											onclick={() => handleDelete(spell.spell_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No spells yet. Add your first homebrew spell.</p>
			{/if}
		{:else if activeTab === 'weapons'}
			{#if weapons.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Damage</th>
								<th scope="col">Type</th>
								<th scope="col">Cost</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each weapons as weapon (weapon.weapon_id)}
								<tr>
									<td class="name-cell">{weapon.weapon_name}</td>
									<td>{weapon.damage_dice}</td>
									<td>{weapon.damage_type}</td>
									<td>{formatWeaponCost(weapon)}</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openEditDialog(weapon)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === weapon.weapon_id}
											onclick={() => handleDelete(weapon.weapon_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No weapons yet.</p>
			{/if}
		{:else if activeTab === 'armor'}
			{#if armor.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Category</th>
								<th scope="col">AC</th>
								<th scope="col">Cost</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each armor as entry (entry.armor_id)}
								<tr>
									<td class="name-cell">{entry.armor_name}</td>
									<td>{ARMOR_CATEGORY_LABELS[entry.armor_category]}</td>
									<td>{entry.armor_class}</td>
									<td>{entry.cost} gp</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openEditDialog(entry)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === entry.armor_id}
											onclick={() => handleDelete(entry.armor_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No armor yet.</p>
			{/if}
		{:else if activeTab === 'items'}
			{#if items.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Category</th>
								<th scope="col">Cost</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each items as entry (entry.item_id)}
								<tr>
									<td class="name-cell">{entry.item_name}</td>
									<td>{entry.item_subcategory ?? entry.item_category}</td>
									<td>{formatItemCost(entry)}</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openEditDialog(entry)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === entry.item_id}
											onclick={() => handleDelete(entry.item_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No items yet.</p>
			{/if}
		{:else if activeTab === 'conditions'}
			{#if conditions.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Effects</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each conditions as entry (entry.condition_id)}
								<tr>
									<td class="name-cell">{entry.condition_name}</td>
									<td class="description-cell">{previewDescription(entry.description)}</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openEditDialog(entry)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === entry.condition_id}
											onclick={() => handleDelete(entry.condition_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No conditions yet.</p>
			{/if}
		{:else if activeTab === 'species'}
			{#if species.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Size</th>
								<th scope="col">Speed</th>
								<th scope="col">Traits</th>
								<th scope="col" class="actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each species as entry (entry.species_id)}
								<tr>
									<td class="name-cell">{entry.species_name}</td>
									<td>{entry.size}</td>
									<td>{entry.speed}</td>
									<td class="description-cell">{formatSpeciesTraitNames(entry)}</td>
									<td class="actions-col">
										<Button.Root
											type="button"
											data-variant="ghost"
											onclick={() => openSpeciesDialog(entry)}
										>
											Edit
										</Button.Root>
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={deletingId === entry.species_id}
											onclick={() => handleDelete(entry.species_id)}
										>
											Delete
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No species yet.</p>
			{/if}
		{/if}
	{/if}
</section>

{#if activeTab !== 'species'}
	<CatalogEntryDialog bind:open={dialogOpen} kind={activeTab} entry={editingEntry} />
{/if}
<SpeciesEntryDialog bind:open={speciesDialogOpen} entry={editingSpecies} />

<style>
	.library-header h1 {
		margin: 0;
	}

	.library-header .hint {
		margin-top: 0.5rem;
	}

	.rules-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.rules-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.rules-tab {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.rules-tab[aria-selected='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.65rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
	}

	.data-table th {
		font-family: var(--font-heading);
		font-weight: 600;
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}

	.name-cell {
		font-weight: 600;
	}

	.description-cell {
		max-width: 36rem;
		color: var(--color-text-muted, inherit);
	}

	.actions-col {
		white-space: nowrap;
	}

	.actions-col :global([data-button-root]) {
		margin-right: 0.25rem;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
