import { execSql, selectObjects } from '../bind';
import { withTransaction } from '../sql';
import type { CatalogSnapshot } from '../types';
import type {
	Armor,
	Condition,
	Item,
	Species,
	SpeciesTrait,
	SpeciesTraitEffect,
	Spell,
	Weapon
} from '$lib/types/schema';
import type { AppDb, MemoryDb } from './context';

type CatalogUpsertConfig = {
	table: string;
	idColumn: string;
	columns: readonly string[];
};

function deleteCatalogEntry(database: AppDb, table: string, idColumn: string, id: string): void {
	execSql(database, {
		sql: `DELETE FROM ${table} WHERE ${idColumn} = $id`,
		bind: { id }
	});
}

function upsertCatalogEntry(
	database: AppDb,
	config: CatalogUpsertConfig,
	bind: Record<string, unknown>
): void {
	const { table, idColumn, columns } = config;
	const columnList = columns.join(', ');
	const placeholders = columns.map((column) => `$${column}`).join(', ');
	const updates = columns
		.filter((column) => column !== idColumn)
		.map((column) => `${column} = excluded.${column}`)
		.join(',\n\t\t\t');

	execSql(database, {
		sql: `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})
		ON CONFLICT(${idColumn}) DO UPDATE SET ${updates}`,
		bind
	});
}

const SPELL_CONFIG: CatalogUpsertConfig = {
	table: 'spells',
	idColumn: 'spell_id',
	columns: [
		'spell_id',
		'spell_name',
		'spell_level',
		'spell_school',
		'is_ritual',
		'casting_time',
		'range',
		'components',
		'duration',
		'description'
	]
};

const WEAPON_CONFIG: CatalogUpsertConfig = {
	table: 'weapons',
	idColumn: 'weapon_id',
	columns: [
		'weapon_id',
		'weapon_name',
		'weapon_category',
		'cost',
		'cost_currency',
		'damage_dice',
		'damage_type',
		'weight',
		'properties'
	]
};

const ARMOR_CONFIG: CatalogUpsertConfig = {
	table: 'armor',
	idColumn: 'armor_id',
	columns: [
		'armor_id',
		'armor_name',
		'armor_category',
		'armor_class',
		'armor_class_dexterity',
		'cost',
		'weight',
		'body_location'
	]
};

const ITEM_CONFIG: CatalogUpsertConfig = {
	table: 'items',
	idColumn: 'item_id',
	columns: [
		'item_id',
		'item_name',
		'item_category',
		'item_subcategory',
		'cost',
		'cost_currency',
		'weight',
		'speed',
		'carrying_capacity'
	]
};

const CONDITION_CONFIG: CatalogUpsertConfig = {
	table: 'conditions',
	idColumn: 'condition_id',
	columns: ['condition_id', 'condition_name', 'description']
};

export function loadCatalogSnapshot(database: AppDb | MemoryDb): CatalogSnapshot {
	const spells = selectObjects<{
		spell_id: string;
		spell_name: string;
		spell_level: number;
		spell_school: Spell['spell_school'];
		is_ritual: number;
		casting_time: string;
		range: string;
		components: string;
		duration: string;
		description: string;
	}>(database, 'SELECT * FROM spells ORDER BY spell_level, spell_name').map((row) => ({
		spell_id: row.spell_id,
		spell_name: row.spell_name,
		spell_level: row.spell_level,
		spell_school: row.spell_school,
		is_ritual: Boolean(row.is_ritual),
		casting_time: row.casting_time,
		range: row.range,
		components: row.components,
		duration: row.duration,
		description: row.description
	}));

	const weapons = selectObjects<{
		weapon_id: string;
		weapon_name: string;
		weapon_category: Weapon['weapon_category'];
		cost: number | null;
		cost_currency: Weapon['cost_currency'];
		damage_dice: string;
		damage_type: Weapon['damage_type'];
		weight: number | null;
		properties: string | null;
	}>(database, 'SELECT * FROM weapons ORDER BY weapon_name').map((row) => ({
		weapon_id: row.weapon_id,
		weapon_name: row.weapon_name,
		weapon_category: row.weapon_category,
		cost: row.cost,
		cost_currency: row.cost_currency,
		damage_dice: row.damage_dice,
		damage_type: row.damage_type,
		weight: row.weight,
		properties: row.properties
	}));

	const armor = selectObjects<{
		armor_id: string;
		armor_name: string;
		armor_category: Armor['armor_category'];
		armor_class: number;
		armor_class_dexterity: Armor['armor_class_dexterity'];
		cost: number;
		weight: number;
		body_location: string;
	}>(database, 'SELECT * FROM armor ORDER BY armor_name');

	const items = selectObjects<{
		item_id: string;
		item_name: string;
		item_category: Item['item_category'];
		item_subcategory: string | null;
		cost: number;
		cost_currency: Item['cost_currency'];
		weight: number | null;
		speed: string | null;
		carrying_capacity: string | null;
	}>(database, 'SELECT * FROM items ORDER BY item_name').map((row) => ({
		item_id: row.item_id,
		item_name: row.item_name,
		item_category: row.item_category,
		item_subcategory: row.item_subcategory,
		cost: row.cost,
		cost_currency: row.cost_currency,
		weight: row.weight,
		speed: row.speed,
		carrying_capacity: row.carrying_capacity
	}));

	const conditions = selectObjects<{
		condition_id: string;
		condition_name: string;
		description: string;
	}>(database, 'SELECT * FROM conditions ORDER BY condition_name');

	const skills = selectObjects<{
		skill_id: string;
		skill_name: string;
		ability: string;
	}>(database, 'SELECT * FROM skills ORDER BY skill_name');

	const species = loadSpeciesCatalog(database);

	return { spells, weapons, armor, items, conditions, skills, species };
}

