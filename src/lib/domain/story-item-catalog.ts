import type { Armor, Item, StoryItem, Weapon } from '$lib/types/schema';
import {
	getCachedArmor,
	getCachedItems,
	getCachedWeapons,
	isCatalogCacheReady
} from '$lib/db/catalog-cache';

function catalogMaps() {
	return {
		weapons: new Map(getCachedWeapons().map((entry) => [entry.weapon_id, entry])),
		armor: new Map(getCachedArmor().map((entry) => [entry.armor_id, entry])),
		items: new Map(getCachedItems().map((entry) => [entry.item_id, entry]))
	};
}

function formatCategory(value: string): string {
	return value.replace(/_/g, ' ');
}

function formatCost(
	amount: number | null | undefined,
	currency: string | null | undefined
): string | null {
	if (amount == null || amount <= 0) return null;
	const unit = currency === 'silver' ? 'sp' : currency === 'copper' ? 'cp' : 'gp';
	return `${amount} ${unit}`;
}

function formatWeight(weight: number | null | undefined): string | null {
	if (weight == null) return null;
	return `${weight} lb`;
}

function formatDexLimit(limit: Armor['armor_class_dexterity']): string {
	switch (limit) {
		case 'full':
			return '+ Dex';
		case 'max_2':
			return 'max +2 Dex';
		case 'bonus':
			return '+ Dex bonus';
		default:
			return '';
	}
}

export function getCatalogEntryForStoryItem(
	item: Pick<StoryItem, 'catalog_type' | 'catalog_id'>
): Weapon | Armor | Item | null {
	if (!isCatalogCacheReady() || !item.catalog_type || !item.catalog_id) return null;

	const maps = catalogMaps();

	switch (item.catalog_type) {
		case 'weapon':
			return maps.weapons.get(item.catalog_id) ?? null;
		case 'armor':
			return maps.armor.get(item.catalog_id) ?? null;
		case 'item':
			return maps.items.get(item.catalog_id) ?? null;
		default:
			return null;
	}
}

export function formatStoryItemCatalogStats(item: StoryItem): string[] {
	if (item.kind !== 'item' || !item.catalog_type) return [];

	const entry = getCatalogEntryForStoryItem(item);
	if (!entry) return [];

	if (item.catalog_type === 'weapon') {
		const weapon = entry as Weapon;
		return [
			formatCategory(weapon.weapon_category),
			`${weapon.damage_dice} ${weapon.damage_type}`,
			formatCost(weapon.cost, weapon.cost_currency),
			formatWeight(weapon.weight),
			weapon.properties
		].filter((line): line is string => Boolean(line));
	}

	if (item.catalog_type === 'armor') {
		const armor = entry as Armor;
		const dex = formatDexLimit(armor.armor_class_dexterity);
		return [
			formatCategory(armor.armor_category),
			`AC ${armor.armor_class}${dex ? ` (${dex})` : ''}`,
			armor.body_location,
			formatCost(armor.cost, 'gold'),
			formatWeight(armor.weight)
		].filter((line): line is string => Boolean(line));
	}

	const gear = entry as Item;
	return [
		formatCategory(gear.item_category),
		gear.item_subcategory,
		formatCost(gear.cost, gear.cost_currency),
		formatWeight(gear.weight),
		gear.speed ? `Speed ${gear.speed}` : null,
		gear.carrying_capacity ? `Capacity ${gear.carrying_capacity}` : null
	].filter((line): line is string => Boolean(line));
}
