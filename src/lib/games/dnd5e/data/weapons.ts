import { getCachedWeapons, isCatalogCacheReady } from '$lib/db/catalog-cache';
import { createCatalogIdIndex } from '$lib/games/dnd5e/data/catalog-index';
import type { Weapon, WeaponCategory } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getWeaponsCatalog(): Weapon[] {
	assertCatalogReady();
	return getCachedWeapons();
}

const weaponsById = createCatalogIdIndex(getWeaponsCatalog, (entry) => entry.weapon_id);

export function getWeaponById(weaponId: string): Weapon | undefined {
	return weaponsById().get(weaponId);
}

export function getWeaponsByCategory(category: WeaponCategory): Weapon[] {
	return getWeaponsCatalog().filter((entry) => entry.weapon_category === category);
}
