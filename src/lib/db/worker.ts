/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { MIGRATIONS, REPAIR_MIGRATION_VERSIONS, SCHEMA_VERSION } from './migrations';
import { ensureDefaultUser } from './seed';
import { execSql, selectObjects } from './bind';
import type {
	CampaignSnapshot,
	CatalogSnapshot,
	CreateAdventureInput,
	CreateCampaignInput,
	CreateCampaignMapInput,
	AddCampaignNpcToCampaignInput,
	AddCampaignNpcToCampaignResult,
	AddCampaignPcToCampaignInput,
	AddCampaignPcToCampaignResult,
	AddCampaignPlayerInput,
	AddCampaignPlayerResult,
	CreateCampaignCharacterInput,
	CreateCampaignPlayerInput,
	CharacterLoadout,
	DbExec,
	InitResult,
	LocalStorageStoryMigration,
	PartStorySnapshot,
	PromoteAdventureInput,
	PromoteAdventureResult,
	UpdateCampaignCharacterInput,
	UpdateCampaignDetailsInput,
	UpdateCharacterStatCacheInput,
	WorkerRequest,
	WorkerResponse
} from './types';
import {
	remapItemLayout,
	remapNodeLayout,
	remapStoryItems,
	remapStoryNodes
} from '$lib/domain/promote-adventure';
import { isRewardGroupId } from '$lib/domain/story-item-reward';
import {
	isNpcCharacterKind,
	normalizeCharacterKind,
	type Armor,
	type CampaignMap,
	type CampaignNpc,
	type Character,
	type CharacterStatEvent,
	type EncounterResolution,
	type EncounterXpAward,
	type Item,
	type Part,
	type Spell,
	type StatKind,
	type StoryItem,
	type StoryNode,
	type Weapon
} from '$lib/types/schema';
import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story';

const DB_FILENAME = '/dm-deputy.db';

type SqliteModule = Awaited<ReturnType<typeof sqlite3InitModule>>;
type OpfsDb = InstanceType<NonNullable<SqliteModule['oo1']>['OpfsDb']>;
type MemoryDb = InstanceType<SqliteModule['oo1']['DB']>;
type AppDb = OpfsDb | MemoryDb;

let sqlite3: SqliteModule | null = null;
let db: AppDb | null = null;

const REQUIRED_TABLES = [
	'schema_meta',
	'users',
	'campaigns',
	'campaign_members',
	'campaign_npcs',
	'adventures',
	'parts',
	'story_nodes',
	'story_items',
	'part_node_layouts',
	'part_item_layouts',
	'characters',
	'events',
	'maps',
	'event_maps',
	'skills',
	'encounter_resolutions',
	'character_stat_events',
	'character_items',
	'character_weapons',
	'character_spells',
	'character_armor',
	'character_skills',
	'catalog_meta',
	'spells',
	'weapons',
	'armor',
	'items'
] as const;

function isOpfsAvailable(module: SqliteModule): boolean {
	return 'OpfsDb' in module.oo1;
}

function countCampaigns(database: AppDb): number {
	const rows = selectObjects<{ count: number }>(
		database,
		`SELECT COUNT(*) AS count FROM campaigns WHERE date_deleted IS NULL`
	);
	return rows[0]?.count ?? 0;
}

function getDb(): AppDb {
	if (!db) {
		throw new Error('Database not opened');
	}

	return db;
}

function asDbExec(database: AppDb): DbExec {
	return {
		exec: (sql) => execSql(database, sql),
		selectObjects: <T>(sql: string, bind?: Record<string, unknown>) =>
			selectObjects(database, sql, bind) as T[]
	};
}

function hasSchemaMetaTable(database: AppDb): boolean {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_meta' LIMIT 1`
	);
	return rows.length > 0;
}

function getSchemaVersion(database: AppDb): number {
	if (!hasSchemaMetaTable(database)) {
		return 0;
	}

	const rows = selectObjects<{ value: string }>(
		database,
		`SELECT value FROM schema_meta WHERE key = 'schema_version' LIMIT 1`
	);
	const parsed = Number.parseInt(rows[0]?.value ?? '', 10);
	return Number.isFinite(parsed) ? parsed : 0;
}

function verifyRequiredTables(database: AppDb): void {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM sqlite_master WHERE type = 'table'`
	);
	const existing = new Set(rows.map((row) => row.name));
	const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

	if (missing.length > 0) {
		throw new Error(`Database schema incomplete. Missing tables: ${missing.join(', ')}`);
	}
}

function tableHasColumn(database: AppDb, table: string, column: string): boolean {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM pragma_table_info('${table.replace(/'/g, "''")}')`
	);
	return rows.some((row) => row.name === column);
}

