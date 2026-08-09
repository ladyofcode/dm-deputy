<script lang="ts">
	import {
		formatArmorSelectLabel,
		formatItemSelectLabel,
		formatWeaponSelectLabel,
		groupArmorByCategory,
		groupItemsByCategory,
		groupWeaponsByCategory,
		type CatalogOptionGroup
	} from '$lib/domain/catalog-select';
	import type { Armor, Item, ItemCategory, Weapon } from '$lib/types/schema';

	type CatalogKind = 'weapon' | 'armor' | 'item';

	type Props = {
		kind: CatalogKind;
		value?: string;
		onchange?: (event: Event & { currentTarget: HTMLSelectElement }) => void;
		groups?: CatalogOptionGroup<Weapon | Armor | Item>[];
		weapons?: Weapon[];
		armor?: Armor[];
		items?: Item[];
		itemCategoryFilter?: ItemCategory | '';
		emptyLabel?: string;
		id?: string;
		class?: string;
		disabled?: boolean;
		'aria-label'?: string;
		onkeydown?: (event: KeyboardEvent) => void;
		onblur?: (event: FocusEvent) => void;
	};

	let {
		kind,
		value = $bindable(''),
		onchange,
		groups,
		weapons = [],
		armor = [],
		items = [],
		itemCategoryFilter = '',
		emptyLabel = 'None',
		id,
		class: className = '',
		disabled = false,
		'aria-label': ariaLabel,
		onkeydown,
		onblur
	}: Props = $props();

	const resolvedGroups = $derived.by(() => {
		if (groups) return groups;

		switch (kind) {
			case 'weapon':
				return groupWeaponsByCategory(weapons);
			case 'armor':
				return groupArmorByCategory(armor);
			case 'item':
				return groupItemsByCategory(items, itemCategoryFilter);
		}
	});

	function entryId(entry: Weapon | Armor | Item): string {
		switch (kind) {
			case 'weapon':
				return (entry as Weapon).weapon_id;
			case 'armor':
				return (entry as Armor).armor_id;
			case 'item':
				return (entry as Item).item_id;
		}
	}

	function entryLabel(entry: Weapon | Armor | Item): string {
		switch (kind) {
			case 'weapon':
				return formatWeaponSelectLabel(entry as Weapon);
			case 'armor':
				return formatArmorSelectLabel(entry as Armor);
			case 'item':
				return formatItemSelectLabel(entry as Item);
		}
	}
</script>

<select
	{id}
	class={['catalog-select', className].filter(Boolean).join(' ')}
	bind:value
	{disabled}
	aria-label={ariaLabel}
	{onchange}
	{onkeydown}
	{onblur}
>
	<option value="">{emptyLabel}</option>
	{#each resolvedGroups as group (group.label)}
		<optgroup label={group.label}>
			{#each group.entries as entry (entryId(entry))}
				<option value={entryId(entry)}>{entryLabel(entry)}</option>
			{/each}
		</optgroup>
	{/each}
</select>
