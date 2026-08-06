import { getCachedSpells, isCatalogCacheReady } from '$lib/db/catalog-cache';
import {
	createCatalogIdIndex,
	createCatalogNameIndex
} from '$lib/games/dnd5e/data/catalog-index';
import type { Spell, SpellSchool } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export function getSpellsCatalog(): Spell[] {
	assertCatalogReady();
	return getCachedSpells();
}

const spellsById = createCatalogIdIndex(getSpellsCatalog, (entry) => entry.spell_id);
const spellsByName = createCatalogNameIndex(getSpellsCatalog, (entry) => entry.spell_name);

export function getSpellById(spellId: string): Spell | undefined {
	return spellsById().get(spellId);
}

export function getSpellByName(spellName: string): Spell | undefined {
	return spellsByName().get(spellName.toLowerCase());
}

export function getSpellsByLevel(spellLevel: number): Spell[] {
	return getSpellsCatalog().filter((entry) => entry.spell_level === spellLevel);
}

export function getSpellsBySchool(school: SpellSchool): Spell[] {
	return getSpellsCatalog().filter((entry) => entry.spell_school === school);
}

export function getCantrips(): Spell[] {
	return getSpellsByLevel(0);
}

export function getRitualSpells(): Spell[] {
	return getSpellsCatalog().filter((entry) => entry.is_ritual);
}
