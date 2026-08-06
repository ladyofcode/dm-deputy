import type { Armor, Condition, Item, Skill, Species, Spell, Weapon } from '$lib/types/schema';

export type CatalogSnapshot = {
	spells: Spell[];
	weapons: Weapon[];
	armor: Armor[];
	items: Item[];
	conditions: Condition[];
	skills: Skill[];
	species: Species[];
};

let catalogSnapshot: CatalogSnapshot | null = null;

export function isCatalogCacheReady(): boolean {
	return catalogSnapshot !== null;
}

export function setCatalogSnapshot(snapshot: CatalogSnapshot): void {
	catalogSnapshot = snapshot;
}

export function clearCatalogCache(): void {
	catalogSnapshot = null;
}

export function getCachedSpells(): Spell[] {
	return catalogSnapshot?.spells ?? [];
}

export function getCachedWeapons(): Weapon[] {
	return catalogSnapshot?.weapons ?? [];
}

export function getCachedArmor(): Armor[] {
	return catalogSnapshot?.armor ?? [];
}

export function getCachedItems(): Item[] {
	return catalogSnapshot?.items ?? [];
}

export function getCachedConditions(): Condition[] {
	return catalogSnapshot?.conditions ?? [];
}

export function getCachedSkills(): Skill[] {
	return catalogSnapshot?.skills ?? [];
}

export function getCachedSpecies(): Species[] {
	return catalogSnapshot?.species ?? [];
}

function compareSpells(a: Spell, b: Spell): number {
	return a.spell_level - b.spell_level || a.spell_name.localeCompare(b.spell_name);
}

function compareNames(a: string, b: string): number {
	return a.localeCompare(b);
}

export function upsertSpellInCache(spell: Spell): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.spells.findIndex((entry) => entry.spell_id === spell.spell_id);
	if (index >= 0) {
		catalogSnapshot.spells[index] = spell;
	} else {
		catalogSnapshot.spells.push(spell);
	}

	catalogSnapshot.spells.sort(compareSpells);
}

export function removeSpellFromCache(spellId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.spells = catalogSnapshot.spells.filter((entry) => entry.spell_id !== spellId);
}

export function upsertWeaponInCache(weapon: Weapon): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.weapons.findIndex((entry) => entry.weapon_id === weapon.weapon_id);
	if (index >= 0) {
		catalogSnapshot.weapons[index] = weapon;
	} else {
		catalogSnapshot.weapons.push(weapon);
	}

	catalogSnapshot.weapons.sort((a, b) => compareNames(a.weapon_name, b.weapon_name));
}

export function removeWeaponFromCache(weaponId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.weapons = catalogSnapshot.weapons.filter((entry) => entry.weapon_id !== weaponId);
}

export function upsertArmorInCache(armor: Armor): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.armor.findIndex((entry) => entry.armor_id === armor.armor_id);
	if (index >= 0) {
		catalogSnapshot.armor[index] = armor;
	} else {
		catalogSnapshot.armor.push(armor);
	}

	catalogSnapshot.armor.sort((a, b) => compareNames(a.armor_name, b.armor_name));
}

export function removeArmorFromCache(armorId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.armor = catalogSnapshot.armor.filter((entry) => entry.armor_id !== armorId);
}

export function upsertItemInCache(item: Item): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.items.findIndex((entry) => entry.item_id === item.item_id);
	if (index >= 0) {
		catalogSnapshot.items[index] = item;
	} else {
		catalogSnapshot.items.push(item);
	}

	catalogSnapshot.items.sort((a, b) => compareNames(a.item_name, b.item_name));
}

export function removeItemFromCache(itemId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.items = catalogSnapshot.items.filter((entry) => entry.item_id !== itemId);
}

export function upsertConditionInCache(condition: Condition): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.conditions.findIndex(
		(entry) => entry.condition_id === condition.condition_id
	);
	if (index >= 0) {
		catalogSnapshot.conditions[index] = condition;
	} else {
		catalogSnapshot.conditions.push(condition);
	}

	catalogSnapshot.conditions.sort((a, b) => compareNames(a.condition_name, b.condition_name));
}

export function removeConditionFromCache(conditionId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.conditions = catalogSnapshot.conditions.filter(
		(entry) => entry.condition_id !== conditionId
	);
}

export function upsertSpeciesInCache(species: Species): void {
	if (!catalogSnapshot) return;

	const index = catalogSnapshot.species.findIndex((entry) => entry.species_id === species.species_id);
	if (index >= 0) {
		catalogSnapshot.species[index] = species;
	} else {
		catalogSnapshot.species.push(species);
	}

	catalogSnapshot.species.sort((a, b) => compareNames(a.species_name, b.species_name));
}

export function removeSpeciesFromCache(speciesId: string): void {
	if (!catalogSnapshot) return;
	catalogSnapshot.species = catalogSnapshot.species.filter(
		(entry) => entry.species_id !== speciesId
	);
}
