import {
	ARMOR_CATEGORY_LABELS,
	formatWeaponCost,
	formatItemCost,
	ITEM_CATEGORY_LABELS,
	WEAPON_CATEGORY_LABELS
} from '$lib/domain/catalog';
import type {
	Armor,
	ArmorCategory,
	Item,
	ItemCategory,
	Weapon,
	WeaponCategory
} from '$lib/types/schema';

export const WEAPON_CATEGORY_ORDER: WeaponCategory[] = [
	'simple_melee',
	'simple_ranged',
	'martial_melee',
	'martial_ranged'
];

export const ARMOR_CATEGORY_ORDER: ArmorCategory[] = ['light', 'medium', 'heavy', 'shield'];

export const ITEM_CATEGORY_ORDER: ItemCategory[] = [
	'adventuring_gear',
	'mounts_and_other_animals',
	'tack_and_harness',
	'food_drink_and_lodging'
];

export type CatalogOptionGroup<T> = {
	label: string;
	entries: T[];
};

function formatWeight(weight: number | null | undefined): string | null {
	if (weight == null) return null;
	return `${weight} lb.`;
}

export function formatWeaponSelectLabel(weapon: Weapon): string {
	const parts = [
		`${weapon.damage_dice} ${weapon.damage_type}`,
		formatWeaponCost(weapon) !== '—' ? formatWeaponCost(weapon) : null,
		formatWeight(weapon.weight)
	].filter(Boolean);

	return parts.length ? `${weapon.weapon_name} (${parts.join(', ')})` : weapon.weapon_name;
}

export function formatArmorSelectLabel(armor: Armor): string {
	const dex =
		armor.armor_class_dexterity === 'full'
			? '+ Dex'
			: armor.armor_class_dexterity === 'max_2'
				? 'max +2 Dex'
				: armor.armor_class_dexterity === 'bonus'
					? '+2'
					: '';
	const ac = dex ? `AC ${armor.armor_class} ${dex}` : `AC ${armor.armor_class}`;
	const parts = [ac, `${armor.cost} gp`, formatWeight(armor.weight)].filter(Boolean);

	return `${armor.armor_name} (${parts.join(', ')})`;
}

export function formatItemSelectLabel(item: Item): string {
	const parts = [
		formatItemCost(item),
		formatWeight(item.weight),
		item.speed ? item.speed : null,
		item.carrying_capacity ? item.carrying_capacity : null
	].filter(Boolean);

	return parts.length ? `${item.item_name} (${parts.join(', ')})` : item.item_name;
}

export function groupWeaponsByCategory(weapons: Weapon[]): CatalogOptionGroup<Weapon>[] {
	return WEAPON_CATEGORY_ORDER.map((category) => ({
		label: WEAPON_CATEGORY_LABELS[category],
		entries: weapons
			.filter((weapon) => weapon.weapon_category === category)
			.sort((a, b) => a.weapon_name.localeCompare(b.weapon_name))
	})).filter((group) => group.entries.length > 0);
}

export function groupArmorByCategory(armor: Armor[]): CatalogOptionGroup<Armor>[] {
	return ARMOR_CATEGORY_ORDER.map((category) => ({
		label: ARMOR_CATEGORY_LABELS[category],
		entries: armor
			.filter((entry) => entry.armor_category === category)
			.sort((a, b) => a.armor_name.localeCompare(b.armor_name))
	})).filter((group) => group.entries.length > 0);
}

export function groupItemsByCategory(
	items: Item[],
	categoryFilter: ItemCategory | '' = ''
): CatalogOptionGroup<Item>[] {
	const filtered = categoryFilter
		? items.filter((item) => item.item_category === categoryFilter)
		: items;

	return ITEM_CATEGORY_ORDER.map((category) => ({
		label: ITEM_CATEGORY_LABELS[category],
		entries: filtered
			.filter((item) => item.item_category === category)
			.sort((a, b) => a.item_name.localeCompare(b.item_name))
	})).filter((group) => group.entries.length > 0);
}

export function inferItemCategoryForCatalogId(items: Item[], catalogId: string): ItemCategory | '' {
	if (!catalogId) return '';
	return items.find((item) => item.item_id === catalogId)?.item_category ?? '';
}

export function formatItemCategoryLabel(category: ItemCategory | ''): string {
	if (!category) return 'All gear categories';
	return ITEM_CATEGORY_LABELS[category];
}

export function storyCatalogTypeLabel(catalogType: 'weapon' | 'armor' | 'item'): string {
	switch (catalogType) {
		case 'weapon':
			return 'Weapon';
		case 'armor':
			return 'Armor';
		case 'item':
			return 'Gear, mounts & services';
	}
}
