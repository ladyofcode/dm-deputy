import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seedDir = join(root, 'ignorable/catalog-seed/dnd5e');
const committedSeedDir = join(root, 'scripts/catalog-seed/dnd5e');

export const CATALOG_VERSION = '3';

function readSeed(filename) {
	const committedPath = join(committedSeedDir, filename);
	if (existsSync(committedPath)) {
		return JSON.parse(readFileSync(committedPath, 'utf8'));
	}

	const path = join(seedDir, filename);
	if (!existsSync(path)) {
		return null;
	}

	return JSON.parse(readFileSync(path, 'utf8'));
}

export function seedCatalogDatabase(db) {
	const spells = readSeed('spells.json');
	const weapons = readSeed('weapons.json');
	const armor = readSeed('armor.json');
	const items = readSeed('items.json');
	const conditions = readSeed('conditions.json');
	const skills = readSeed('skills.json');
	const species = readSeed('species.json');

	db.exec({
		sql: `INSERT INTO catalog_meta (key, value) VALUES ('game_schema', 'dnd5e')`
	});
	db.exec({
		sql: `INSERT INTO catalog_meta (key, value) VALUES ('catalog_version', '${CATALOG_VERSION}')`
	});

	for (const spell of spells?.spells ?? []) {
		db.exec({
			sql: `INSERT INTO spells (
				spell_id, spell_name, spell_level, spell_school, is_ritual,
				casting_time, range, components, duration, description
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			bind: [
				spell.spell_id,
				spell.spell_name,
				spell.spell_level,
				spell.spell_school,
				spell.is_ritual ? 1 : 0,
				spell.casting_time,
				spell.range,
				spell.components,
				spell.duration,
				spell.description
			]
		});
	}

	for (const weapon of weapons?.weapons ?? []) {
		db.exec({
			sql: `INSERT INTO weapons (
				weapon_id, weapon_name, weapon_category, cost, cost_currency,
				damage_dice, damage_type, weight, properties
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			bind: [
				weapon.weapon_id,
				weapon.weapon_name,
				weapon.weapon_category,
				weapon.cost,
				weapon.cost_currency,
				weapon.damage_dice,
				weapon.damage_type,
				weapon.weight,
				weapon.properties
			]
		});
	}

	for (const entry of armor?.armor ?? []) {
		db.exec({
			sql: `INSERT INTO armor (
				armor_id, armor_name, armor_category, armor_class, armor_class_dexterity,
				cost, weight, body_location
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			bind: [
				entry.armor_id,
				entry.armor_name,
				entry.armor_category,
				entry.armor_class,
				entry.armor_class_dexterity,
				entry.cost,
				entry.weight,
				entry.body_location
			]
		});
	}

	for (const item of items?.items ?? []) {
		db.exec({
			sql: `INSERT INTO items (
				item_id, item_name, item_category, item_subcategory, cost, cost_currency,
				weight, speed, carrying_capacity
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			bind: [
				item.item_id,
				item.item_name,
				item.item_category,
				item.item_subcategory,
				item.cost,
				item.cost_currency,
				item.weight,
				item.speed,
				item.carrying_capacity
			]
		});
	}

	for (const condition of conditions?.conditions ?? []) {
		db.exec({
			sql: `INSERT OR IGNORE INTO conditions (
				condition_id, condition_name, description
			) VALUES (?, ?, ?)`,
			bind: [condition.condition_id, condition.condition_name, condition.description]
		});
	}

	for (const skill of skills?.skills ?? []) {
		db.exec({
			sql: `INSERT OR IGNORE INTO skills (skill_id, skill_name, ability) VALUES (?, ?, ?)`,
			bind: [skill.skill_id, skill.skill_name, skill.ability]
		});
	}

	for (const entry of species?.species ?? []) {
		db.exec({
			sql: `INSERT OR IGNORE INTO species (
				species_id, species_name, creature_type, size, speed, description
			) VALUES (?, ?, ?, ?, ?, ?)`,
			bind: [
				entry.species_id,
				entry.species_name,
				entry.creature_type,
				entry.size,
				entry.speed,
				entry.description
			]
		});

		for (const trait of entry.traits ?? []) {
			db.exec({
				sql: `INSERT OR IGNORE INTO species_traits (
					trait_id, species_id, trait_name, description, sort_order
				) VALUES (?, ?, ?, ?, ?)`,
				bind: [
					trait.trait_id,
					entry.species_id,
					trait.trait_name,
					trait.description,
					trait.sort_order ?? 0
				]
			});

			for (const effect of trait.effects ?? []) {
				db.exec({
					sql: `INSERT OR IGNORE INTO species_trait_effects (
						effect_id, trait_id, effect_kind, target, value, notes
					) VALUES (?, ?, ?, ?, ?, ?)`,
					bind: [
						effect.effect_id,
						trait.trait_id,
						effect.effect_kind,
						effect.target,
						effect.value,
						effect.notes
					]
				});
			}
		}
	}

	const counts = {
		spellCount: spells?.spells?.length ?? 0,
		weaponCount: weapons?.weapons?.length ?? 0,
		armorCount: armor?.armor?.length ?? 0,
		itemCount: items?.items?.length ?? 0,
		conditionCount: conditions?.conditions?.length ?? 0,
		skillCount: skills?.skills?.length ?? 0,
		speciesCount: species?.species?.length ?? 0
	};

	return {
		...counts,
		seededFromJson:
			counts.spellCount +
				counts.weaponCount +
				counts.armorCount +
				counts.itemCount +
				counts.conditionCount +
				counts.skillCount +
				counts.speciesCount >
			0
	};
}
