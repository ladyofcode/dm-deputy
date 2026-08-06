import { getCachedSpecies, isCatalogCacheReady } from '$lib/db/catalog-cache';
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

export function getSpeciesById(speciesId: string): Species | undefined {
	return getSpeciesCatalog().find((entry) => entry.species_id === speciesId);
}

export function getSpeciesByName(speciesName: string): Species | undefined {
	return getSpeciesCatalog().find(
		(entry) => entry.species_name.toLowerCase() === speciesName.toLowerCase()
	);
}
