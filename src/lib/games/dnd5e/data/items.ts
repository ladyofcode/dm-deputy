import { getCachedItems, isCatalogCacheReady } from '$lib/db/catalog-cache';
import { createCatalogIdIndex } from '$lib/games/dnd5e/data/catalog-index';
import type { Item, ItemCategory } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getItemsCatalog(): Item[] {
	assertCatalogReady();
	return getCachedItems();
}

const itemsById = createCatalogIdIndex(getItemsCatalog, (entry) => entry.item_id);

export function getItemById(itemId: string): Item | undefined {
	return itemsById().get(itemId);
}

export function getItemsByCategory(category: ItemCategory): Item[] {
	return getItemsCatalog().filter((entry) => entry.item_category === category);
}

export function getItemsBySubcategory(subcategory: string): Item[] {
	return getItemsCatalog().filter((entry) => entry.item_subcategory === subcategory);
}