function addColumnIfMissing(
	database: AppDb,
	table: string,
	column: string,
	definition: string
): void {
	if (tableHasColumn(database, table, column)) {
		return;
	}

	execSql(database, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function repairStoryItemFlagColumns(database: AppDb): void {
	if (!tableExists(database, 'story_items')) {
		return;
	}

	const needsBackfill =
		!tableHasColumn(database, 'story_items', 'is_treasure') ||
		!tableHasColumn(database, 'story_items', 'is_reward');

	addColumnIfMissing(database, 'story_items', 'is_treasure', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(database, 'story_items', 'is_reward', 'INTEGER NOT NULL DEFAULT 0');

	if (needsBackfill) {
		backfillStoryItemFlags(database);
	}
}

function repairMapBlobColumns(database: AppDb): void {
	if (!tableExists(database, 'maps')) {
		return;
	}

	addColumnIfMissing(database, 'maps', 'mime_type', 'TEXT');
	addColumnIfMissing(database, 'maps', 'full_width', 'INTEGER');
	addColumnIfMissing(database, 'maps', 'full_height', 'INTEGER');
	addColumnIfMissing(database, 'maps', 'thumb_width', 'INTEGER');
	addColumnIfMissing(database, 'maps', 'thumb_height', 'INTEGER');
	addColumnIfMissing(database, 'maps', 'thumb_blob', 'BLOB');
	addColumnIfMissing(database, 'maps', 'full_blob', 'BLOB');
	addColumnIfMissing(database, 'maps', 'created_at', 'TEXT');
}

function repairCharacterKinds(database: AppDb): void {
	if (!tableExists(database, 'characters')) {
		return;
	}

	execSql(database, {
		sql: `UPDATE characters SET kind = 'npc_general' WHERE kind = 'npc'`
	});
}

function repairCampaignNpcsTable(database: AppDb): void {
	applyMigration(database, 14);
}

function repairPartsSessionDuration(database: AppDb): void {
	if (!tableExists(database, 'parts')) {
		return;
	}

	addColumnIfMissing(database, 'parts', 'session_duration', 'TEXT');

	if (tableHasColumn(database, 'parts', 'session_estimate_min')) {
		execSql(database, 'ALTER TABLE parts DROP COLUMN session_estimate_min');
	}

	if (tableHasColumn(database, 'parts', 'session_estimate_max')) {
		execSql(database, 'ALTER TABLE parts DROP COLUMN session_estimate_max');
	}
}

function repairUsersSoftDeleteColumn(database: AppDb): void {
	if (!tableExists(database, 'users')) {
		return;
	}

	addColumnIfMissing(database, 'users', 'date_deleted', 'TEXT');
}

function repairCharacterStatEventDescriptionColumn(database: AppDb): void {
	if (!tableExists(database, 'character_stat_events')) {
		return;
	}

	addColumnIfMissing(database, 'character_stat_events', 'description', 'TEXT');
}

function repairStoryNodeXpAwardColumn(database: AppDb): void {
	if (!tableExists(database, 'story_nodes')) {
		return;
	}

	if (!tableHasColumn(database, 'story_nodes', 'xp_award')) {
		return;
	}

	execSql(database, 'ALTER TABLE story_nodes DROP COLUMN xp_award');
}

function repairSchemaColumns(database: AppDb): void {
	addColumnIfMissing(database, 'story_nodes', 'activated_at', 'TEXT');
	addColumnIfMissing(database, 'story_nodes', 'completed_at', 'TEXT');
	repairStoryItemFlagColumns(database);
	repairMapBlobColumns(database);
	repairCharacterKinds(database);
	repairCampaignNpcsTable(database);
	repairPartsSessionDuration(database);
	repairUsersSoftDeleteColumn(database);
	repairCharacterStatEventDescriptionColumn(database);
	repairStoryNodeXpAwardColumn(database);
}

function applyMigration(database: AppDb, version: number): void {
	if (version === 4) {
		addColumnIfMissing(database, 'story_nodes', 'activated_at', 'TEXT');
		return;
	}

	if (version === 10) {
		repairStoryItemFlagColumns(database);
		return;
	}

	if (version === 11) {
		addColumnIfMissing(database, 'story_nodes', 'completed_at', 'TEXT');
		return;
	}

	if (version === 12) {
		repairMapBlobColumns(database);
		return;
	}

	if (version === 15) {
		repairPartsSessionDuration(database);
		return;
	}

	if (version === 16) {
		repairUsersSoftDeleteColumn(database);
		return;
	}

	if (version === 17) {
		repairCharacterStatEventDescriptionColumn(database);
		return;
	}

	if (version === 18) {
		repairStoryNodeXpAwardColumn(database);
		return;
	}

	const sql = MIGRATIONS[version];
	if (sql?.trim()) {
		database.exec(sql);
	}
}

function backfillStoryItemFlags(database: AppDb): void {
	const rows = selectObjects<{
		part_id: string;
		item_id: string;
		kind: string;
		payload_json: string;
		is_treasure: number | null;
		is_reward: number | null;
	}>(
		database,
		'SELECT part_id, item_id, kind, payload_json, is_treasure, is_reward FROM story_items'
	);

	for (const row of rows) {
		let payload: Partial<StoryItem>;
		try {
			payload = JSON.parse(row.payload_json) as Partial<StoryItem>;
		} catch {
			payload = {};
		}

		const isTreasure = row.is_treasure ? 1 : payload.is_treasure ? 1 : 0;
		const isReward = row.is_reward ? 1 : payload.is_reward ? 1 : row.kind === 'xp' ? 1 : 0;

		execSql(database, {
			sql: `UPDATE story_items
				SET is_treasure = $is_treasure, is_reward = $is_reward
				WHERE part_id = $part_id AND item_id = $item_id`,
			bind: {
				is_treasure: isTreasure,
				is_reward: isReward,
				part_id: row.part_id,
				item_id: row.item_id
			}
		});
	}
}

function runMigrations(database: AppDb): void {
	const currentVersion = getSchemaVersion(database);

	for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version += 1) {
		applyMigration(database, version);
	}

	execSql(database, {
		sql: `INSERT INTO schema_meta (key, value) VALUES ('schema_version', $schema_version)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		bind: { schema_version: String(SCHEMA_VERSION) }
	});
}

function repairMissingRequiredTables(database: AppDb): void {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM sqlite_master WHERE type = 'table'`
	);
	const existing = new Set(rows.map((row) => row.name));
	const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

	if (missing.length === 0) {
		return;
	}

	for (const version of REPAIR_MIGRATION_VERSIONS) {
		applyMigration(database, version);
	}

	if (missing.includes('campaign_npcs')) {
		applyMigration(database, 14);
	}
}

function isSeeded(database: AppDb): boolean {
	if (!hasSchemaMetaTable(database)) {
		return false;
	}

	const rows = selectObjects<{ value: string }>(
		database,
		`SELECT value FROM schema_meta WHERE key = 'seeded' LIMIT 1`
	);
	return rows.length > 0;
}

function countTableRows(database: AppDb, table: string): number {
	const rows = selectObjects<{ count: number }>(database, `SELECT COUNT(*) AS count FROM ${table}`);
	return rows[0]?.count ?? 0;
}

function tableExists(database: AppDb, table: string): boolean {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1`,
		{ name: table }
	);
	return rows.length > 0;
}

function copyCatalogTable(source: AppDb, destination: AppDb, table: string): void {
	const rows = selectObjects<Record<string, unknown>>(source, `SELECT * FROM ${table}`);
	if (rows.length === 0) return;

	const columns = Object.keys(rows[0]);
	const columnList = columns.join(', ');
	const placeholders = columns.map((column) => `$${column}`).join(', ');

	for (const row of rows) {
		execSql(destination, {
			sql: `INSERT OR IGNORE INTO ${table} (${columnList}) VALUES (${placeholders})`,
			bind: row
		});
	}
}

function ensureCatalogSeeded(database: AppDb, templateBuffer: ArrayBuffer): void {
	if (!tableExists(database, 'weapons') || countTableRows(database, 'weapons') > 0) {
		return;
	}

	const module = sqlite3;
	if (!module) {
		throw new Error('SQLite module not initialized');
	}

	const templateDatabase = deserializeDatabaseFromBuffer(module, templateBuffer);

	try {
		for (const table of ['catalog_meta', 'spells', 'weapons', 'armor', 'items'] as const) {
			if (!tableExists(templateDatabase, table)) continue;
			copyCatalogTable(templateDatabase, database, table);
		}
	} finally {
		templateDatabase.close();
	}
}

async function initDatabase(
	migrations: LocalStorageStoryMigration[],
	templateBuffer: ArrayBuffer
): Promise<InitResult> {
	sqlite3 = await sqlite3InitModule();
	const { database, persistent } = await openDatabaseFromTemplate(sqlite3, templateBuffer);
	db = database;
	runMigrations(db);
	repairMissingRequiredTables(db);
	repairSchemaColumns(db);
	ensureCatalogSeeded(db, templateBuffer);
	verifyRequiredTables(db);

	const wasSeeded = isSeeded(db);
	ensureDefaultUser(asDbExec(db));

	migrateLocalStorageStory(db, migrations);

	return {
		schemaVersion: SCHEMA_VERSION,
		seeded: !wasSeeded,
		campaignCount: countCampaigns(db),
		persistent
	};
}

function deserializeDatabaseFromBuffer(module: SqliteModule, buffer: ArrayBuffer): MemoryDb {
	const database = new module.oo1.DB(':memory:');
	const bytes = new Uint8Array(buffer);
	const pointer = module.wasm.allocFromTypedArray(bytes);
	const flags =
		module.capi.SQLITE_DESERIALIZE_FREEONCLOSE | module.capi.SQLITE_DESERIALIZE_RESIZEABLE;
	const result = module.capi.sqlite3_deserialize(
		database.pointer!,
		'main',
		pointer,
		bytes.byteLength,
		bytes.byteLength,
		flags
	);

	if (result !== module.capi.SQLITE_OK) {
		throw new Error(`Failed to read database template: ${module.capi.sqlite3_js_rc_str(result)}`);
	}

	return database;
}

async function openDatabaseFromTemplate(
	module: SqliteModule,
	templateBuffer: ArrayBuffer
): Promise<{ database: AppDb; persistent: boolean }> {
	if (isOpfsAvailable(module)) {
		try {
			let database = new module.oo1.OpfsDb(DB_FILENAME, 'c');

			if (!hasSchemaMetaTable(database)) {
				database.close();
				await module.oo1.OpfsDb.importDb(DB_FILENAME, templateBuffer);
				database = new module.oo1.OpfsDb(DB_FILENAME, 'c');
			}

			return { database, persistent: true };
		} catch (cause) {
			console.warn('[dm-deputy] OPFS database unavailable, using in-memory template copy', cause);
		}
	}

	return {
		database: deserializeDatabaseFromBuffer(module, templateBuffer),
		persistent: false
	};
}

function migrateLocalStorageStory(database: AppDb, migrations: LocalStorageStoryMigration[]): void {
	for (const entry of migrations) {
		if (entry.nodes?.length) {
			savePartStoryNodes(database, entry.partId, entry.nodes);
		}
		if (entry.nodeLayout) {
			savePartNodeLayout(database, entry.partId, entry.nodeLayout);
		}
		if (entry.itemLayout) {
			savePartItemLayout(database, entry.partId, entry.itemLayout);
		}
	}
}

function loadCatalogSnapshot(database: AppDb | MemoryDb): CatalogSnapshot {
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

	return { spells, weapons, armor, items };
}

function upsertSpell(database: AppDb, spell: Spell): void {
	execSql(database, {
		sql: `INSERT INTO spells (
			spell_id, spell_name, spell_level, spell_school, is_ritual,
			casting_time, range, components, duration, description
		) VALUES (
			$spell_id, $spell_name, $spell_level, $spell_school, $is_ritual,
			$casting_time, $range, $components, $duration, $description
		)
		ON CONFLICT(spell_id) DO UPDATE SET
			spell_name = excluded.spell_name,
			spell_level = excluded.spell_level,
			spell_school = excluded.spell_school,
			is_ritual = excluded.is_ritual,
			casting_time = excluded.casting_time,
			range = excluded.range,
			components = excluded.components,
			duration = excluded.duration,
			description = excluded.description`,
		bind: {
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
		}
	});
}

function deleteSpell(database: AppDb, spellId: string): void {
	execSql(database, {
		sql: `DELETE FROM spells WHERE spell_id = $spell_id`,
		bind: { spell_id: spellId }
	});
}

function upsertWeapon(database: AppDb, weapon: Weapon): void {
	execSql(database, {
		sql: `INSERT INTO weapons (
			weapon_id, weapon_name, weapon_category, cost, cost_currency,
			damage_dice, damage_type, weight, properties
		) VALUES (
			$weapon_id, $weapon_name, $weapon_category, $cost, $cost_currency,
			$damage_dice, $damage_type, $weight, $properties
		)
		ON CONFLICT(weapon_id) DO UPDATE SET
			weapon_name = excluded.weapon_name,
			weapon_category = excluded.weapon_category,
			cost = excluded.cost,
			cost_currency = excluded.cost_currency,
			damage_dice = excluded.damage_dice,
			damage_type = excluded.damage_type,
			weight = excluded.weight,
			properties = excluded.properties`,
		bind: {
			weapon_id: weapon.weapon_id,
			weapon_name: weapon.weapon_name.trim(),
			weapon_category: weapon.weapon_category,
			cost: weapon.cost,
			cost_currency: weapon.cost_currency,
			damage_dice: weapon.damage_dice,
			damage_type: weapon.damage_type,
			weight: weapon.weight,
			properties: weapon.properties
		}
	});
}

function deleteWeapon(database: AppDb, weaponId: string): void {
	execSql(database, {
		sql: `DELETE FROM weapons WHERE weapon_id = $weapon_id`,
		bind: { weapon_id: weaponId }
	});
}

function upsertArmor(database: AppDb, armor: Armor): void {
	execSql(database, {
		sql: `INSERT INTO armor (
			armor_id, armor_name, armor_category, armor_class, armor_class_dexterity,
			cost, weight, body_location
		) VALUES (
			$armor_id, $armor_name, $armor_category, $armor_class, $armor_class_dexterity,
			$cost, $weight, $body_location
		)
		ON CONFLICT(armor_id) DO UPDATE SET
			armor_name = excluded.armor_name,
			armor_category = excluded.armor_category,
			armor_class = excluded.armor_class,
			armor_class_dexterity = excluded.armor_class_dexterity,
			cost = excluded.cost,
			weight = excluded.weight,
			body_location = excluded.body_location`,
		bind: {
			armor_id: armor.armor_id,
			armor_name: armor.armor_name.trim(),
			armor_category: armor.armor_category,
			armor_class: armor.armor_class,
			armor_class_dexterity: armor.armor_class_dexterity,
			cost: armor.cost,
			weight: armor.weight,
			body_location: armor.body_location
		}
	});
}

function deleteArmor(database: AppDb, armorId: string): void {
	execSql(database, {
		sql: `DELETE FROM armor WHERE armor_id = $armor_id`,
		bind: { armor_id: armorId }
	});
}

function upsertItem(database: AppDb, item: Item): void {
	execSql(database, {
		sql: `INSERT INTO items (
			item_id, item_name, item_category, item_subcategory,
			cost, cost_currency, weight, speed, carrying_capacity
		) VALUES (
			$item_id, $item_name, $item_category, $item_subcategory,
			$cost, $cost_currency, $weight, $speed, $carrying_capacity
		)
		ON CONFLICT(item_id) DO UPDATE SET
			item_name = excluded.item_name,
			item_category = excluded.item_category,
			item_subcategory = excluded.item_subcategory,
			cost = excluded.cost,
			cost_currency = excluded.cost_currency,
			weight = excluded.weight,
			speed = excluded.speed,
			carrying_capacity = excluded.carrying_capacity`,
		bind: {
			item_id: item.item_id,
			item_name: item.item_name.trim(),
			item_category: item.item_category,
			item_subcategory: item.item_subcategory,
			cost: item.cost,
			cost_currency: item.cost_currency,
			weight: item.weight,
			speed: item.speed,
			carrying_capacity: item.carrying_capacity
		}
	});
}

function deleteItem(database: AppDb, itemId: string): void {
	execSql(database, {
		sql: `DELETE FROM items WHERE item_id = $item_id`,
		bind: { item_id: itemId }
	});
}

function loadCampaignSnapshot(database: AppDb): CampaignSnapshot {
	const users = selectObjects<CampaignSnapshot['users'][number]>(database, 'SELECT * FROM users').map(
		(user) => ({
			...user,
			date_deleted: user.date_deleted ?? null
		})
	);
	const campaigns = selectObjects<CampaignSnapshot['campaigns'][number]>(
		database,
		'SELECT * FROM campaigns'
	).map((campaign) => ({
		...campaign,
		date_deleted: campaign.date_deleted ?? null
	}));
	const campaignMembers = selectObjects<CampaignSnapshot['campaignMembers'][number]>(
		database,
		'SELECT * FROM campaign_members'
	);
	const campaignNpcs = selectObjects<CampaignSnapshot['campaignNpcs'][number]>(
		database,
		'SELECT * FROM campaign_npcs'
	);
	const adventures = selectObjects<CampaignSnapshot['adventures'][number]>(
		database,
		'SELECT * FROM adventures'
	).map((adventure) => ({
		...adventure,
		can_promote_to_campaign: Boolean(adventure.can_promote_to_campaign)
	}));
	const parts = selectObjects<CampaignSnapshot['parts'][number]>(database, 'SELECT * FROM parts');
	const characters = selectObjects<CampaignSnapshot['characters'][number]>(
		database,
		'SELECT * FROM characters'
	).map((character) => ({
		...character,
		kind: normalizeCharacterKind(character.kind)
	}));
	const maps = loadCampaignMapsMetadata(database);

	return { users, campaigns, campaignMembers, campaignNpcs, adventures, parts, characters, maps };
}

function loadCampaignMapsMetadata(database: AppDb): CampaignMap[] {
	return selectObjects<{
		map_id: string;
		campaign_id: string;
		name: string;
		mime_type: string;
		full_width: number;
		full_height: number;
		thumb_width: number;
		thumb_height: number;
		created_at: string;
	}>(
		database,
		`SELECT map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height, created_at
		 FROM maps
		 WHERE thumb_blob IS NOT NULL AND full_blob IS NOT NULL
		 ORDER BY name COLLATE NOCASE`
	);
}

function createCampaignMap(
	database: AppDb,
	input: CreateCampaignMapInput,
	thumbBuffer: ArrayBuffer,
	fullBuffer: ArrayBuffer
): CampaignMap {
	execSql(database, {
		sql: `INSERT INTO maps (
			map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height,
			thumb_blob, full_blob, created_at, layout_mode
		) VALUES (
			$map_id, $campaign_id, $name, $mime_type, $full_width, $full_height, $thumb_width, $thumb_height,
			$thumb_blob, $full_blob, $created_at, 'popup'
		)`,
		bind: {
			map_id: input.map_id,
			campaign_id: input.campaign_id,
			name: input.name,
			mime_type: input.mime_type,
			full_width: input.full_width,
			full_height: input.full_height,
			thumb_width: input.thumb_width,
			thumb_height: input.thumb_height,
			thumb_blob: new Uint8Array(thumbBuffer),
			full_blob: new Uint8Array(fullBuffer),
			created_at: input.created_at
		}
	});

	return {
		map_id: input.map_id,
		campaign_id: input.campaign_id,
		name: input.name,
		mime_type: input.mime_type,
		full_width: input.full_width,
		full_height: input.full_height,
		thumb_width: input.thumb_width,
		thumb_height: input.thumb_height,
		created_at: input.created_at
	};
}

function deleteCampaignMap(database: AppDb, mapId: string): void {
	execSql(database, {
		sql: 'DELETE FROM maps WHERE map_id = $mapId',
		bind: { mapId }
	});
}

function clearCharacterLoadout(database: AppDb, characterId: string): void {
	for (const table of [
		'character_weapons',
		'character_armor',
		'character_items',
		'character_spells'
	] as const) {
		execSql(database, {
			sql: `DELETE FROM ${table} WHERE character_id = $characterId`,
			bind: { characterId }
		});
	}
}

function loadCharacterLoadout(database: AppDb, characterId: string): CharacterLoadout {
	const weaponIds = selectObjects<{ weapon_id: string }>(
		database,
		'SELECT weapon_id FROM character_weapons WHERE character_id = $characterId ORDER BY rowid',
		{ characterId }
	).map((row) => row.weapon_id);
	const armorIds = selectObjects<{ armor_id: string }>(
		database,
		'SELECT armor_id FROM character_armor WHERE character_id = $characterId ORDER BY rowid',
		{ characterId }
	).map((row) => row.armor_id);
	const itemIds = selectObjects<{ item_id: string }>(
		database,
		'SELECT item_id FROM character_items WHERE character_id = $characterId ORDER BY rowid',
		{ characterId }
	).map((row) => row.item_id);
	const spellIds = selectObjects<{ spell_id: string }>(
		database,
		'SELECT spell_id FROM character_spells WHERE character_id = $characterId ORDER BY rowid',
		{ characterId }
	).map((row) => row.spell_id);

	return {
		weapon_ids: weaponIds,
		armor_ids: armorIds,
		item_ids: itemIds,
		spell_ids: spellIds
	};
}

function attachCharacterLoadout(
	database: AppDb,
	characterId: string,
	loadout: CharacterLoadout
): void {
	for (const weaponId of loadout.weapon_ids) {
		execSql(database, {
			sql: `INSERT INTO character_weapons (
				character_weapon_id, character_id, weapon_id, equipped
			) VALUES (
				$character_weapon_id, $character_id, $weapon_id, $equipped
			)`,
			bind: {
				character_weapon_id: `cwe-${crypto.randomUUID()}`,
				character_id: characterId,
				weapon_id: weaponId,
				equipped: 1
			}
		});
	}

	for (const armorId of loadout.armor_ids) {
		execSql(database, {
			sql: `INSERT INTO character_armor (
				character_armor_id, character_id, armor_id, equipped
			) VALUES (
				$character_armor_id, $character_id, $armor_id, $equipped
			)`,
			bind: {
				character_armor_id: `car-${crypto.randomUUID()}`,
				character_id: characterId,
				armor_id: armorId,
				equipped: 1
			}
		});
	}

	for (const itemId of loadout.item_ids) {
		execSql(database, {
			sql: `INSERT INTO character_items (
				character_item_id, character_id, item_id, quantity, notes
			) VALUES (
				$character_item_id, $character_id, $item_id, $quantity, $notes
			)`,
			bind: {
				character_item_id: `cit-${crypto.randomUUID()}`,
				character_id: characterId,
				item_id: itemId,
				quantity: 1,
				notes: null
			}
		});
	}

	for (const spellId of loadout.spell_ids) {
		execSql(database, {
			sql: `INSERT INTO character_spells (
				character_spell_id, character_id, spell_id, prepared
			) VALUES (
				$character_spell_id, $character_id, $spell_id, $prepared
			)`,
			bind: {
				character_spell_id: `csp-${crypto.randomUUID()}`,
				character_id: characterId,
				spell_id: spellId,
				prepared: 1
			}
		});
	}
}

function insertCampaignNpcLink(
	database: AppDb,
	campaignId: string,
	characterId: string,
	campaignNpcId: string,
	dateAdded: string
): CampaignNpc {
	const existing = selectObjects<{ campaign_npc_id: string }>(
		database,
		`SELECT campaign_npc_id FROM campaign_npcs
		 WHERE campaign_id = $campaignId AND character_id = $characterId
		 LIMIT 1`,
		{ campaignId, characterId }
	);

	if (existing[0]) {
		throw new Error('NPC is already in this campaign');
	}

	execSql(database, {
		sql: `INSERT INTO campaign_npcs (
			campaign_npc_id, campaign_id, character_id, date_added
		) VALUES (
			$campaign_npc_id, $campaign_id, $character_id, $date_added
		)`,
		bind: {
			campaign_npc_id: campaignNpcId,
			campaign_id: campaignId,
			character_id: characterId,
			date_added: dateAdded
		}
	});

	return {
		campaign_npc_id: campaignNpcId,
		campaign_id: campaignId,
		character_id: characterId,
		date_added: dateAdded
	};
}

function createCampaignCharacter(database: AppDb, input: CreateCampaignCharacterInput): Character {
	const experience = input.experience ?? 0;
	const level = input.level ?? 1;
	const hpMax = input.hp_max ?? 0;
	const hpCurrent = input.hp_current ?? hpMax;

	execSql(database, {
		sql: `INSERT INTO characters (
			character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation, notes
		) VALUES (
			$character_id, $campaign_id, $kind, $created_by_user_id, $cloned_from_character_id,
			$display_name, $experience_base, $experience, $level,
			$hp_max_base, $hp_current_base, $hp_current, $hp_max, $reputation, $notes
		)`,
		bind: {
			character_id: input.character_id,
			campaign_id: input.campaign_id,
			kind: input.kind,
			created_by_user_id: input.created_by_user_id,
			cloned_from_character_id: null,
			display_name: input.display_name,
			experience_base: experience,
			experience,
			level,
			hp_max_base: hpMax,
			hp_current_base: hpCurrent,
			hp_current: hpCurrent,
			hp_max: hpMax,
			reputation: input.reputation ?? null,
			notes: input.notes ?? null
		}
	});

	if (input.loadout) {
		attachCharacterLoadout(database, input.character_id, input.loadout);
	}

	if (isNpcCharacterKind(input.kind) && input.campaign_npc_id) {
		insertCampaignNpcLink(
			database,
			input.campaign_id,
			input.character_id,
			input.campaign_npc_id,
			input.date_added ?? new Date().toISOString()
		);
	}

	return {
		character_id: input.character_id,
		campaign_id: input.campaign_id,
		kind: input.kind,
		created_by_user_id: input.created_by_user_id,
		cloned_from_character_id: null,
		display_name: input.display_name,
		experience_base: experience,
		experience,
		level,
		hp_max_base: hpMax,
		hp_current_base: hpCurrent,
		hp_current: hpCurrent,
		hp_max: hpMax,
		reputation: input.reputation ?? null,
		notes: input.notes ?? null
	};
}

function updateCampaignCharacter(database: AppDb, input: UpdateCampaignCharacterInput): Character {
	const rows = selectObjects<{
		character_id: string;
		campaign_id: string;
		kind: string;
		created_by_user_id: string;
		cloned_from_character_id: string | null;
		experience_base: number;
		experience: number;
		level: number;
		hp_max_base: number;
		hp_current_base: number;
		hp_current: number;
		hp_max: number;
		reputation: string | null;
	}>(
		database,
		`SELECT character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation
		 FROM characters
		 WHERE character_id = $characterId
		 LIMIT 1`,
		{ characterId: input.character_id }
	);

	const existing = rows[0];
	if (!existing) {
		throw new Error('Character not found');
	}

	const kind = normalizeCharacterKind(input.kind);

	execSql(database, {
		sql: `UPDATE characters SET
			kind = $kind,
			display_name = $display_name,
			reputation = $reputation,
			notes = $notes
		WHERE character_id = $character_id`,
		bind: {
			character_id: input.character_id,
			kind,
			display_name: input.display_name.trim(),
			reputation: input.reputation ?? null,
			notes: input.notes ?? null
		}
	});

	if (input.loadout) {
		clearCharacterLoadout(database, input.character_id);
		attachCharacterLoadout(database, input.character_id, input.loadout);
	}

	return {
		character_id: input.character_id,
		campaign_id: existing.campaign_id,
		kind,
		created_by_user_id: existing.created_by_user_id,
		cloned_from_character_id: existing.cloned_from_character_id,
		display_name: input.display_name.trim(),
		experience_base: existing.experience_base,
		experience: existing.experience,
		level: existing.level,
		hp_max_base: existing.hp_max_base,
		hp_current_base: existing.hp_current_base,
		hp_current: existing.hp_current,
		hp_max: existing.hp_max,
		reputation: input.reputation ?? null,
		notes: input.notes ?? null
	};
}

function mapStatEventRow(row: {
	stat_event_id: string;
	character_id: string;
	campaign_id: string;
	stat: string;
	delta: number;
	value_after: number;
	source_type: string;
	source_id: string | null;
	source_label: string | null;
	description: string | null;
	batch_id: string | null;
	actor_user_id: string | null;
	metadata: string | null;
	created_at: string;
}): CharacterStatEvent {
	let metadata: Record<string, unknown> | null = null;

	if (row.metadata) {
		try {
			metadata = JSON.parse(row.metadata) as Record<string, unknown>;
		} catch {
			metadata = null;
		}
	}

	return {
		stat_event_id: row.stat_event_id,
		character_id: row.character_id,
		campaign_id: row.campaign_id,
		stat: row.stat as StatKind,
		delta: row.delta,
		value_after: row.value_after,
		source_type: row.source_type as CharacterStatEvent['source_type'],
		source_id: row.source_id,
		source_label: row.source_label ?? '',
		description: row.description,
		batch_id: row.batch_id,
		actor_user_id: row.actor_user_id ?? '',
		metadata,
		created_at: row.created_at
	};
}

function loadCharacterStatEvents(
	database: AppDb,
	characterId: string,
	stat: StatKind | null
): CharacterStatEvent[] {
	const rows = selectObjects<{
		stat_event_id: string;
		character_id: string;
		campaign_id: string;
		stat: string;
		delta: number;
		value_after: number;
		source_type: string;
		source_id: string | null;
		source_label: string | null;
		description: string | null;
		batch_id: string | null;
		actor_user_id: string | null;
		metadata: string | null;
		created_at: string;
	}>(
		database,
		stat
			? `SELECT stat_event_id, character_id, campaign_id, stat, delta, value_after,
					source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
			   FROM character_stat_events
			   WHERE character_id = $characterId AND stat = $stat
			   ORDER BY created_at ASC, stat_event_id ASC`
			: `SELECT stat_event_id, character_id, campaign_id, stat, delta, value_after,
					source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
			   FROM character_stat_events
			   WHERE character_id = $characterId
			   ORDER BY created_at ASC, stat_event_id ASC`,
		stat ? { characterId, stat } : { characterId }
	);

	return rows.map(mapStatEventRow);
}

function insertCharacterStatEvent(database: AppDb, event: CharacterStatEvent): CharacterStatEvent {
	execSql(database, {
		sql: `INSERT INTO character_stat_events (
			stat_event_id, character_id, campaign_id, stat, delta, value_after,
			source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
		) VALUES (
			$stat_event_id, $character_id, $campaign_id, $stat, $delta, $value_after,
			$source_type, $source_id, $source_label, $description, $batch_id, $actor_user_id, $metadata, $created_at
		)`,
		bind: {
			stat_event_id: event.stat_event_id,
			character_id: event.character_id,
			campaign_id: event.campaign_id,
			stat: event.stat,
			delta: event.delta,
			value_after: event.value_after,
			source_type: event.source_type,
			source_id: event.source_id,
			source_label: event.source_label,
			description: event.description,
			batch_id: event.batch_id,
			actor_user_id: event.actor_user_id,
			metadata: event.metadata ? JSON.stringify(event.metadata) : null,
			created_at: event.created_at
		}
	});

	return event;
}

function updateCharacterStatCache(database: AppDb, input: UpdateCharacterStatCacheInput): Character {
	const rows = selectObjects<{
		character_id: string;
		campaign_id: string;
		kind: string;
		created_by_user_id: string;
		cloned_from_character_id: string | null;
		display_name: string;
		experience_base: number;
		hp_max_base: number;
		hp_current_base: number;
		reputation: string | null;
		notes: string | null;
	}>(
		database,
		`SELECT character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, hp_max_base, hp_current_base, reputation, notes
		 FROM characters
		 WHERE character_id = $characterId
		 LIMIT 1`,
		{ characterId: input.character_id }
	);

	const existing = rows[0];
	if (!existing) {
		throw new Error('Character not found');
	}

	execSql(database, {
		sql: `UPDATE characters SET
			experience = $experience,
			level = $level,
			hp_max = $hp_max,
			hp_current = $hp_current
		WHERE character_id = $character_id`,
		bind: {
			character_id: input.character_id,
			experience: input.experience,
			level: input.level,
			hp_max: input.hp_max,
			hp_current: input.hp_current
		}
	});

	return {
		character_id: existing.character_id,
		campaign_id: existing.campaign_id,
		kind: normalizeCharacterKind(existing.kind),
		created_by_user_id: existing.created_by_user_id,
		cloned_from_character_id: existing.cloned_from_character_id,
		display_name: existing.display_name,
		experience_base: existing.experience_base,
		experience: input.experience,
		level: input.level,
		hp_max_base: existing.hp_max_base,
		hp_current_base: existing.hp_current_base,
		hp_current: input.hp_current,
		hp_max: input.hp_max,
		reputation: existing.reputation,
		notes: existing.notes
	};
}

function insertEncounterResolution(database: AppDb, resolution: EncounterResolution): EncounterResolution {
	execSql(database, {
		sql: `INSERT INTO encounter_resolutions (
			resolution_id, event_id, total_xp, split_mode, resolved_by_user_id, resolved_at
		) VALUES (
			$resolution_id, $event_id, $total_xp, $split_mode, $resolved_by_user_id, $resolved_at
		)`,
		bind: {
			resolution_id: resolution.resolution_id,
			event_id: resolution.event_id,
			total_xp: resolution.total_xp,
			split_mode: resolution.split_mode,
			resolved_by_user_id: resolution.resolved_by_user_id,
			resolved_at: resolution.resolved_at
		}
	});

	return resolution;
}

function getEncounterResolutionByEventId(
	database: AppDb,
	eventId: string
): EncounterResolution | null {
	const rows = selectObjects<{
		resolution_id: string;
		event_id: string;
		total_xp: number;
		split_mode: string;
		resolved_by_user_id: string;
		resolved_at: string;
	}>(
		database,
		`SELECT resolution_id, event_id, total_xp, split_mode, resolved_by_user_id, resolved_at
		 FROM encounter_resolutions
		 WHERE event_id = $eventId
		 LIMIT 1`,
		{ eventId }
	);

	const row = rows[0];
	if (!row) return null;

	return {
		resolution_id: row.resolution_id,
		event_id: row.event_id,
		total_xp: row.total_xp,
		split_mode: row.split_mode as EncounterResolution['split_mode'],
		resolved_by_user_id: row.resolved_by_user_id,
		resolved_at: row.resolved_at
	};
}

function getEncounterResolutionEventIds(database: AppDb, eventIds: string[]): string[] {
	if (eventIds.length === 0) return [];

	const placeholders = eventIds.map((_, index) => `$id${index}`).join(', ');
	const bind = Object.fromEntries(eventIds.map((id, index) => [`id${index}`, id]));

	const rows = selectObjects<{ event_id: string }>(
		database,
		`SELECT event_id FROM encounter_resolutions WHERE event_id IN (${placeholders})`,
		bind
	);

	return rows.map((row) => row.event_id);
}

function loadEncounterXpAwardsByEventIds(
	database: AppDb,
	eventIds: string[]
): EncounterXpAward[] {
	if (eventIds.length === 0) return [];

	const placeholders = eventIds.map((_, index) => `$id${index}`).join(', ');
	const bind = Object.fromEntries(eventIds.map((id, index) => [`id${index}`, id]));

	const rows = selectObjects<{
		event_id: string;
		character_id: string;
		amount: number;
		description: string | null;
		resolved_at: string;
	}>(
		database,
		`SELECT r.event_id, s.character_id, s.delta AS amount, s.description, r.resolved_at
		 FROM encounter_resolutions r
		 INNER JOIN character_stat_events s
		   ON s.batch_id = r.resolution_id
		  AND s.stat = 'experience'
		  AND s.source_type = 'encounter_xp'
		 WHERE r.event_id IN (${placeholders})
		 ORDER BY r.resolved_at ASC, s.character_id ASC`,
		bind
	);

	return rows.map((row) => ({
		event_id: row.event_id,
		character_id: row.character_id,
		amount: row.amount,
		description: row.description,
		resolved_at: row.resolved_at
	}));
}

function removeCampaignNpcFromCampaign(
	database: AppDb,
	campaignId: string,
	characterId: string
): void {
	const characters = selectObjects<{ kind: string }>(
		database,
		`SELECT kind FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId }
	);

	if (!characters[0] || !isNpcCharacterKind(normalizeCharacterKind(characters[0].kind))) {
		throw new Error('Only NPCs can be removed here');
	}

	const links = selectObjects<{ campaign_npc_id: string }>(
		database,
		`SELECT campaign_npc_id FROM campaign_npcs
		 WHERE campaign_id = $campaignId AND character_id = $characterId
		 LIMIT 1`,
		{ campaignId, characterId }
	);

	if (!links[0]) {
		throw new Error('NPC not found in this campaign');
	}

	execSql(database, {
		sql: `DELETE FROM campaign_npcs
			WHERE campaign_id = $campaignId AND character_id = $characterId`,
		bind: { campaignId, characterId }
	});
}

function addCampaignNpcToCampaign(
	database: AppDb,
	input: AddCampaignNpcToCampaignInput
): AddCampaignNpcToCampaignResult {
	const rows = selectObjects<Character>(
		database,
		`SELECT * FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId: input.character_id }
	);

	const character = rows[0];
	if (!character || !isNpcCharacterKind(character.kind)) {
		throw new Error('NPC not found');
	}

	const campaignNpc = insertCampaignNpcLink(
		database,
		input.campaign_id,
		input.character_id,
		input.campaign_npc_id,
		input.date_added
	);

	return {
		campaignNpc,
		character: {
			...character,
			kind: normalizeCharacterKind(character.kind)
		}
	};
}

function loadCampaignMapBlob(
	database: AppDb,
	mapId: string,
	variant: 'thumb' | 'full'
): ArrayBuffer | null {
	const column = variant === 'thumb' ? 'thumb_blob' : 'full_blob';
	const rows = selectObjects<Record<string, Uint8Array | null>>(
		database,
		`SELECT ${column} AS blob FROM maps WHERE map_id = $mapId LIMIT 1`,
		{ mapId }
	);
	const bytes = rows[0]?.blob;
	if (!bytes?.byteLength) return null;

	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function loadPartStory(database: AppDb, partId: string): PartStorySnapshot {
	const nodeRows = selectObjects<{
		node_id: string;
		kind: StoryNode['kind'];
		title: string;
		summary: string;
		parent_node_ids: string;
		difficulty: string | null;
		activated_at: string | null;
		completed_at: string | null;
	}>(database, 'SELECT * FROM story_nodes WHERE part_id = $partId', { partId });

	const nodes = nodeRows.length
		? nodeRows.map((row) => {
				const kind: StoryNode['kind'] = row.kind === 'encounter' ? 'encounter' : 'exploration';
				const node: StoryNode = {
					node_id: row.node_id,
					kind,
					title: row.title,
					summary: row.summary,
					parent_node_ids: JSON.parse(row.parent_node_ids) as string[],
					activated_at: row.activated_at ?? null,
					completed_at: row.completed_at ?? null
				};

				if (kind === 'encounter') {
					node.difficulty = row.difficulty ?? null;
				}

				return node;
			})
		: null;

	const nodeLayoutRow = selectObjects<{ layout_json: string }>(
		database,
		'SELECT layout_json FROM part_node_layouts WHERE part_id = $partId LIMIT 1',
		{ partId }
	)[0];
	const itemLayoutRow = selectObjects<{ layout_json: string }>(
		database,
		'SELECT layout_json FROM part_item_layouts WHERE part_id = $partId LIMIT 1',
		{ partId }
	)[0];

	return {
		nodes,
		nodeLayout: nodeLayoutRow ? (JSON.parse(nodeLayoutRow.layout_json) as PartNodeLayout) : null,
		itemLayout: itemLayoutRow ? (JSON.parse(itemLayoutRow.layout_json) as PartItemLayout) : null,
		items: loadPartStoryItems(database, partId)
	};
}

function loadPartStoryItems(database: AppDb, partId: string): StoryItem[] | null {
	const rows = selectObjects<{
		item_id: string;
		parent_node_id: string;
		kind: string;
		label: string;
		is_treasure: number | null;
		is_reward: number | null;
		payload_json: string;
	}>(database, 'SELECT * FROM story_items WHERE part_id = $partId', { partId });

	if (!rows.length) return null;

	return rows.map((row) => {
		const payload = JSON.parse(row.payload_json) as Partial<StoryItem>;
		const kind: StoryItem['kind'] =
			row.kind === 'xp' ||
			row.kind === 'npc' ||
			row.kind === 'money' ||
			row.kind === 'item' ||
			row.kind === 'note' ||
			row.kind === 'map'
				? row.kind
				: 'item';

		return {
			item_id: row.item_id,
			parent_node_id: row.parent_node_id,
			kind,
			label: row.label,
			...payload,
			is_treasure: Boolean(row.is_treasure ?? payload.is_treasure),
			is_reward: Boolean(
				kind === 'xp' ? true : row.is_reward ?? payload.is_reward ?? false
			)
		};
	});
}

function savePartStoryItems(database: AppDb, partId: string, items: StoryItem[]): void {
	execSql(database, {
		sql: 'DELETE FROM story_items WHERE part_id = $partId',
		bind: { partId }
	});

	for (const item of items) {
		execSql(database, {
			sql: `INSERT INTO story_items (
				part_id, item_id, parent_node_id, kind, label, is_treasure, is_reward, payload_json
			) VALUES (
				$part_id, $item_id, $parent_node_id, $kind, $label, $is_treasure, $is_reward, $payload_json
			)`,
			bind: {
				part_id: partId,
				item_id: item.item_id,
				parent_node_id: item.parent_node_id,
				kind: item.kind,
				label: item.label,
				is_treasure: item.is_treasure ? 1 : 0,
				is_reward: item.is_reward ? 1 : 0,
				payload_json: JSON.stringify({
					xp_amount: item.xp_amount,
					character_id: item.character_id,
					gold: item.gold,
					silver: item.silver,
					copper: item.copper,
					catalog_type: item.catalog_type,
					catalog_id: item.catalog_id,
					note_text: item.note_text,
					note_width: item.note_width,
					note_height: item.note_height,
					map_id: item.map_id
				})
			}
		});
	}
}

function savePartStoryNodes(database: AppDb, partId: string, nodes: StoryNode[]): void {
	execSql(database, {
		sql: 'DELETE FROM story_nodes WHERE part_id = $partId',
		bind: { partId }
	});

	for (const node of nodes) {
		execSql(database, {
			sql: `INSERT INTO story_nodes (
				part_id, node_id, kind, title, summary, parent_node_ids, difficulty, activated_at, completed_at
			) VALUES (
				$part_id, $node_id, $kind, $title, $summary, $parent_node_ids, $difficulty, $activated_at, $completed_at
			)`,
			bind: {
				part_id: partId,
				node_id: node.node_id,
				kind: node.kind,
				title: node.title,
				summary: node.summary,
				parent_node_ids: JSON.stringify(node.parent_node_ids ?? []),
				difficulty: node.kind === 'encounter' ? (node.difficulty ?? null) : null,
				activated_at: node.activated_at ?? null,
				completed_at: node.completed_at ?? null
			}
		});
	}
}

function savePartNodeLayout(database: AppDb, partId: string, layout: PartNodeLayout): void {
	execSql(database, {
		sql: `INSERT INTO part_node_layouts (part_id, layout_json) VALUES ($partId, $layout_json)
			ON CONFLICT(part_id) DO UPDATE SET layout_json = excluded.layout_json`,
		bind: { partId, layout_json: JSON.stringify(layout) }
	});
}

function savePartItemLayout(database: AppDb, partId: string, layout: PartItemLayout): void {
	execSql(database, {
		sql: `INSERT INTO part_item_layouts (part_id, layout_json) VALUES ($partId, $layout_json)
			ON CONFLICT(part_id) DO UPDATE SET layout_json = excluded.layout_json`,
		bind: { partId, layout_json: JSON.stringify(layout) }
	});
}

function insertCampaignPlayer(
	database: AppDb,
	campaignId: string,
	ownerUserId: string,
	dateCreated: string,
	player: CreateCampaignPlayerInput
): Character {
	execSql(database, {
		sql: `INSERT INTO users (user_id, email, username, theme, date_created)
			VALUES ($user_id, $email, $username, $theme, $date_created)`,
		bind: {
			user_id: player.user_id,
			email: '',
			username: player.username,
			theme: 'default',
			date_created: dateCreated
		}
	});

	execSql(database, {
		sql: `INSERT INTO characters (
			character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation, notes
		) VALUES (
			$character_id, $campaign_id, $kind, $created_by_user_id, $cloned_from_character_id,
			$display_name, $experience_base, $experience, $level,
			$hp_max_base, $hp_current_base, $hp_current, $hp_max, $reputation, $notes
		)`,
		bind: {
			character_id: player.character_id,
			campaign_id: campaignId,
			kind: 'pc',
			created_by_user_id: ownerUserId,
			cloned_from_character_id: null,
			display_name: player.username,
			experience_base: 0,
			experience: 0,
			level: 1,
			hp_max_base: 0,
			hp_current_base: 0,
			hp_current: 0,
			hp_max: 0,
			reputation: null,
			notes: null
		}
	});

	execSql(database, {
		sql: `INSERT INTO campaign_members (
			player_id, campaign_id, user_id, character_id,
			date_campaign_joined, role, last_played_at
		) VALUES (
			$player_id, $campaign_id, $user_id, $character_id,
			$date_campaign_joined, $role, $last_played_at
		)`,
		bind: {
			player_id: player.player_id,
			campaign_id: campaignId,
			user_id: player.user_id,
			character_id: player.character_id,
			date_campaign_joined: dateCreated,
			role: 'player',
			last_played_at: null
		}
	});

	return {
		character_id: player.character_id,
		campaign_id: campaignId,
		kind: 'pc',
		created_by_user_id: ownerUserId,
		cloned_from_character_id: null,
		display_name: player.username,
		experience_base: 0,
		experience: 0,
		level: 1,
		hp_max_base: 0,
		hp_current_base: 0,
		hp_current: 0,
		hp_max: 0,
		reputation: null,
		notes: null
	};
}

function addCampaignPlayer(
	database: AppDb,
	input: AddCampaignPlayerInput
): AddCampaignPlayerResult {
	const username = input.username.trim();
	if (!username) {
		throw new Error('Player name is required');
	}

	const character = insertCampaignPlayer(
		database,
		input.campaign_id,
		input.owner_user_id,
		input.date_created,
		{
			user_id: input.user_id,
			username,
			player_id: input.player_id,
			character_id: input.character_id
		}
	);

	return {
		user: {
			user_id: input.user_id,
			email: '',
			username,
			theme: 'default',
			date_created: input.date_created,
			date_deleted: null
		},
		character,
		member: {
			player_id: input.player_id,
			campaign_id: input.campaign_id,
			user_id: input.user_id,
			character_id: input.character_id,
			date_campaign_joined: input.date_created,
			role: 'player',
			last_played_at: null
		}
	};
}

function removeCampaignPlayer(database: AppDb, campaignId: string, characterId: string): void {
	const members = selectObjects<{
		player_id: string;
		character_id: string | null;
		role: string;
	}>(
		database,
		`SELECT player_id, character_id, role
		 FROM campaign_members
		 WHERE campaign_id = $campaignId
		   AND character_id = $characterId
		   AND role = 'player'
		 LIMIT 1`,
		{ campaignId, characterId }
	);

	const member = members[0];
	if (!member?.character_id) {
		throw new Error('Player not found in this campaign');
	}

	const characters = selectObjects<{ kind: string }>(
		database,
		`SELECT kind FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId }
	);

	if (characters[0]?.kind !== 'pc') {
		throw new Error('Only player characters can be removed here');
	}

	execSql(database, {
		sql: `DELETE FROM campaign_members WHERE player_id = $playerId AND role = 'player'`,
		bind: { playerId: member.player_id }
	});
}

