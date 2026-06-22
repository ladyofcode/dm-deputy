import { getCachedWeapons, isCatalogCacheReady } from '$lib/db/catalog-cache';
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

export function getWeaponById(weaponId: string): Weapon | undefined {
	return getWeaponsCatalog().find((entry) => entry.weapon_id === weaponId);
}

export function getWeaponsByCategory(category: WeaponCategory): Weapon[] {
	return getWeaponsCatalog().filter((entry) => entry.weapon_category === category);
}