export function loadSpeciesCatalog(database: AppDb | MemoryDb): Species[] {
	const speciesRows = selectObjects<{
		species_id: string;
		species_name: string;
		creature_type: string;
		size: string;
		speed: string;
		description: string;
	}>(database, 'SELECT * FROM species ORDER BY species_name');

	const traitRows = selectObjects<{
		trait_id: string;
		species_id: string;
		trait_name: string;
		description: string;
		sort_order: number;
	}>(database, 'SELECT * FROM species_traits ORDER BY sort_order, trait_name');

	const effectRows = selectObjects<{
		effect_id: string;
		trait_id: string;
		effect_kind: SpeciesTraitEffect['effect_kind'];
		target: string | null;
		value: string | null;
		notes: string | null;
	}>(database, 'SELECT * FROM species_trait_effects');

	const effectsByTrait = new Map<string, SpeciesTraitEffect[]>();
	for (const row of effectRows) {
		const effects = effectsByTrait.get(row.trait_id) ?? [];
		effects.push({
			effect_id: row.effect_id,
			effect_kind: row.effect_kind,
			target: row.target,
			value: row.value,
			notes: row.notes
		});
		effectsByTrait.set(row.trait_id, effects);
	}

	const traitsBySpecies = new Map<string, SpeciesTrait[]>();
	for (const row of traitRows) {
		const traits = traitsBySpecies.get(row.species_id) ?? [];
		traits.push({
			trait_id: row.trait_id,
			trait_name: row.trait_name,
			description: row.description,
			sort_order: row.sort_order,
			effects: effectsByTrait.get(row.trait_id) ?? []
		});
		traitsBySpecies.set(row.species_id, traits);
	}

	return speciesRows.map((row) => ({
		species_id: row.species_id,
		species_name: row.species_name,
		creature_type: row.creature_type,
		size: row.size,
		speed: row.speed,
		description: row.description,
		traits: traitsBySpecies.get(row.species_id) ?? []
	}));
}

export function upsertSpell(database: AppDb, spell: Spell): void {
	upsertCatalogEntry(database, SPELL_CONFIG, {
		spell_id: spell.spell_id,
		spell_name: spell.spell_name.trim(),
		spell_level: spell.spell_level,
		spell_school: spell.spell_school,
		is_ritual: spell.is_ritual ? 1 : 0,
		casting_time: spell.casting_time,
		range: spell.range,
		components: spell.components,
		duration: spell.duration,
		description: spell.description
	});
}

export function deleteSpell(database: AppDb, spellId: string): void {
	deleteCatalogEntry(database, 'spells', 'spell_id', spellId);
}

export function upsertWeapon(database: AppDb, weapon: Weapon): void {
	upsertCatalogEntry(database, WEAPON_CONFIG, {
		weapon_id: weapon.weapon_id,
		weapon_name: weapon.weapon_name.trim(),
		weapon_category: weapon.weapon_category,
		cost: weapon.cost,
		cost_currency: weapon.cost_currency,
		damage_dice: weapon.damage_dice,
		damage_type: weapon.damage_type,
		weight: weapon.weight,
		properties: weapon.properties
	});
}

export function deleteWeapon(database: AppDb, weaponId: string): void {
	deleteCatalogEntry(database, 'weapons', 'weapon_id', weaponId);
}

export function upsertArmor(database: AppDb, armor: Armor): void {
	upsertCatalogEntry(database, ARMOR_CONFIG, {
		armor_id: armor.armor_id,
		armor_name: armor.armor_name.trim(),
		armor_category: armor.armor_category,
		armor_class: armor.armor_class,
		armor_class_dexterity: armor.armor_class_dexterity,
		cost: armor.cost,
		weight: armor.weight,
		body_location: armor.body_location
	});
}

export function deleteArmor(database: AppDb, armorId: string): void {
	deleteCatalogEntry(database, 'armor', 'armor_id', armorId);
}

export function upsertItem(database: AppDb, item: Item): void {
	upsertCatalogEntry(database, ITEM_CONFIG, {
		item_id: item.item_id,
		item_name: item.item_name.trim(),
		item_category: item.item_category,
		item_subcategory: item.item_subcategory,
		cost: item.cost,
		cost_currency: item.cost_currency,
		weight: item.weight,
		speed: item.speed,
		carrying_capacity: item.carrying_capacity
	});
}

export function deleteItem(database: AppDb, itemId: string): void {
	deleteCatalogEntry(database, 'items', 'item_id', itemId);
}