function addCampaignPcToCampaign(
	database: AppDb,
	input: AddCampaignPcToCampaignInput
): AddCampaignPcToCampaignResult {
	const characterRows = selectObjects<Character>(
		database,
		`SELECT * FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId: input.character_id }
	);
	const character = characterRows[0];

	if (!character || character.kind !== 'pc') {
		throw new Error('Player character not found');
	}

	const alreadyLinked = selectObjects<{ player_id: string }>(
		database,
		`SELECT player_id FROM campaign_members
		 WHERE campaign_id = $campaign_id
		   AND character_id = $character_id
		   AND role = 'player'
		 LIMIT 1`,
		{ campaign_id: input.campaign_id, character_id: input.character_id }
	);

	if (alreadyLinked.length) {
		throw new Error('Player character is already in this campaign');
	}

	const sourceMember = selectObjects<{ user_id: string }>(
		database,
		`SELECT user_id FROM campaign_members
		 WHERE character_id = $character_id AND role = 'player'
		 LIMIT 1`,
		{ character_id: input.character_id }
	)[0];

	if (!sourceMember) {
		throw new Error('Player account link not found for this character');
	}

	execSql(database, {
		sql: `INSERT INTO campaign_members (
			player_id, campaign_id, user_id, character_id,
			date_campaign_joined, role, last_played_at
		) VALUES (
			$player_id, $campaign_id, $user_id, $character_id,
			$date_campaign_joined, $role, $last_played_at
		)`,
		bind: {
			player_id: input.player_id,
			campaign_id: input.campaign_id,
			user_id: sourceMember.user_id,
			character_id: input.character_id,
			date_campaign_joined: input.date_campaign_joined,
			role: 'player',
			last_played_at: null
		}
	});

	return {
		character,
		member: {
			player_id: input.player_id,
			campaign_id: input.campaign_id,
			user_id: sourceMember.user_id,
			character_id: input.character_id,
			date_campaign_joined: input.date_campaign_joined,
			role: 'player',
			last_played_at: null
		}
	};
}

function createCampaign(database: AppDb, input: CreateCampaignInput): void {
	execSql(database, {
		sql: `INSERT INTO campaigns (
			campaign_id, owner_user_id, campaign_name, description,
			game_schema, theme, date_created, date_deleted
		) VALUES (
			$campaign_id, $owner_user_id, $campaign_name, $description,
			$game_schema, $theme, $date_created, $date_deleted
		)`,
		bind: {
			campaign_id: input.campaign_id,
			owner_user_id: input.owner_user_id,
			campaign_name: input.campaign_name,
			description: input.description,
			game_schema: input.game_schema,
			theme: 'default',
			date_created: input.date_created,
			date_deleted: null
		}
	});

	execSql(database, {
		sql: `INSERT INTO campaign_members (
			player_id, campaign_id, user_id, character_id,
			date_campaign_joined, role, last_played_at
		) VALUES (
			$player_id, $campaign_id, $user_id, $character_id,
			$date_campaign_joined, $role, $last_played_at
		)`,
		bind: {
			player_id: input.player_id,
			campaign_id: input.campaign_id,
			user_id: input.owner_user_id,
			character_id: null,
			date_campaign_joined: input.date_created,
			role: 'gm',
			last_played_at: null
		}
	});

	for (const player of input.players) {
		insertCampaignPlayer(
			database,
			input.campaign_id,
			input.owner_user_id,
			input.date_created,
			player
		);
	}
}

function createAdventure(database: AppDb, input: CreateAdventureInput): void {
	execSql(database, {
		sql: `INSERT INTO adventures (
			adventure_id, campaign_id, name, overview, adventure_hook,
			can_promote_to_campaign, date_created
		) VALUES (
			$adventure_id, $campaign_id, $name, $overview, $adventure_hook,
			$can_promote_to_campaign, $date_created
		)`,
		bind: {
			adventure_id: input.adventure_id,
			campaign_id: input.campaign_id,
			name: input.name,
			overview: input.overview,
			adventure_hook: input.adventure_hook,
			can_promote_to_campaign: input.can_promote_to_campaign ? 1 : 0,
			date_created: input.date_created
		}
	});
}

function updateAdventurePromote(database: AppDb, adventureId: string, canPromote: boolean): void {
	execSql(database, {
		sql: `UPDATE adventures
			SET can_promote_to_campaign = $can_promote_to_campaign
			WHERE adventure_id = $adventure_id`,
		bind: {
			can_promote_to_campaign: canPromote ? 1 : 0,
			adventure_id: adventureId
		}
	});
}

function updateUserTheme(database: AppDb, userId: string, theme: string): void {
	execSql(database, {
		sql: `UPDATE users SET theme = $theme WHERE user_id = $user_id`,
		bind: { user_id: userId, theme }
	});
}

function softDeletePlayer(database: AppDb, userId: string): string {
	const rows = selectObjects<{ date_deleted: string | null }>(
		database,
		`SELECT date_deleted FROM users WHERE user_id = $userId LIMIT 1`,
		{ userId }
	);

	if (!rows[0]) {
		throw new Error('Player not found');
	}

	if (rows[0].date_deleted) {
		throw new Error('Player has already been removed from the playerbase');
	}

	const playerMembership = selectObjects<{ player_id: string }>(
		database,
		`SELECT player_id FROM campaign_members
		 WHERE user_id = $userId AND role = 'player'
		 LIMIT 1`,
		{ userId }
	);

	if (!playerMembership[0]) {
		throw new Error('Only player accounts can be removed from the playerbase');
	}

	const deletedAt = new Date().toISOString();

	execSql(database, {
		sql: `UPDATE users SET date_deleted = $date_deleted WHERE user_id = $user_id`,
		bind: {
			user_id: userId,
			date_deleted: deletedAt
		}
	});

	return deletedAt;
}

function updateCampaignTheme(database: AppDb, campaignId: string, theme: string): void {
	execSql(database, {
		sql: `UPDATE campaigns SET theme = $theme WHERE campaign_id = $campaign_id`,
		bind: { campaign_id: campaignId, theme }
	});
}

function updateCampaignDetails(
	database: AppDb,
	input: UpdateCampaignDetailsInput
): import('$lib/types/schema').Campaign {
	const rows = selectObjects<import('$lib/types/schema').Campaign>(
		database,
		`SELECT * FROM campaigns WHERE campaign_id = $campaign_id LIMIT 1`,
		{ campaign_id: input.campaign_id }
	);

	const existing = rows[0];
	if (!existing) {
		throw new Error('Campaign not found');
	}

	const campaignName = input.campaign_name.trim();
	if (!campaignName) {
		throw new Error('Campaign name is required');
	}

	const description = input.description?.trim() || null;

	execSql(database, {
		sql: `UPDATE campaigns
			SET campaign_name = $campaign_name, description = $description
			WHERE campaign_id = $campaign_id`,
		bind: {
			campaign_id: input.campaign_id,
			campaign_name: campaignName,
			description
		}
	});

	return {
		...existing,
		campaign_name: campaignName,
		description
	};
}

function syncAdventureParts(database: AppDb, adventureId: string, parts: Part[]): void {
	const existing = selectObjects<{ part_id: string }>(
		database,
		'SELECT part_id FROM parts WHERE adventure_id = $adventureId',
		{ adventureId }
	);
	const nextIds = new Set(parts.map((part) => part.part_id));
	const removedIds = existing.map((row) => row.part_id).filter((partId) => !nextIds.has(partId));

	for (const partId of removedIds) {
		execSql(database, { sql: 'DELETE FROM story_nodes WHERE part_id = $partId', bind: { partId } });
		execSql(database, {
			sql: 'DELETE FROM part_node_layouts WHERE part_id = $partId',
			bind: { partId }
		});
		execSql(database, {
			sql: 'DELETE FROM part_item_layouts WHERE part_id = $partId',
			bind: { partId }
		});
		execSql(database, { sql: 'DELETE FROM story_items WHERE part_id = $partId', bind: { partId } });
		execSql(database, { sql: 'DELETE FROM parts WHERE part_id = $partId', bind: { partId } });
	}

	for (const part of parts) {
		execSql(database, {
			sql: `INSERT INTO parts (
				part_id, adventure_id, title, summary,
				session_duration, sort_order
			) VALUES (
				$part_id, $adventure_id, $title, $summary,
				$session_duration, $sort_order
			)
			ON CONFLICT(part_id) DO UPDATE SET
				title = excluded.title,
				summary = excluded.summary,
				session_duration = excluded.session_duration,
				sort_order = excluded.sort_order`,
			bind: part
		});
	}
}

function activateStoryNode(database: AppDb, partId: string, nodeId: string): string {
	const now = new Date().toISOString();

	execSql(database, {
		sql: `UPDATE story_nodes
			SET activated_at = $activated_at
			WHERE part_id = $part_id AND node_id = $node_id`,
		bind: {
			activated_at: now,
			part_id: partId,
			node_id: nodeId
		}
	});

	return now;
}

function toggleStoryNodeCompleted(database: AppDb, partId: string, nodeId: string): string | null {
	const rows = selectObjects<{ completed_at: string | null }>(
		database,
		`SELECT completed_at FROM story_nodes WHERE part_id = $part_id AND node_id = $node_id LIMIT 1`,
		{ part_id: partId, node_id: nodeId }
	);
	const completedAt = rows[0]?.completed_at ? null : new Date().toISOString();

	execSql(database, {
		sql: `UPDATE story_nodes
			SET completed_at = $completed_at
			WHERE part_id = $part_id AND node_id = $node_id`,
		bind: {
			completed_at: completedAt,
			part_id: partId,
			node_id: nodeId
		}
	});

	return completedAt;
}

function cloneCharacterFromDb(
	database: AppDb,
	sourceCharacterId: string,
	newCharacterId: string,
	newCampaignId: string,
	createdByUserId: string
): void {
	const source = selectObjects<{
		kind: string;
		display_name: string;
		experience_base: number;
		experience: number;
		level: number;
		hp_max_base: number;
		hp_current_base: number;
		hp_current: number;
		hp_max: number;
		reputation: string | null;
		notes: string | null;
	}>(
		database,
		`SELECT kind, display_name, experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation, notes
		 FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId: sourceCharacterId }
	)[0];

	if (!source) return;

	execSql(database, {
		sql: `INSERT INTO characters (
			character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation, notes
		) VALUES (
			$character_id, $campaign_id, $kind, $created_by_user_id, $cloned_from_character_id,
			$display_name, $experience_base, $experience, $level,
			$hp_max_base, $hp_current_base, $hp_current, $hp_max, $reputation, $notes
		)`,
		bind: {
			character_id: newCharacterId,
			campaign_id: newCampaignId,
			kind: normalizeCharacterKind(source.kind),
			created_by_user_id: createdByUserId,
			cloned_from_character_id: sourceCharacterId,
			display_name: source.display_name,
			experience_base: source.experience_base,
			experience: source.experience,
			level: source.level,
			hp_max_base: source.hp_max_base,
			hp_current_base: source.hp_current_base,
			hp_current: source.hp_current,
			hp_max: source.hp_max,
			reputation: source.reputation,
			notes: source.notes
		}
	});

	const weaponIds = selectObjects<{ weapon_id: string }>(
		database,
		'SELECT weapon_id FROM character_weapons WHERE character_id = $characterId',
		{ characterId: sourceCharacterId }
	).map((row) => row.weapon_id);
	const armorIds = selectObjects<{ armor_id: string }>(
		database,
		'SELECT armor_id FROM character_armor WHERE character_id = $characterId',
		{ characterId: sourceCharacterId }
	).map((row) => row.armor_id);
	const itemIds = selectObjects<{ item_id: string }>(
		database,
		'SELECT item_id FROM character_items WHERE character_id = $characterId',
		{ characterId: sourceCharacterId }
	).map((row) => row.item_id);
	const spellIds = selectObjects<{ spell_id: string }>(
		database,
		'SELECT spell_id FROM character_spells WHERE character_id = $characterId',
		{ characterId: sourceCharacterId }
	).map((row) => row.spell_id);

	if (weaponIds.length || armorIds.length || itemIds.length || spellIds.length) {
		attachCharacterLoadout(database, newCharacterId, {
			weapon_ids: weaponIds,
			armor_ids: armorIds,
			item_ids: itemIds,
			spell_ids: spellIds
		});
	}
}

