import {
	ARMOR_CATEGORY_LABELS,
	formatItemCost,
	formatSpeciesTraitNames,
	formatWeaponCost,
	previewDescription,
	SPELL_SCHOOL_LABELS,
	type CatalogKind
} from '$lib/domain/catalog';
import type { Armor, Condition, Item, Species, Spell, Weapon } from '$lib/types/schema';

export type RulesCatalogEntry = Spell | Weapon | Armor | Item | Condition | Species;

export type RulesCatalogColumn = {
	header: string;
	cellClass?: string;
	render: (item: RulesCatalogEntry) => string;
};

export type RulesCatalogConfig = {
	kind: CatalogKind;
	getId: (item: RulesCatalogEntry) => string;
	emptyMessage: string;
	columns: RulesCatalogColumn[];
};

export function rulesTabId(kind: CatalogKind): string {
	return `rules-tab-${kind}`;
}

export function rulesPanelId(kind: CatalogKind): string {
	return `rules-panel-${kind}`;
}

export const RULES_CATALOG_CONFIGS: Record<CatalogKind, RulesCatalogConfig> = {
	spells: {
		kind: 'spells',
		getId: (item) => (item as Spell).spell_id,
		emptyMessage: 'No spells yet. Add your first homebrew spell.',
		columns: [
			{ header: 'Name', cellClass: 'name-cell', render: (item) => (item as Spell).spell_name },
			{ header: 'Level', render: (item) => String((item as Spell).spell_level) },
			{
				header: 'School',
				render: (item) => SPELL_SCHOOL_LABELS[(item as Spell).spell_school]
			},
			{ header: 'Casting time', render: (item) => (item as Spell).casting_time }
		]
	},
	weapons: {
		kind: 'weapons',
		getId: (item) => (item as Weapon).weapon_id,
		emptyMessage: 'No weapons yet.',
		columns: [
			{ header: 'Name', cellClass: 'name-cell', render: (item) => (item as Weapon).weapon_name },
			{ header: 'Damage', render: (item) => (item as Weapon).damage_dice },
			{ header: 'Type', render: (item) => (item as Weapon).damage_type },
			{ header: 'Cost', render: (item) => formatWeaponCost(item as Weapon) }
		]
	},
	armor: {
		kind: 'armor',
		getId: (item) => (item as Armor).armor_id,
		emptyMessage: 'No armor yet.',
		columns: [
			{ header: 'Name', cellClass: 'name-cell', render: (item) => (item as Armor).armor_name },
			{
				header: 'Category',
				render: (item) => ARMOR_CATEGORY_LABELS[(item as Armor).armor_category]
			},
			{ header: 'AC', render: (item) => String((item as Armor).armor_class) },
			{ header: 'Cost', render: (item) => `${(item as Armor).cost} gp` }
		]
	},
	items: {
		kind: 'items',
		getId: (item) => (item as Item).item_id,
		emptyMessage: 'No items yet.',
		columns: [
			{ header: 'Name', cellClass: 'name-cell', render: (item) => (item as Item).item_name },
			{
				header: 'Category',
				render: (item) => (item as Item).item_subcategory ?? (item as Item).item_category
			},
			{ header: 'Cost', render: (item) => formatItemCost(item as Item) }
		]
	},
	conditions: {
		kind: 'conditions',
		getId: (item) => (item as Condition).condition_id,
		emptyMessage: 'No conditions yet.',
		columns: [
			{
				header: 'Name',
				cellClass: 'name-cell',
				render: (item) => (item as Condition).condition_name
			},
			{
				header: 'Effects',
				cellClass: 'description-cell',
				render: (item) => previewDescription((item as Condition).description)
			}
		]
	},
	species: {
		kind: 'species',
		getId: (item) => (item as Species).species_id,
		emptyMessage: 'No species yet.',
		columns: [
			{ header: 'Name', cellClass: 'name-cell', render: (item) => (item as Species).species_name },
			{ header: 'Size', render: (item) => (item as Species).size },
			{ header: 'Speed', render: (item) => String((item as Species).speed) },
			{
				header: 'Traits',
				cellClass: 'description-cell',
				render: (item) => formatSpeciesTraitNames(item as Species)
			}
		]
	}
};

export function rulesCatalogItems(
	kind: CatalogKind,
	catalog: {
		spells: Spell[];
		weapons: Weapon[];
		armor: Armor[];
		items: Item[];
		conditions: Condition[];
		species: Species[];
	}
): RulesCatalogEntry[] {
	switch (kind) {
		case 'spells':
			return catalog.spells;
		case 'weapons':
			return catalog.weapons;
		case 'armor':
			return catalog.armor;
		case 'items':
			return catalog.items;
		case 'conditions':
			return catalog.conditions;
		case 'species':
			return catalog.species;
	}
}
