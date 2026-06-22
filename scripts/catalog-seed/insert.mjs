import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seedDir = join(root, 'ignorable/catalog-seed/dnd5e');

export const CATALOG_VERSION = '1';

function readSeed(filename) {
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

	const counts = {
		spellCount: spells?.spells?.length ?? 0,
		weaponCount: weapons?.weapons?.length ?? 0,
		armorCount: armor?.armor?.length ?? 0,
		itemCount: items?.items?.length ?? 0
	};

	return {
		...counts,
		seededFromJson:
			counts.spellCount + counts.weaponCount + counts.armorCount + counts.itemCount > 0
	};
}
