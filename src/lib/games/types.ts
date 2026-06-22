import type {
	Armor,
	ArmorCategory,
	Item,
	ItemCategory,
	Spell,
	SpellSchool,
	Weapon,
	WeaponCategory
} from '$lib/types/schema';

export type GameSchema = 'dnd5e';

export type CharacterLevel = {
	level: number;
	experience_points: number;
};

export type Dnd5eRuleset = {
	id: 'dnd5e';
	abilityModifier: (score: number) => number;
	proficiencyBonus: (level: number) => number;
	characterLevels: CharacterLevel[];
	getLevelForExperience: (experiencePoints: number) => number;
	getArmorCatalog: () => Armor[];
	getArmorById: (armorId: string) => Armor | undefined;
	getArmorByCategory: (category: ArmorCategory) => Armor[];
	getWeaponsCatalog: () => Weapon[];
	getWeaponById: (weaponId: string) => Weapon | undefined;
	getWeaponsByCategory: (category: WeaponCategory) => Weapon[];
	getItemsCatalog: () => Item[];
	getItemById: (itemId: string) => Item | undefined;
	getItemsByCategory: (category: ItemCategory) => Item[];
	getItemsBySubcategory: (subcategory: string) => Item[];
	getSpellsCatalog: () => Spell[];
	getSpellById: (spellId: string) => Spell | undefined;
	getSpellByName: (spellName: string) => Spell | undefined;
	getSpellsByLevel: (spellLevel: number) => Spell[];
	getSpellsBySchool: (school: SpellSchool) => Spell[];
	getCantrips: () => Spell[];
	getRitualSpells: () => Spell[];
};

export type Ruleset = Dnd5eRuleset;

export function isGameSchema(value: string): value is GameSchema {
	return value === 'dnd5e';
}
