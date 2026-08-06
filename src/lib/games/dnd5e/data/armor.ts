import { getCachedArmor, isCatalogCacheReady } from '$lib/db/catalog-cache';
import { createCatalogIdIndex } from '$lib/games/dnd5e/data/catalog-index';
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

const armorById = createCatalogIdIndex(getArmorCatalog, (entry) => entry.armor_id);

export function getArmorById(armorId: string): Armor | undefined {
	return armorById().get(armorId);
}

export function getArmorByCategory(category: ArmorCategory): Armor[] {
	return getArmorCatalog().filter((entry) => entry.armor_category === category);
}
