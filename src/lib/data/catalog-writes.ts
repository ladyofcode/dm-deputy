import {
	removeArmorFromCache,
	removeConditionFromCache,
	removeSpeciesFromCache,
	removeItemFromCache,
	removeSpellFromCache,
	removeWeaponFromCache,
	upsertArmorInCache,
	upsertConditionInCache,
	upsertSpeciesInCache,
	upsertItemInCache,
	upsertSpellInCache,
	upsertWeaponInCache,
	isCatalogCacheReady,
	setCatalogSnapshot
} from '$lib/db/catalog-cache';
import {
	deleteArmorInDb,
	deleteConditionInDb,
	deleteSpeciesInDb,
	deleteItemInDb,
	deleteSpellInDb,
	deleteWeaponInDb,
	loadCatalogSnapshot,
	upsertArmorInDb,
	upsertConditionInDb,
	upsertSpeciesInDb,
	upsertItemInDb,
	upsertSpellInDb,
	upsertWeaponInDb
} from '$lib/db/client';
import { bumpCatalogRevision } from '$lib/stores/catalog.svelte';
import type { Armor, Condition, Item, Species, Spell, Weapon } from '$lib/types/schema';

async function ensureCatalogReady(): Promise<void> {
	if (isCatalogCacheReady()) return;

	const snapshot = await loadCatalogSnapshot();
	setCatalogSnapshot(snapshot);
	bumpCatalogRevision();
}

export async function loadCatalogIfNeeded(): Promise<void> {
	await ensureCatalogReady();
}

export async function persistSpell(spell: Spell): Promise<void> {
	await ensureCatalogReady();
	await upsertSpellInDb(spell);
	upsertSpellInCache(spell);
	bumpCatalogRevision();
}

export async function removeSpell(spellId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteSpellInDb(spellId);
	removeSpellFromCache(spellId);
	bumpCatalogRevision();
}

export async function persistWeapon(weapon: Weapon): Promise<void> {
	await ensureCatalogReady();
	await upsertWeaponInDb(weapon);
	upsertWeaponInCache(weapon);
	bumpCatalogRevision();
}

export async function removeWeapon(weaponId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteWeaponInDb(weaponId);
	removeWeaponFromCache(weaponId);
	bumpCatalogRevision();
}

export async function persistArmor(armor: Armor): Promise<void> {
	await ensureCatalogReady();
	await upsertArmorInDb(armor);
	upsertArmorInCache(armor);
	bumpCatalogRevision();
}

export async function removeArmor(armorId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteArmorInDb(armorId);
	removeArmorFromCache(armorId);
	bumpCatalogRevision();
}

export async function persistItem(item: Item): Promise<void> {
	await ensureCatalogReady();
	await upsertItemInDb(item);
	upsertItemInCache(item);
	bumpCatalogRevision();
}

export async function removeItem(itemId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteItemInDb(itemId);
	removeItemFromCache(itemId);
	bumpCatalogRevision();
}

export async function persistCondition(condition: Condition): Promise<void> {
	await ensureCatalogReady();
	await upsertConditionInDb(condition);
	upsertConditionInCache(condition);
	bumpCatalogRevision();
}

export async function removeCondition(conditionId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteConditionInDb(conditionId);
	removeConditionFromCache(conditionId);
	bumpCatalogRevision();
}

export async function persistSpecies(species: Species): Promise<void> {
	await ensureCatalogReady();
	await upsertSpeciesInDb(species);
	upsertSpeciesInCache(species);
	bumpCatalogRevision();
}

export async function removeSpecies(speciesId: string): Promise<void> {
	await ensureCatalogReady();
	await deleteSpeciesInDb(speciesId);
	removeSpeciesFromCache(speciesId);
	bumpCatalogRevision();
}
