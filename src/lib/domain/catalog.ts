import type {
	Armor,
	ArmorCategory,
	ArmorClassDexterity,
	CostCurrency,
	DamageType,
	Item,
	ItemCategory,
	Spell,
	SpellSchool,
	Weapon,
	WeaponCategory
} from '$lib/types/schema';

export type CatalogKind = 'spells' | 'weapons' | 'armor' | 'items';

export const CATALOG_KIND_LABELS: Record<CatalogKind, string> = {
	spells: 'Spells',
	weapons: 'Weapons',
	armor: 'Armor',
	items: 'Items'
};

export const SPELL_SCHOOL_LABELS: Record<SpellSchool, string> = {
	abjuration: 'Abjuration',
	conjuration: 'Conjuration',
	divination: 'Divination',
	enchantment: 'Enchantment',
	evocation: 'Evocation',
	illusion: 'Illusion',
	necromancy: 'Necromancy',
	transmutation: 'Transmutation'
};

export const WEAPON_CATEGORY_LABELS: Record<WeaponCategory, string> = {
	simple_melee: 'Simple melee',
	simple_ranged: 'Simple ranged',
	martial_melee: 'Martial melee',
	martial_ranged: 'Martial ranged'
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
	bludgeoning: 'Bludgeoning',
	piercing: 'Piercing',
	slashing: 'Slashing'
};

export const ARMOR_CATEGORY_LABELS: Record<ArmorCategory, string> = {
	light: 'Light',
	medium: 'Medium',
	heavy: 'Heavy',
	shield: 'Shield'
};

export const ARMOR_DEX_LABELS: Record<ArmorClassDexterity, string> = {
	full: 'Full Dex bonus',
	max_2: 'Max +2 Dex',
	none: 'No Dex bonus',
	bonus: 'Dex bonus (shield)'
};

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
	adventuring_gear: 'Adventuring gear',
	mounts_and_other_animals: 'Mounts & animals',
	tack_and_harness: 'Tack & harness',
	food_drink_and_lodging: 'Food, drink & lodging'
};

export const COST_CURRENCY_LABELS: Record<CostCurrency, string> = {
	copper: 'cp',
	silver: 'sp',
	gold: 'gp'
};

export function createSpellDraft(partial?: Partial<Spell> | null): Spell {
	return {
		spell_id: partial?.spell_id ?? `spell-${crypto.randomUUID()}`,
		spell_name: partial?.spell_name ?? '',
		spell_level: partial?.spell_level ?? 0,
		spell_school: partial?.spell_school ?? 'evocation',
		is_ritual: partial?.is_ritual ?? false,
		casting_time: partial?.casting_time ?? '1 action',
		range: partial?.range ?? 'Self',
		components: partial?.components ?? 'V, S',
		duration: partial?.duration ?? 'Instantaneous',
		description: partial?.description ?? ''
	};
}

export function createWeaponDraft(partial?: Partial<Weapon> | null): Weapon {
	return {
		weapon_id: partial?.weapon_id ?? `wpn-${crypto.randomUUID()}`,
		weapon_name: partial?.weapon_name ?? '',
		weapon_category: partial?.weapon_category ?? 'simple_melee',
		cost: partial?.cost ?? null,
		cost_currency: partial?.cost_currency ?? 'gold',
		damage_dice: partial?.damage_dice ?? '1d6',
		damage_type: partial?.damage_type ?? 'slashing',
		weight: partial?.weight ?? null,
		properties: partial?.properties ?? null
	};
}

export function createArmorDraft(partial?: Partial<Armor> | null): Armor {
	return {
		armor_id: partial?.armor_id ?? `arm-${crypto.randomUUID()}`,
		armor_name: partial?.armor_name ?? '',
		armor_category: partial?.armor_category ?? 'light',
		armor_class: partial?.armor_class ?? 11,
		armor_class_dexterity: partial?.armor_class_dexterity ?? 'full',
		cost: partial?.cost ?? 0,
		weight: partial?.weight ?? 0,
		body_location: partial?.body_location ?? 'Body'
	};
}

export function createItemDraft(partial?: Partial<Item> | null): Item {
	return {
		item_id: partial?.item_id ?? `itm-${crypto.randomUUID()}`,
		item_name: partial?.item_name ?? '',
		item_category: partial?.item_category ?? 'adventuring_gear',
		item_subcategory: partial?.item_subcategory ?? null,
		cost: partial?.cost ?? 0,
		cost_currency: partial?.cost_currency ?? 'gold',
		weight: partial?.weight ?? null,
		speed: partial?.speed ?? null,
		carrying_capacity: partial?.carrying_capacity ?? null
	};
}

export function formatWeaponCost(weapon: Weapon): string {
	if (weapon.cost == null) return '—';
	const currency = weapon.cost_currency ? COST_CURRENCY_LABELS[weapon.cost_currency] : '';
	return `${weapon.cost} ${currency}`.trim();
}

export function formatItemCost(item: Item): string {
	return `${item.cost} ${COST_CURRENCY_LABELS[item.cost_currency]}`;
}
