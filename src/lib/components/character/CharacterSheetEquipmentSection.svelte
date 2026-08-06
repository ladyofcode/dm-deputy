<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import CatalogSelect from '$lib/components/shared/CatalogSelect.svelte';
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
	import type { NpcExtrasDraft } from '$lib/domain/npc-draft';
	import type { ItemCategory } from '$lib/types/schema';

	type Props = {
		extras?: NpcExtrasDraft;
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

	function syncLoadoutRowKeys(field: 'weapons' | 'items', rowCount: number): string[] {
		const keys = field === 'weapons' ? weaponRowKeys : itemRowKeys;
		const next = keys.slice(0, rowCount);

		while (next.length < rowCount) {
			next.push(`${field}-row-${crypto.randomUUID()}`);
		}

		if (field === 'weapons') {
			weaponRowKeys = next;
		} else {
			itemRowKeys = next;
		}

		return next;
	}

	function addLoadoutRow(field: 'weapons' | 'items' | 'spells') {
		if (!extras) return;

		if (field === 'weapons') {
			weaponRowKeys = [...weaponRowKeys, `weapon-row-${crypto.randomUUID()}`];
		} else if (field === 'items') {
			itemRowKeys = [...itemRowKeys, `item-row-${crypto.randomUUID()}`];
		}

		extras = {
			...extras,
			loadout: {
				...extras.loadout,
				[field]: [...extras.loadout[field], '']
			}
		};
	}

	function removeLoadoutRow(field: 'weapons' | 'items' | 'spells', index: number) {
		if (!extras) return;

		if (field === 'weapons') {
			weaponRowKeys = weaponRowKeys.filter((_, rowIndex) => rowIndex !== index);
		} else if (field === 'items') {
			itemRowKeys = itemRowKeys.filter((_, rowIndex) => rowIndex !== index);
		}

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
		if (!extras) return;

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

	$effect(() => {
		if (!extras) return;
		syncLoadoutRowKeys('weapons', extras.loadout.weapons.length);
		syncLoadoutRowKeys('items', extras.loadout.items.length);
	});
</script>

{#if extras}
	<section class="sheet-section">
		<h2>Equipment</h2>

		<div class="field">
			<Label.Root>Weapons</Label.Root>
			<ul class="loadout-lines list-plain">
				{#each extras.loadout.weapons as weaponId, index (weaponRowKeys[index] ?? index)}
					<li class="loadout-line">
						<CatalogSelect
							kind="weapon"
							groups={weaponGroups}
							value={weaponId}
							aria-label="Weapon"
							onchange={(event) => updateLoadoutRow('weapons', index, event.currentTarget.value)}
						/>
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
			<CatalogSelect
				id="character_sheet_armor"
				kind="armor"
				groups={armorGroups}
				bind:value={extras.loadout.armor}
			/>
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
				{#each extras.loadout.items as itemId, index (itemRowKeys[index] ?? index)}
					<li class="loadout-line">
						<CatalogSelect
							kind="item"
							groups={itemGroups}
							value={itemId}
							aria-label="Item"
							onchange={(event) => updateLoadoutRow('items', index, event.currentTarget.value)}
						/>
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
{/if}

<style>
	.field-inline {
		display: grid;
		gap: var(--space-field);
		grid-template-columns: minmax(0, 1fr);
	}

	.field-inline :global(label) {
		margin: 0;
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

	.loadout-line :global(.catalog-select) {
		flex: 1;
		min-width: 0;
	}

	@media (min-width: 40rem) {
		.field-inline {
			grid-template-columns: 6.75rem minmax(0, 1fr);
			align-items: center;
		}
	}
</style>
