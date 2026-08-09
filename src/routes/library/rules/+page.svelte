<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import CatalogEntryDialog from '$lib/components/catalog/CatalogEntryDialog.svelte';
	import CatalogTable from '$lib/components/catalog/CatalogTable.svelte';
	import SpeciesEntryDialog from '$lib/components/catalog/SpeciesEntryDialog.svelte';
	import NameGeneratorsSection from '$lib/components/library/NameGeneratorsSection.svelte';
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
	import { database } from '$lib/stores/database.svelte';
	import type { Armor, Condition, Item, Species, Spell, Weapon } from '$lib/types/schema';

	let activeTab = $state<CatalogKind>('spells');
	let catalogLoading = $state(false);
	let catalogError = $state<string | null>(null);
	let dialogOpen = $state(false);
	let speciesDialogOpen = $state(false);
	let editingEntry = $state<Spell | Weapon | Armor | Item | Condition | null>(null);
	let editingSpecies = $state<Species | null>(null);
	let deletingId = $state<string | null>(null);

	const spells = $derived(database.isReady ? getReactiveCatalogSpells() : []);
	const weapons = $derived(database.isReady ? getReactiveCatalogWeapons() : []);
	const armor = $derived(database.isReady ? getReactiveCatalogArmor() : []);
	const items = $derived(database.isReady ? getReactiveCatalogItems() : []);
	const conditions = $derived(database.isReady ? getReactiveCatalogConditions() : []);
	const species = $derived(database.isReady ? getReactiveCatalogSpecies() : []);

	const catalogReady = $derived(database.isReady && isCatalogCacheReady());
	const catalogTabOrder = Object.keys(CATALOG_KIND_LABELS) as CatalogKind[];

	function rulesTabId(kind: CatalogKind): string {
		return `rules-tab-${kind}`;
	}

	function rulesPanelId(kind: CatalogKind): string {
		return `rules-panel-${kind}`;
	}

	function handleTabKeydown(event: KeyboardEvent, kind: CatalogKind) {
		const index = catalogTabOrder.indexOf(kind);
		if (index === -1) return;

		let nextIndex: number | null = null;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			nextIndex = (index + 1) % catalogTabOrder.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			nextIndex = (index - 1 + catalogTabOrder.length) % catalogTabOrder.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = catalogTabOrder.length - 1;
		}

		if (nextIndex == null) return;

		event.preventDefault();
		const nextKind = catalogTabOrder[nextIndex];
		if (!nextKind) return;

		activeTab = nextKind;
		document.getElementById(rulesTabId(nextKind))?.focus();
	}

	$effect(() => {
		if (!database.isReady) return;

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
		{#if database.catalogError}
			<p class="hint error" role="alert">Catalog failed to load: {database.catalogError}</p>
		{/if}
	</header>

	{#if database.isReady}
		<div class="rules-toolbar">
			<div class="rules-tabs" role="tablist" aria-label="Catalog categories">
				{#each Object.entries(CATALOG_KIND_LABELS) as [kind, label] (kind)}
					<button
						type="button"
						role="tab"
						id={rulesTabId(kind as CatalogKind)}
						class="rules-tab"
						aria-selected={activeTab === kind}
						aria-controls={rulesPanelId(kind as CatalogKind)}
						tabindex={activeTab === kind ? 0 : -1}
						onclick={() => (activeTab = kind as CatalogKind)}
						onkeydown={(event) => handleTabKeydown(event, kind as CatalogKind)}
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
		{:else}
			<div
				id={rulesPanelId(activeTab)}
				role="tabpanel"
				aria-labelledby={rulesTabId(activeTab)}
				tabindex="0"
			>
				{#if activeTab === 'spells'}
					<CatalogTable
						items={spells}
						getId={(spell) => spell.spell_id}
						emptyMessage="No spells yet. Add your first homebrew spell."
						onEdit={openEditDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Level</th>
							<th scope="col">School</th>
							<th scope="col">Casting time</th>
						{/snippet}
						{#snippet row(spell)}
							<td class="name-cell">{spell.spell_name}</td>
							<td>{spell.spell_level}</td>
							<td>{SPELL_SCHOOL_LABELS[spell.spell_school]}</td>
							<td>{spell.casting_time}</td>
						{/snippet}
					</CatalogTable>
				{:else if activeTab === 'weapons'}
					<CatalogTable
						items={weapons}
						getId={(weapon) => weapon.weapon_id}
						emptyMessage="No weapons yet."
						onEdit={openEditDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Damage</th>
							<th scope="col">Type</th>
							<th scope="col">Cost</th>
						{/snippet}
						{#snippet row(weapon)}
							<td class="name-cell">{weapon.weapon_name}</td>
							<td>{weapon.damage_dice}</td>
							<td>{weapon.damage_type}</td>
							<td>{formatWeaponCost(weapon)}</td>
						{/snippet}
					</CatalogTable>
				{:else if activeTab === 'armor'}
					<CatalogTable
						items={armor}
						getId={(entry) => entry.armor_id}
						emptyMessage="No armor yet."
						onEdit={openEditDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Category</th>
							<th scope="col">AC</th>
							<th scope="col">Cost</th>
						{/snippet}
						{#snippet row(entry)}
							<td class="name-cell">{entry.armor_name}</td>
							<td>{ARMOR_CATEGORY_LABELS[entry.armor_category]}</td>
							<td>{entry.armor_class}</td>
							<td>{entry.cost} gp</td>
						{/snippet}
					</CatalogTable>
				{:else if activeTab === 'items'}
					<CatalogTable
						items={items}
						getId={(entry) => entry.item_id}
						emptyMessage="No items yet."
						onEdit={openEditDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Category</th>
							<th scope="col">Cost</th>
						{/snippet}
						{#snippet row(entry)}
							<td class="name-cell">{entry.item_name}</td>
							<td>{entry.item_subcategory ?? entry.item_category}</td>
							<td>{formatItemCost(entry)}</td>
						{/snippet}
					</CatalogTable>
				{:else if activeTab === 'conditions'}
					<CatalogTable
						items={conditions}
						getId={(entry) => entry.condition_id}
						emptyMessage="No conditions yet."
						onEdit={openEditDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Effects</th>
						{/snippet}
						{#snippet row(entry)}
							<td class="name-cell">{entry.condition_name}</td>
							<td class="description-cell">{previewDescription(entry.description)}</td>
						{/snippet}
					</CatalogTable>
				{:else if activeTab === 'species'}
					<div class="species-stack">
						<NameGeneratorsSection />
						<CatalogTable
						items={species}
						getId={(entry) => entry.species_id}
						emptyMessage="No species yet."
						onEdit={openSpeciesDialog}
						onDelete={handleDelete}
						{deletingId}
					>
						{#snippet header()}
							<th scope="col">Name</th>
							<th scope="col">Size</th>
							<th scope="col">Speed</th>
							<th scope="col">Traits</th>
						{/snippet}
						{#snippet row(entry)}
							<td class="name-cell">{entry.species_name}</td>
							<td>{entry.size}</td>
							<td>{entry.speed}</td>
							<td class="description-cell">{formatSpeciesTraitNames(entry)}</td>
						{/snippet}
					</CatalogTable>
					</div>
				{/if}
			</div>
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

	.hint.error {
		color: var(--color-danger, #b42318);
	}

	.species-stack {
		display: grid;
		gap: 1.5rem;
	}
</style>
