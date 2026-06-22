import { getCachedArmor, isCatalogCacheReady } from '$lib/db/catalog-cache';
import type { Armor, ArmorCategory } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getArmorCatalog(): Armor[] {
	assertCatalogReady();
	return getCachedArmor();
}

export function getArmorById(armorId: string): Armor | undefined {
	return getArmorCatalog().find((entry) => entry.armor_id === armorId);
}

export function getArmorByCategory(category: ArmorCategory): Armor[] {
	return getArmorCatalog().filter((entry) => entry.armor_category === category);
}