function cloneMapFromDb(
	database: AppDb,
	sourceMapId: string,
	newMapId: string,
	newCampaignId: string
): void {
	const source = selectObjects<{
		name: string;
		mime_type: string | null;
		full_width: number | null;
		full_height: number | null;
		thumb_width: number | null;
		thumb_height: number | null;
		thumb_blob: Uint8Array | null;
		full_blob: Uint8Array | null;
		created_at: string | null;
		layout_mode: string | null;
	}>(
		database,
		`SELECT name, mime_type, full_width, full_height, thumb_width, thumb_height,
			thumb_blob, full_blob, created_at, layout_mode
		 FROM maps WHERE map_id = $mapId LIMIT 1`,
		{ mapId: sourceMapId }
	)[0];

	if (!source?.thumb_blob || !source.full_blob) return;

	execSql(database, {
		sql: `INSERT INTO maps (
			map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height,
			thumb_blob, full_blob, created_at, layout_mode
		) VALUES (
			$map_id, $campaign_id, $name, $mime_type, $full_width, $full_height, $thumb_width, $thumb_height,
			$thumb_blob, $full_blob, $created_at, $layout_mode
		)`,
		bind: {
			map_id: newMapId,
			campaign_id: newCampaignId,
			name: source.name,
			mime_type: source.mime_type,
			full_width: source.full_width,
			full_height: source.full_height,
			thumb_width: source.thumb_width,
			thumb_height: source.thumb_height,
			thumb_blob: source.thumb_blob,
			full_blob: source.full_blob,
			created_at: source.created_at ?? new Date().toISOString(),
			layout_mode: source.layout_mode ?? 'popup'
		}
	});
}

