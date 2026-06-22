import {
	getCachedArmor,
	getCachedItems,
	getCachedSpells,
	getCachedWeapons,
	isCatalogCacheReady
} from '$lib/db/catalog-cache';
import type { Armor, Item, Spell, Weapon } from '$lib/types/schema';

class CatalogState {
	revision = $state(0);

	bump(): void {
		this.revision += 1;
	}

	spells(): Spell[] {
		void this.revision;
		return isCatalogCacheReady() ? getCachedSpells() : [];
	}

	weapons(): Weapon[] {
		void this.revision;
		return isCatalogCacheReady() ? getCachedWeapons() : [];
	}

	armor(): Armor[] {
		void this.revision;
		return isCatalogCacheReady() ? getCachedArmor() : [];
	}

	items(): Item[] {
		void this.revision;
		return isCatalogCacheReady() ? getCachedItems() : [];
	}
}

export const catalogState = new CatalogState();

export function bumpCatalogRevision(): void {
	catalogState.bump();
}

export function getReactiveCatalogSpells(): Spell[] {
	return catalogState.spells();
}

export function getReactiveCatalogWeapons(): Weapon[] {
	return catalogState.weapons();
}

export function getReactiveCatalogArmor(): Armor[] {
	return catalogState.armor();
}

export function getReactiveCatalogItems(): Item[] {
	return catalogState.items();
}
