import { getCachedSpecies, isCatalogCacheReady } from '$lib/db/catalog-cache';
import {
	createCatalogIdIndex,
	createCatalogNameIndex
} from '$lib/games/dnd5e/data/catalog-index';
import type { Species } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getSpeciesCatalog(): Species[] {
	assertCatalogReady();
	return getCachedSpecies();
}

const speciesById = createCatalogIdIndex(getSpeciesCatalog, (entry) => entry.species_id);
const speciesByName = createCatalogNameIndex(getSpeciesCatalog, (entry) => entry.species_name);

export function getSpeciesById(speciesId: string): Species | undefined {
	return speciesById().get(speciesId);
}

export function getSpeciesByName(speciesName: string): Species | undefined {
	return speciesByName().get(speciesName.toLowerCase());
}