function promoteAdventureToCampaign(
	database: AppDb,
	input: PromoteAdventureInput
): PromoteAdventureResult {
	const adventure = selectObjects<{
		adventure_id: string;
		campaign_id: string;
		name: string;
		overview: string | null;
		adventure_hook: string | null;
		can_promote_to_campaign: number;
	}>(database, 'SELECT * FROM adventures WHERE adventure_id = $adventure_id LIMIT 1', {
		adventure_id: input.adventure_id
	})[0];

	if (!adventure) {
		throw new Error('Adventure not found');
	}

	if (!adventure.can_promote_to_campaign) {
		throw new Error('Adventure is not eligible for promotion');
	}

	const sourceCampaign = selectObjects<{
		campaign_id: string;
		game_schema: string;
		theme: string;
	}>(
		database,
		'SELECT campaign_id, game_schema, theme FROM campaigns WHERE campaign_id = $campaign_id LIMIT 1',
		{ campaign_id: adventure.campaign_id }
	)[0];

	if (!sourceCampaign) {
		throw new Error('Campaign not found');
	}

	const now = new Date().toISOString();
	const newCampaignId = `cmp-${crypto.randomUUID()}`;
	const newAdventureId = `adv-${crypto.randomUUID()}`;
	const gmPlayerId = `mbr-${crypto.randomUUID()}`;

	execSql(database, {
		sql: `INSERT INTO campaigns (
			campaign_id, owner_user_id, campaign_name, description,
			game_schema, theme, date_created, date_deleted
		) VALUES (
			$campaign_id, $owner_user_id, $campaign_name, $description,
			$game_schema, $theme, $date_created, $date_deleted
		)`,
		bind: {
			campaign_id: newCampaignId,
			owner_user_id: input.owner_user_id,
			campaign_name: adventure.name,
			description: adventure.overview,
			game_schema: sourceCampaign.game_schema,
			theme: sourceCampaign.theme,
			date_created: now,
			date_deleted: null
		}
	});

	execSql(database, {
		sql: `INSERT INTO campaign_members (
			player_id, campaign_id, user_id, character_id,
			date_campaign_joined, role, last_played_at
		) VALUES (
			$player_id, $campaign_id, $user_id, $character_id,
			$date_campaign_joined, $role, $last_played_at
		)`,
		bind: {
			player_id: gmPlayerId,
			campaign_id: newCampaignId,
			user_id: input.owner_user_id,
			character_id: null,
			date_campaign_joined: now,
			role: 'gm',
			last_played_at: now
		}
	});

	const characterIdMap = new Map<string, string>();
	const mapIdMap = new Map<string, string>();

	if (input.options.copyNpcs) {
		const npcs = selectObjects<{ character_id: string }>(
			database,
			`SELECT cn.character_id
			 FROM campaign_npcs cn
			 INNER JOIN characters c ON c.character_id = cn.character_id
			 WHERE cn.campaign_id = $campaign_id
			   AND c.kind IN ('npc_general', 'npc_foe')`,
			{ campaign_id: adventure.campaign_id }
		);

		for (const npc of npcs) {
			const newCharacterId = `chr-${crypto.randomUUID()}`;
			characterIdMap.set(npc.character_id, newCharacterId);
			cloneCharacterFromDb(
				database,
				npc.character_id,
				newCharacterId,
				newCampaignId,
				input.owner_user_id
			);
			insertCampaignNpcLink(
				database,
				newCampaignId,
				newCharacterId,
				`cnpc-${crypto.randomUUID()}`,
				now
			);
		}
	}

	if (input.options.copyMaps) {
		const maps = selectObjects<{ map_id: string }>(
			database,
			'SELECT map_id FROM maps WHERE campaign_id = $campaign_id',
			{ campaign_id: adventure.campaign_id }
		);

		for (const map of maps) {
			const newMapId = `map-${crypto.randomUUID()}`;
			mapIdMap.set(map.map_id, newMapId);
			cloneMapFromDb(database, map.map_id, newMapId, newCampaignId);
		}
	}

	createAdventure(database, {
		adventure_id: newAdventureId,
		campaign_id: newCampaignId,
		name: adventure.name,
		overview: adventure.overview,
		adventure_hook: adventure.adventure_hook,
		can_promote_to_campaign: false,
		date_created: now
	});

	const sourceParts = selectObjects<Part>(
		database,
		`SELECT * FROM parts WHERE adventure_id = $adventure_id ORDER BY sort_order`,
		{ adventure_id: input.adventure_id }
	);
	const newPartIds: string[] = [];

	for (const sourcePart of sourceParts) {
		const newPartId = `part-${crypto.randomUUID()}`;
		newPartIds.push(newPartId);

		execSql(database, {
			sql: `INSERT INTO parts (
				part_id, adventure_id, title, summary,
				session_duration, sort_order
			) VALUES (
				$part_id, $adventure_id, $title, $summary,
				$session_duration, $sort_order
			)`,
			bind: {
				part_id: newPartId,
				adventure_id: newAdventureId,
				title: sourcePart.title,
				summary: sourcePart.summary,
				session_duration: sourcePart.session_duration,
				sort_order: sourcePart.sort_order
			}
		});

		const story = loadPartStory(database, sourcePart.part_id);
		const nodeIdMap = new Map<string, string>();
		const itemIdMap = new Map<string, string>();

		for (const node of story.nodes ?? []) {
			nodeIdMap.set(node.node_id, `node-${crypto.randomUUID()}`);
		}

		for (const item of story.items ?? []) {
			if (isRewardGroupId(item.item_id)) continue;
			itemIdMap.set(item.item_id, `item-${crypto.randomUUID()}`);
		}

		const nodes = story.nodes ? remapStoryNodes(story.nodes, nodeIdMap) : [];
		if (nodes.length) {
			savePartStoryNodes(database, newPartId, nodes);
		}

		const nodeLayout = remapNodeLayout(story.nodeLayout, nodeIdMap);
		if (nodeLayout && Object.keys(nodeLayout).length) {
			savePartNodeLayout(database, newPartId, nodeLayout);
		}

		const itemLayout = remapItemLayout(story.itemLayout, itemIdMap, nodeIdMap);
		if (itemLayout && Object.keys(itemLayout).length) {
			savePartItemLayout(database, newPartId, itemLayout);
		}

		const items = story.items
			? remapStoryItems(story.items, nodeIdMap, itemIdMap, characterIdMap, mapIdMap, input.options)
			: [];
		if (items.length) {
			savePartStoryItems(database, newPartId, items);
		}
	}

	touchCampaign(database, input.owner_user_id, newCampaignId);

	return {
		campaign_id: newCampaignId,
		adventure_id: newAdventureId,
		part_ids: newPartIds
	};
}

