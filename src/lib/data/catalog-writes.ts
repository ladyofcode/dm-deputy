import {
	removeArmorFromCache,
	removeItemFromCache,
	removeSpellFromCache,
	removeWeaponFromCache,
	upsertArmorInCache,
	upsertItemInCache,
	upsertSpellInCache,
	upsertWeaponInCache,
	isCatalogCacheReady,
	setCatalogSnapshot
} from '$lib/db/catalog-cache';
import {
	deleteArmorInDb,
	deleteItemInDb,
	deleteSpellInDb,
	deleteWeaponInDb,
	loadCatalogSnapshot,
	upsertArmorInDb,
	upsertItemInDb,
	upsertSpellInDb,
	upsertWeaponInDb
} from '$lib/db/client';
import { bumpCatalogRevision } from '$lib/stores/catalog.svelte';
import type { Armor, Item, Spell, Weapon } from '$lib/types/schema';

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
