import { getCachedSpecies, isCatalogCacheReady } from '$lib/db/catalog-cache';
import { createCatalogIdIndex, createCatalogNameIndex } from '$lib/games/dnd5e/data/catalog-index';
import { DEFAULT_SPECIES, mergeSpeciesWithDefaults } from '$lib/games/dnd5e/data/default-species';
import type { Species } from '$lib/types/schema';

function getSpeciesCatalogOrEmpty(): Species[] {
	if (!isCatalogCacheReady()) {
		return DEFAULT_SPECIES;
	}

	return mergeSpeciesWithDefaults(getCachedSpecies());
}

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getSpeciesCatalog(): Species[] {
	assertCatalogReady();
	return mergeSpeciesWithDefaults(getCachedSpecies());
}

const speciesById = createCatalogIdIndex(getSpeciesCatalogOrEmpty, (entry) => entry.species_id);
const speciesByName = createCatalogNameIndex(
	getSpeciesCatalogOrEmpty,
	(entry) => entry.species_name
);

export function getSpeciesById(speciesId: string): Species | undefined {
	if (!speciesId) return undefined;
	return speciesById().get(speciesId);
}

export function getSpeciesByName(speciesName: string): Species | undefined {
	if (!speciesName.trim()) return undefined;
	return speciesByName().get(speciesName.trim().toLowerCase());
}

export function listSelectableSpecies(): Species[] {
	return [...getSpeciesCatalogOrEmpty()].sort((left, right) =>
		left.species_name.localeCompare(right.species_name, undefined, { sensitivity: 'base' })
	);
}