function touchCampaign(database: AppDb, userId: string, campaignId: string): void {
	const now = new Date().toISOString();

	execSql(database, {
		sql: `UPDATE campaign_members
			SET last_played_at = $last_played_at
			WHERE user_id = $user_id AND campaign_id = $campaign_id`,
		bind: {
			last_played_at: now,
			user_id: userId,
			campaign_id: campaignId
		}
	});
}

function exportDatabase(database: AppDb, module: SqliteModule): ArrayBuffer {
	const bytes = module.capi.sqlite3_js_db_export(database);
	return bytes.slice().buffer;
}

async function importDatabase(module: SqliteModule, buffer: ArrayBuffer): Promise<void> {
	if (db) {
		db.close();
		db = null;
	}

	if (isOpfsAvailable(module)) {
		try {
			await module.oo1.OpfsDb.importDb(DB_FILENAME, buffer);
			db = new module.oo1.OpfsDb(DB_FILENAME, 'c');
			runMigrations(db);
			repairMissingRequiredTables(db);
			repairSchemaColumns(db);
			verifyRequiredTables(db);
			return;
		} catch (cause) {
			console.warn('[dm-deputy] OPFS import failed, using in-memory copy', cause);
		}
	}

	db = deserializeDatabaseFromBuffer(module, buffer);
	runMigrations(db);
	repairMissingRequiredTables(db);
	repairSchemaColumns(db);
	verifyRequiredTables(db);
}