export function upsertCondition(database: AppDb, condition: Condition): void {
	upsertCatalogEntry(database, CONDITION_CONFIG, {
		condition_id: condition.condition_id,
		condition_name: condition.condition_name.trim(),
		description: condition.description
	});
}

export function deleteCondition(database: AppDb, conditionId: string): void {
	deleteCatalogEntry(database, 'conditions', 'condition_id', conditionId);
}

export function upsertSpecies(database: AppDb, species: Species): void {
	withTransaction(database, () => {
		upsertSpeciesInTransaction(database, species);
	});
}

export function upsertSpeciesInTransaction(database: AppDb, species: Species): void {
	execSql(database, {
		sql: `INSERT INTO species (
			species_id, species_name, creature_type, size, speed, description
		) VALUES (
			$species_id, $species_name, $creature_type, $size, $speed, $description
		)
		ON CONFLICT(species_id) DO UPDATE SET
			species_name = excluded.species_name,
			creature_type = excluded.creature_type,
			size = excluded.size,
			speed = excluded.speed,
			description = excluded.description`,
		bind: {
			species_id: species.species_id,
			species_name: species.species_name.trim(),
			creature_type: species.creature_type,
			size: species.size,
			speed: species.speed,
			description: species.description
		}
	});

	const traitIds = species.traits.map((trait) => trait.trait_id);
	if (traitIds.length === 0) {
		execSql(database, {
			sql: `DELETE FROM species_trait_effects WHERE trait_id IN (
				SELECT trait_id FROM species_traits WHERE species_id = $species_id
			)`,
			bind: { species_id: species.species_id }
		});
		execSql(database, {
			sql: `DELETE FROM species_traits WHERE species_id = $species_id`,
			bind: { species_id: species.species_id }
		});
		return;
	}

	const traitPlaceholders = traitIds.map((_, index) => `$trait_${index}`).join(', ');
	const traitBind = Object.fromEntries(traitIds.map((id, index) => [`trait_${index}`, id]));
	traitBind.species_id = species.species_id;

	execSql(database, {
		sql: `DELETE FROM species_trait_effects WHERE trait_id IN (
			SELECT trait_id FROM species_traits
			WHERE species_id = $species_id AND trait_id NOT IN (${traitPlaceholders})
		)`,
		bind: traitBind
	});
	execSql(database, {
		sql: `DELETE FROM species_traits
			WHERE species_id = $species_id AND trait_id NOT IN (${traitPlaceholders})`,
		bind: traitBind
	});

	for (const trait of species.traits) {
		execSql(database, {
			sql: `INSERT INTO species_traits (
				trait_id, species_id, trait_name, description, sort_order
			) VALUES (
				$trait_id, $species_id, $trait_name, $description, $sort_order
			)
			ON CONFLICT(trait_id) DO UPDATE SET
				trait_name = excluded.trait_name,
				description = excluded.description,
				sort_order = excluded.sort_order`,
			bind: {
				trait_id: trait.trait_id,
				species_id: species.species_id,
				trait_name: trait.trait_name,
				description: trait.description,
				sort_order: trait.sort_order
			}
		});

		const effectIds = trait.effects.map((effect) => effect.effect_id);
		if (effectIds.length === 0) {
			execSql(database, {
				sql: `DELETE FROM species_trait_effects WHERE trait_id = $trait_id`,
				bind: { trait_id: trait.trait_id }
			});
			continue;
		}

		const effectPlaceholders = effectIds.map((_, index) => `$effect_${index}`).join(', ');
		const effectBind = Object.fromEntries(effectIds.map((id, index) => [`effect_${index}`, id]));
		effectBind.trait_id = trait.trait_id;

		execSql(database, {
			sql: `DELETE FROM species_trait_effects
				WHERE trait_id = $trait_id AND effect_id NOT IN (${effectPlaceholders})`,
			bind: effectBind
		});

		for (const effect of trait.effects) {
			execSql(database, {
				sql: `INSERT INTO species_trait_effects (
					effect_id, trait_id, effect_kind, target, value, notes
				) VALUES (
					$effect_id, $trait_id, $effect_kind, $target, $value, $notes
				)
				ON CONFLICT(effect_id) DO UPDATE SET
					effect_kind = excluded.effect_kind,
					target = excluded.target,
					value = excluded.value,
					notes = excluded.notes`,
				bind: {
					effect_id: effect.effect_id,
					trait_id: trait.trait_id,
					effect_kind: effect.effect_kind,
					target: effect.target,
					value: effect.value,
					notes: effect.notes
				}
			});
		}
	}
}

export function deleteSpecies(database: AppDb, speciesId: string): void {
	execSql(database, {
		sql: `DELETE FROM species_trait_effects WHERE trait_id IN (
			SELECT trait_id FROM species_traits WHERE species_id = $species_id
		)`,
		bind: { species_id: speciesId }
	});
	execSql(database, {
		sql: `DELETE FROM species_traits WHERE species_id = $species_id`,
		bind: { species_id: speciesId }
	});
	deleteCatalogEntry(database, 'species', 'species_id', speciesId);
}
