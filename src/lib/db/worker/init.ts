import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { REPAIR_MIGRATION_VERSIONS, SCHEMA_VERSION } from '../migrations';
import { ensureDefaultUser } from '../seed';
import { execSql, selectObjects } from '../bind';
import type { InitResult, LocalStorageStoryMigration } from '../types';
import {
	DB_FILENAME,
	asDbExec,
	getDb,
	getSqlite3,
	isOpfsAvailable,
	setDb,
	setSqlite3,
	type AppDb,
	type MemoryDb,
	type SqliteModule
} from './context';
import { savePartItemLayout, savePartNodeLayout, savePartStoryNodes } from './part-story';
import { applyMigration, repairSchemaColumns, tableExists } from './schema-repair';
import { DEFAULT_SPECIES } from '$lib/games/dnd5e/data/default-species';

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
	'part_npcs',
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
	'items',
	'conditions',
	'species',
	'species_traits',
	'species_trait_effects'
] as const;

export function countCampaigns(database: AppDb): number {
	const rows = selectObjects<{ count: number }>(
		database,
		`SELECT COUNT(*) AS count FROM campaigns WHERE date_deleted IS NULL`
	);
	return rows[0]?.count ?? 0;
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

function copyCatalogTable(source: AppDb, destination: AppDb, table: string): void {
	const rows = selectObjects<Record<string, unknown>>(source, `SELECT * FROM ${table}`);
	if (rows.length === 0) return;

	const firstRow = rows[0];
	if (!firstRow) return;

	const columns = Object.keys(firstRow);
	const columnList = columns.join(', ');
	const placeholders = columns.map((column) => `$${column}`).join(', ');

	for (const row of rows) {
		execSql(destination, {
			sql: `INSERT OR IGNORE INTO ${table} (${columnList}) VALUES (${placeholders})`,
			bind: row
		});
	}
}

function ensureSpeciesSeeded(database: AppDb, templateBuffer: ArrayBuffer): void {
	if (!tableExists(database, 'species')) {
		return;
	}

	if (countTableRows(database, 'species') === 0) {
		const module = getSqlite3();
		if (!module) {
			throw new Error('SQLite module not initialized');
		}

		const templateDatabase = deserializeDatabaseFromBuffer(module, templateBuffer);

		try {
			for (const table of ['species', 'species_traits', 'species_trait_effects'] as const) {
				if (!tableExists(templateDatabase, table)) continue;
				copyCatalogTable(templateDatabase, database, table);
			}
		} finally {
			templateDatabase.close();
		}
	}

	for (const species of DEFAULT_SPECIES) {
		execSql(database, {
			sql: `INSERT OR IGNORE INTO species (
				species_id, species_name, creature_type, size, speed, description
			) VALUES (
				$species_id, $species_name, $creature_type, $size, $speed, $description
			)`,
			bind: {
				species_id: species.species_id,
				species_name: species.species_name,
				creature_type: species.creature_type,
				size: species.size,
				speed: species.speed,
				description: species.description
			}
		});
	}
}

function ensureCatalogSeeded(database: AppDb, templateBuffer: ArrayBuffer): void {
	if (!tableExists(database, 'weapons') || countTableRows(database, 'weapons') > 0) {
		return;
	}

	const module = getSqlite3();
	if (!module) {
		throw new Error('SQLite module not initialized');
	}

	const templateDatabase = deserializeDatabaseFromBuffer(module, templateBuffer);

	try {
		for (const table of [
			'catalog_meta',
			'spells',
			'weapons',
			'armor',
			'items',
			'conditions',
			'skills',
			'species',
			'species_traits',
			'species_trait_effects'
		] as const) {
			if (!tableExists(templateDatabase, table)) continue;
			copyCatalogTable(templateDatabase, database, table);
		}
	} finally {
		templateDatabase.close();
	}
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

export async function initDatabase(
	migrations: LocalStorageStoryMigration[],
	templateBuffer: ArrayBuffer
): Promise<InitResult> {
	const sqliteModule = await sqlite3InitModule();
	setSqlite3(sqliteModule);
	const { database, persistent } = await openDatabaseFromTemplate(sqliteModule, templateBuffer);
	setDb(database);
	runMigrations(getDb());
	repairMissingRequiredTables(getDb());
	repairSchemaColumns(getDb());
	ensureCatalogSeeded(getDb(), templateBuffer);
	ensureSpeciesSeeded(getDb(), templateBuffer);
	verifyRequiredTables(getDb());

	const wasSeeded = isSeeded(getDb());
	ensureDefaultUser(asDbExec(getDb()));

	migrateLocalStorageStory(getDb(), migrations);

	return {
		schemaVersion: SCHEMA_VERSION,
		seeded: !wasSeeded,
		campaignCount: countCampaigns(getDb()),
		persistent
	};
}

export function migrateLocalStorageStory(
	database: AppDb,
	migrations: LocalStorageStoryMigration[]
): void {
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

export function exportDatabase(database: AppDb, module: SqliteModule): ArrayBuffer {
	const bytes = module.capi.sqlite3_js_db_export(database);
	return bytes.slice().buffer;
}

export async function importDatabase(module: SqliteModule, buffer: ArrayBuffer): Promise<void> {
	try {
		getDb().close();
	} catch {
		// Database may already be closed.
	}
	setDb(null);

	if (isOpfsAvailable(module)) {
		try {
			await module.oo1.OpfsDb.importDb(DB_FILENAME, buffer);
			setDb(new module.oo1.OpfsDb(DB_FILENAME, 'c'));
			runMigrations(getDb());
			repairMissingRequiredTables(getDb());
			repairSchemaColumns(getDb());
			verifyRequiredTables(getDb());
			return;
		} catch (cause) {
			console.warn('[dm-deputy] OPFS import failed, using in-memory copy', cause);
		}
	}

	setDb(deserializeDatabaseFromBuffer(module, buffer));
	runMigrations(getDb());
	repairMissingRequiredTables(getDb());
	repairSchemaColumns(getDb());
	verifyRequiredTables(getDb());
}
