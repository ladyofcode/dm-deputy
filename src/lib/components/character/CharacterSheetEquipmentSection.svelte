<script lang="ts">
	import InlineEditableCatalogSelect from '$lib/components/shared/InlineEditableCatalogSelect.svelte';
	import InlineEditableSelect from '$lib/components/shared/InlineEditableSelect.svelte';
	import LoadoutRowList from '$lib/components/character/LoadoutRowList.svelte';
	import {
		getReactiveCatalogArmor,
		getReactiveCatalogItems,
		getReactiveCatalogWeapons
	} from '$lib/stores/catalog.svelte';
	import {
		groupArmorByCategory,
		groupItemsByCategory,
		groupWeaponsByCategory,
		ITEM_CATEGORY_ORDER
	} from '$lib/domain/catalog-select';
	import { ITEM_CATEGORY_LABELS } from '$lib/domain/catalog';
	import type { CharacterExtrasDraft } from '$lib/domain/npc-draft';
	import type { ItemCategory } from '$lib/types/schema';

	type Props = {
		extras?: CharacterExtrasDraft;
	};

	let { extras = $bindable() }: Props = $props();

	let itemCategoryFilter = $state<ItemCategory | ''>('');
	let weaponRowKeys = $state<string[]>([]);
	let itemRowKeys = $state<string[]>([]);

	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());
	const items = $derived(getReactiveCatalogItems());
	const weaponGroups = $derived(groupWeaponsByCategory(weapons));
	const armorGroups = $derived(groupArmorByCategory(armor));
	const itemGroups = $derived(groupItemsByCategory(items, itemCategoryFilter));

	const itemCategoryLabel = $derived(
		itemCategoryFilter ? ITEM_CATEGORY_LABELS[itemCategoryFilter] : 'All categories'
	);

	function updateWeapons(values: string[]) {
		if (!extras) return;
		extras = {
			...extras,
			loadout: { ...extras.loadout, weapons: values }
		};
	}

	function updateItems(values: string[]) {
		if (!extras) return;
		extras = {
			...extras,
			loadout: { ...extras.loadout, items: values }
		};
	}
</script>

{#if extras}
	<section class="sheet-section">
		<h2>Equipment</h2>

		<LoadoutRowList
			field="weapons"
			heading="Weapons"
			values={extras.loadout.weapons}
			rowKeys={weaponRowKeys}
			groups={weaponGroups}
			emptyLabel="Choose weapon…"
			addLabel="Add weapon"
			removeLabel="Remove weapon"
			onValuesChange={updateWeapons}
			onRowKeysChange={(keys) => (weaponRowKeys = keys)}
		/>

		<InlineEditableCatalogSelect
			id="character_sheet_armor"
			kind="armor"
			label="Armor"
			layout="inline"
			groups={armorGroups}
			bind:value={extras.loadout.armor}
		/>

		<InlineEditableSelect
			id="character_sheet_item_category"
			label="Gear category"
			layout="inline"
			bind:value={itemCategoryFilter}
			displayValue={itemCategoryLabel}
			emptyLabel="All categories"
		>
			{#snippet options()}
				{#each ITEM_CATEGORY_ORDER as category (category)}
					<option value={category}>{ITEM_CATEGORY_LABELS[category]}</option>
				{/each}
			{/snippet}
		</InlineEditableSelect>

		<LoadoutRowList
			field="items"
			heading="Items"
			values={extras.loadout.items}
			rowKeys={itemRowKeys}
			groups={itemGroups}
			emptyLabel="Choose item…"
			addLabel="Add item"
			removeLabel="Remove item"
			onValuesChange={updateItems}
			onRowKeysChange={(keys) => (itemRowKeys = keys)}
		/>
	</section>
{/if}