async function handleRequest(request: WorkerRequest): Promise<WorkerResponse> {
	try {
		switch (request.method) {
			case 'init': {
				const result = await initDatabase(request.args[0], request.args[1]);
				return { id: request.id, result };
			}
			case 'loadCampaignSnapshot': {
				return { id: request.id, result: loadCampaignSnapshot(getDb()) };
			}
			case 'loadCatalogSnapshot': {
				return { id: request.id, result: loadCatalogSnapshot(getDb()) };
			}
			case 'loadPartStory': {
				return { id: request.id, result: loadPartStory(getDb(), request.args[0]) };
			}
			case 'savePartStoryNodes': {
				savePartStoryNodes(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'savePartNodeLayout': {
				savePartNodeLayout(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'savePartItemLayout': {
				savePartItemLayout(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'savePartStoryItems': {
				savePartStoryItems(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'createCampaign': {
				createCampaign(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'createAdventure': {
				createAdventure(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'syncAdventureParts': {
				syncAdventureParts(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'activateStoryNode': {
				const activatedAt = activateStoryNode(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: activatedAt };
			}
			case 'toggleStoryNodeCompleted': {
				const completedAt = toggleStoryNodeCompleted(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: completedAt };
			}
			case 'updateAdventurePromote': {
				updateAdventurePromote(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'updateUserTheme': {
				updateUserTheme(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'softDeletePlayer': {
				const deletedAt = softDeletePlayer(getDb(), request.args[0]);
				return { id: request.id, result: deletedAt };
			}
			case 'updateCampaignTheme': {
				updateCampaignTheme(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'updateCampaignDetails': {
				const campaign = updateCampaignDetails(getDb(), request.args[0]);
				return { id: request.id, result: campaign };
			}
			case 'touchCampaign': {
				touchCampaign(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'exportDatabase': {
				const buffer = exportDatabase(getDb(), sqlite3!);
				return { id: request.id, result: null, buffer };
			}
			case 'importDatabase': {
				await importDatabase(sqlite3!, request.args[0]);
				return { id: request.id, result: null };
			}
			case 'createCampaignMap': {
				const map = createCampaignMap(getDb(), request.args[0], request.args[1], request.args[2]);
				return { id: request.id, result: map };
			}
			case 'deleteCampaignMap': {
				deleteCampaignMap(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'loadCampaignMapBlob': {
				const buffer = loadCampaignMapBlob(getDb(), request.args[0], request.args[1]);
				if (!buffer) {
					return { id: request.id, result: null };
				}

				return { id: request.id, result: null, buffer };
			}
			case 'createCampaignCharacter': {
				const character = createCampaignCharacter(getDb(), request.args[0]);
				return { id: request.id, result: character };
			}
			case 'updateCampaignCharacter': {
				const character = updateCampaignCharacter(getDb(), request.args[0]);
				return { id: request.id, result: character };
			}
			case 'loadCharacterStatEvents': {
				const events = loadCharacterStatEvents(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: events };
			}
			case 'insertCharacterStatEvent': {
				const event = insertCharacterStatEvent(getDb(), request.args[0]);
				return { id: request.id, result: event };
			}
			case 'insertEncounterResolution': {
				const resolution = insertEncounterResolution(getDb(), request.args[0]);
				return { id: request.id, result: resolution };
			}
			case 'getEncounterResolutionByEventId': {
				const resolution = getEncounterResolutionByEventId(getDb(), request.args[0]);
				return { id: request.id, result: resolution };
			}
			case 'getEncounterResolutionEventIds': {
				const eventIds = getEncounterResolutionEventIds(getDb(), request.args[0]);
				return { id: request.id, result: eventIds };
			}
			case 'loadEncounterXpAwardsByEventIds': {
				const awards = loadEncounterXpAwardsByEventIds(getDb(), request.args[0]);
				return { id: request.id, result: awards };
			}
			case 'updateCharacterStatCache': {
				const character = updateCharacterStatCache(getDb(), request.args[0]);
				return { id: request.id, result: character };
			}
			case 'loadCharacterLoadout': {
				const loadout = loadCharacterLoadout(getDb(), request.args[0]);
				return { id: request.id, result: loadout };
			}
			case 'addCampaignPlayer': {
				const result = addCampaignPlayer(getDb(), request.args[0]);
				return { id: request.id, result: result };
			}
			case 'removeCampaignPlayer': {
				removeCampaignPlayer(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'addCampaignPcToCampaign': {
				const result = addCampaignPcToCampaign(getDb(), request.args[0]);
				return { id: request.id, result: result };
			}
			case 'addCampaignNpcToCampaign': {
				const result = addCampaignNpcToCampaign(getDb(), request.args[0]);
				return { id: request.id, result: result };
			}
			case 'removeCampaignNpcFromCampaign': {
				removeCampaignNpcFromCampaign(getDb(), request.args[0], request.args[1]);
				return { id: request.id, result: null };
			}
			case 'promoteAdventureToCampaign': {
				const result = promoteAdventureToCampaign(getDb(), request.args[0]);
				return { id: request.id, result: result };
			}
			case 'upsertSpell': {
				upsertSpell(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'deleteSpell': {
				deleteSpell(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'upsertWeapon': {
				upsertWeapon(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'deleteWeapon': {
				deleteWeapon(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'upsertArmor': {
				upsertArmor(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'deleteArmor': {
				deleteArmor(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'upsertItem': {
				upsertItem(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			case 'deleteItem': {
				deleteItem(getDb(), request.args[0]);
				return { id: request.id, result: null };
			}
			default: {
				const unknownRequest = request as WorkerRequest;
				return {
					id: unknownRequest.id,
					error: `Unknown method: ${(unknownRequest as { method: string }).method}`
				};
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { id: request.id, error: message };
	}
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const response = await handleRequest(event.data);
	if ('buffer' in response && response.buffer) {
		self.postMessage(response, [response.buffer]);
	} else {
		self.postMessage(response);
	}
};

export {};
