<script lang="ts">
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import { formatErrorMessage } from '$lib/domain/errors';
	import CatalogEntryDialog from '$lib/components/catalog/CatalogEntryDialog.svelte';
	import CatalogTabBar from '$lib/components/catalog/CatalogTabBar.svelte';
	import RulesCatalogTable from '$lib/components/catalog/RulesCatalogTable.svelte';
	import LibraryAddButton from '$lib/components/library/LibraryAddButton.svelte';
	import RaceNameGenerator from '$lib/components/library/RaceNameGenerator.svelte';
	import {
		loadCatalogIfNeeded,
		removeArmor,
		removeCondition,
		removeItem,
		removeSpecies,
		removeSpell,
		removeWeapon
	} from '$lib/data/catalog-writes';
	import { CATALOG_KIND_LABELS, type CatalogKind } from '$lib/domain/catalog';
	import {
		RULES_CATALOG_CONFIGS,
		rulesCatalogItems,
		rulesPanelId,
		rulesTabId
	} from '$lib/domain/rules-catalog-table';
	import type { RulesCatalogEntry } from '$lib/domain/rules-catalog-table';
	import { RACE_NAME_GENERATORS } from '$lib/games/dnd5e/data/name-generators';
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
	let editingEntry = $state<Spell | Weapon | Armor | Item | Condition | Species | null>(null);
	let deletingId = $state<string | null>(null);

	const spells = $derived(database.isReady ? getReactiveCatalogSpells() : []);
	const weapons = $derived(database.isReady ? getReactiveCatalogWeapons() : []);
	const armor = $derived(database.isReady ? getReactiveCatalogArmor() : []);
	const items = $derived(database.isReady ? getReactiveCatalogItems() : []);
	const conditions = $derived(database.isReady ? getReactiveCatalogConditions() : []);
	const species = $derived(database.isReady ? getReactiveCatalogSpecies() : []);

	const catalogItems = $derived(
		rulesCatalogItems(activeTab, {
			spells,
			weapons,
			armor,
			items,
			conditions,
			species
		})
	);

	const activeConfig = $derived(RULES_CATALOG_CONFIGS[activeTab]);

	const catalogReady = $derived(database.isReady && isCatalogCacheReady());
	const addLabel = $derived(
		activeTab === 'species' ? 'species' : CATALOG_KIND_LABELS[activeTab].slice(0, -1).toLowerCase()
	);

	$effect(() => {
		if (!database.isReady) return;

		catalogLoading = true;
		catalogError = null;

		void loadCatalogIfNeeded()
			.catch((cause) => {
				catalogError = formatErrorMessage(cause, 'Could not load rules library');
			})
			.finally(() => {
				catalogLoading = false;
			});
	});

	function openCreateDialog() {
		editingEntry = null;
		dialogOpen = true;
	}

	function openEditDialog(entry: Spell | Weapon | Armor | Item | Condition | Species) {
		editingEntry = entry;
		dialogOpen = true;
	}

	function handleEdit(entry: RulesCatalogEntry) {
		openEditDialog(entry as Spell | Weapon | Armor | Item | Condition | Species);
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
			catalogError = formatErrorMessage(cause, 'Could not delete entry');
		} finally {
			deletingId = null;
		}
	}
</script>

<svelte:head>
	<title>Rules library · DM Deputy</title>
</svelte:head>

<header class="library-header">
	<h1>Rules library</h1>
	{#if database.catalogError}
		<p class="hint error" role="alert">Catalog failed to load: {database.catalogError}</p>
	{/if}
</header>

{#if database.isReady}
	<div class="rules-toolbar">
		<CatalogTabBar {activeTab} onTabChange={(kind) => (activeTab = kind)} />

		<LibraryAddButton label={addLabel} onclick={openCreateDialog} />
	</div>

	{#if catalogLoading && !catalogReady}
		<div class="table-wrap library-table-status" aria-busy="true">
			<LoadingState message="Loading rules library…" />
		</div>
	{:else if catalogError}
		<p class="hint error" role="alert">{catalogError}</p>
	{:else}
		<div
			id={rulesPanelId(activeTab)}
			role="tabpanel"
			aria-labelledby={rulesTabId(activeTab)}
			tabindex="0"
		>
			{#if activeTab === 'species'}
				<div class="species-stack">
					<section
						class="library-section"
						id="name-generators"
						aria-labelledby="library-name-generators-heading"
					>
						<h2 id="library-name-generators-heading">Name generators</h2>
						<div class="generators-grid">
							{#each RACE_NAME_GENERATORS as generator (generator.id)}
								<RaceNameGenerator {generator} />
							{/each}
						</div>
					</section>

					<RulesCatalogTable
						items={species}
						getId={RULES_CATALOG_CONFIGS.species.getId}
						emptyMessage={RULES_CATALOG_CONFIGS.species.emptyMessage}
						columns={RULES_CATALOG_CONFIGS.species.columns}
						onEdit={handleEdit}
						onDelete={handleDelete}
						{deletingId}
					/>
				</div>
			{:else}
				<RulesCatalogTable
					items={catalogItems}
					getId={activeConfig.getId}
					emptyMessage={activeConfig.emptyMessage}
					columns={activeConfig.columns}
					onEdit={handleEdit}
					onDelete={handleDelete}
					{deletingId}
				/>
			{/if}
		</div>
	{/if}
{/if}

<CatalogEntryDialog bind:open={dialogOpen} kind={activeTab} entry={editingEntry} />

<style>
	.library-header h1 {
		margin: 0;
	}

	.rules-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.hint.error {
		color: var(--color-danger);
	}

	.species-stack {
		display: grid;
		gap: 1.5rem;
	}

	.species-stack .library-section h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
	}

	.generators-grid {
		display: grid;
		gap: 1rem;
	}
</style>
