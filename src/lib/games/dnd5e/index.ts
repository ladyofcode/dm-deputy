import type { Dnd5eRuleset } from '$lib/games/types';
import { getArmorByCategory, getArmorById, getArmorCatalog } from './data/armor';
import {
	getItemById,
	getItemsByCategory,
	getItemsBySubcategory,
	getItemsCatalog
} from './data/items';
import {
	getCantrips,
	getRitualSpells,
	getSpellById,
	getSpellByName,
	getSpellsByLevel,
	getSpellsBySchool,
	getSpellsCatalog
} from './data/spells';
import { getWeaponById, getWeaponsByCategory, getWeaponsCatalog } from './data/weapons';
import { characterLevels, getLevelForExperience } from './rules/character-levels';
import { abilityModifier, proficiencyBonus } from './rules/formulae';

export const dnd5eRuleset: Dnd5eRuleset = {
	id: 'dnd5e',
	abilityModifier,
	proficiencyBonus,
	characterLevels,
	getLevelForExperience,
	getArmorCatalog,
	getArmorById,
	getArmorByCategory,
	getWeaponsCatalog,
	getWeaponById,
	getWeaponsByCategory,
	getItemsCatalog,
	getItemById,
	getItemsByCategory,
	getItemsBySubcategory,
	getSpellsCatalog,
	getSpellById,
	getSpellByName,
	getSpellsByLevel,
	getSpellsBySchool,
	getCantrips,
	getRitualSpells
};

export {
	abilityModifier,
	proficiencyBonus,
	characterLevels,
	getLevelForExperience,
	getArmorCatalog,
	getArmorById,
	getArmorByCategory,
	getWeaponsCatalog,
	getWeaponById,
	getWeaponsByCategory,
	getItemsCatalog,
	getItemById,
	getItemsByCategory,
	getItemsBySubcategory,
	getSpellsCatalog,
	getSpellById,
	getSpellByName,
	getSpellsByLevel,
	getSpellsBySchool,
	getCantrips,
	getRitualSpells
};
