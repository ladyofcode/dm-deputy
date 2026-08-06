import {
	getCachedArmor,
	getCachedConditions,
	getCachedItems,
	getCachedSpecies,
	getCachedSpells,
	getCachedWeapons,
	isCatalogCacheReady
} from '$lib/db/catalog-cache';
import type { Armor, Condition, Item, Species, Spell, Weapon } from '$lib/types/schema';
import { createRevisionSignal } from '$lib/stores/revision.svelte';

class CatalogState {
	#revision = createRevisionSignal();

	bump(): void {
		this.#revision.bump();
	}

	spells(): Spell[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedSpells() : [];
	}

	weapons(): Weapon[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedWeapons() : [];
	}

	armor(): Armor[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedArmor() : [];
	}

	items(): Item[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedItems() : [];
	}

	conditions(): Condition[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedConditions() : [];
	}

	species(): Species[] {
		void this.#revision.track();
		return isCatalogCacheReady() ? getCachedSpecies() : [];
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

export function getReactiveCatalogConditions(): Condition[] {
	return catalogState.conditions();
}

export function getReactiveCatalogSpecies(): Species[] {
	return catalogState.species();
}
