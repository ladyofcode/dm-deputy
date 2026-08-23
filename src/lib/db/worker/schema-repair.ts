import { MIGRATIONS, MEDIA_ASSETS_TABLE_SQL } from '../migrations';
import { execSql, selectObjects } from '../bind';
import { safeJsonParse } from '../json';
import type { StoryItem } from '$lib/types/schema';
import type { AppDb } from './context';

export function tableExists(database: AppDb, table: string): boolean {
	const rows = selectObjects<{ name: string }>(
		database,
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1`,
		{ name: table }
	);
	return rows.length > 0;
}

export function tableHasColumn(database: AppDb, table: string, column: string): boolean {
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
		const payload = safeJsonParse<Partial<StoryItem>>(row.payload_json, {});

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

function repairCharactersSoftDeleteColumn(database: AppDb): void {
	if (!tableExists(database, 'characters')) {
		return;
	}

	addColumnIfMissing(database, 'characters', 'date_deleted', 'TEXT');
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

function repairCharacterSheetColumns(database: AppDb): void {
	if (!tableExists(database, 'characters')) {
		return;
	}

	addColumnIfMissing(database, 'characters', 'race', 'TEXT');
	addColumnIfMissing(database, 'characters', 'alignment', 'TEXT');
	addColumnIfMissing(database, 'characters', 'age', 'TEXT');
	addColumnIfMissing(database, 'characters', 'class_name', 'TEXT');
	addColumnIfMissing(database, 'characters', 'role_label', 'TEXT');
	addColumnIfMissing(database, 'characters', 'mime_type', 'TEXT');
	addColumnIfMissing(database, 'characters', 'portrait_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'portrait_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'thumb_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'thumb_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'thumb_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'full_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'image_source', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation_mime_type', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_thumb_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_thumb_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_image_source', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation_thumb_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'presentation_full_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'original_mime_type', 'TEXT');
	addColumnIfMissing(database, 'characters', 'original_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'original_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'original_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'thumb_crop_json', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation_original_mime_type', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation_original_width', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_original_height', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'presentation_original_blob', 'BLOB');
	addColumnIfMissing(database, 'characters', 'presentation_thumb_crop_json', 'TEXT');
	addColumnIfMissing(database, 'characters', 'presentation', 'TEXT');
	addColumnIfMissing(database, 'characters', 'creature_type', 'TEXT');
	addColumnIfMissing(database, 'characters', 'armor_class', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'armor_class_notes', 'TEXT');
	addColumnIfMissing(database, 'characters', 'speed', 'TEXT');
	addColumnIfMissing(database, 'characters', 'hp_dice', 'TEXT');
	addColumnIfMissing(database, 'characters', 'ability_str', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'ability_dex', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'ability_con', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'ability_int', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'ability_wis', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'ability_cha', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'skills', 'TEXT');
	addColumnIfMissing(database, 'characters', 'senses', 'TEXT');
	addColumnIfMissing(database, 'characters', 'languages', 'TEXT');
	addColumnIfMissing(database, 'characters', 'challenge_rating', 'TEXT');
	addColumnIfMissing(database, 'characters', 'traits', 'TEXT');
	addColumnIfMissing(database, 'characters', 'actions', 'TEXT');
	addColumnIfMissing(database, 'characters', 'is_spellcaster', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(database, 'characters', 'spellcasting_class', 'TEXT');
	addColumnIfMissing(database, 'characters', 'spellcasting_ability', 'TEXT');
	addColumnIfMissing(database, 'characters', 'spell_slots_total_json', 'TEXT');
	addColumnIfMissing(database, 'characters', 'spell_slots_expended_json', 'TEXT');
	addColumnIfMissing(database, 'characters', 'background', 'TEXT');
	addColumnIfMissing(database, 'characters', 'height', 'TEXT');
	addColumnIfMissing(database, 'characters', 'weight', 'TEXT');
	addColumnIfMissing(database, 'characters', 'eyes', 'TEXT');
	addColumnIfMissing(database, 'characters', 'skin', 'TEXT');
	addColumnIfMissing(database, 'characters', 'hair', 'TEXT');
	addColumnIfMissing(database, 'characters', 'inspiration', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(database, 'characters', 'initiative', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'temp_hp', 'INTEGER');
	addColumnIfMissing(database, 'characters', 'hit_dice_remaining', 'TEXT');
	addColumnIfMissing(database, 'characters', 'death_save_successes', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(database, 'characters', 'death_save_failures', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(database, 'characters', 'personality_traits', 'TEXT');
	addColumnIfMissing(database, 'characters', 'ideals', 'TEXT');
	addColumnIfMissing(database, 'characters', 'bonds', 'TEXT');
	addColumnIfMissing(database, 'characters', 'flaws', 'TEXT');
	addColumnIfMissing(database, 'characters', 'backstory', 'TEXT');
	addColumnIfMissing(database, 'characters', 'allies', 'TEXT');
	addColumnIfMissing(database, 'characters', 'features', 'TEXT');
	addColumnIfMissing(database, 'characters', 'proficiencies', 'TEXT');
	addColumnIfMissing(database, 'characters', 'treasure', 'TEXT');
}

function repairCampaignAdventureDisplayColumns(database: AppDb): void {
	if (tableExists(database, 'campaigns')) {
		addColumnIfMissing(database, 'campaigns', 'nickname', 'TEXT');
	}

	if (tableExists(database, 'adventures')) {
		addColumnIfMissing(database, 'adventures', 'shorthand', 'TEXT');
	}
}

function repairMonsterTemplatesTable(database: AppDb): void {
	if (!tableExists(database, 'monster_templates')) {
		applyMigration(database, 36);
	}
}

/** Idempotent — safe to call before any media_assets query (e.g. stale worker after HMR). */
export function ensureMediaAssetsSchema(database: AppDb): void {
	execSql(database, {
		sql: MEDIA_ASSETS_TABLE_SQL
	});

	if (tableExists(database, 'characters')) {
		addColumnIfMissing(database, 'characters', 'portrait_media_id', 'TEXT');
		addColumnIfMissing(database, 'characters', 'presentation_media_id', 'TEXT');
	}

	if (tableExists(database, 'maps')) {
		addColumnIfMissing(database, 'maps', 'media_id', 'TEXT');
	}
}

export function repairSchemaColumns(database: AppDb): void {
	addColumnIfMissing(database, 'story_nodes', 'activated_at', 'TEXT');
	addColumnIfMissing(database, 'story_nodes', 'completed_at', 'TEXT');
	repairStoryItemFlagColumns(database);
	repairMapBlobColumns(database);
	repairCharacterKinds(database);
	repairCampaignNpcsTable(database);
	repairPartsSessionDuration(database);
	repairUsersSoftDeleteColumn(database);
	repairCharactersSoftDeleteColumn(database);
	repairCharacterStatEventDescriptionColumn(database);
	repairStoryNodeXpAwardColumn(database);
	repairCharacterSheetColumns(database);
	repairCampaignAdventureDisplayColumns(database);
	repairMonsterTemplatesTable(database);
	ensureMediaAssetsSchema(database);
}

export function applyMigration(database: AppDb, version: number): void {
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

	if (version === 30) {
		repairCampaignAdventureDisplayColumns(database);
		return;
	}

	if (version === 33 || version === 34 || version === 35) {
		// These ALTER TABLEs also run from repairCharacterSheetColumns on every init.
		// Existing OPFS DBs may already have the columns while schema_version is still 32–34.
		repairCharacterSheetColumns(database);
		return;
	}

	if (version === 37) {
		ensureMediaAssetsSchema(database);
		return;
	}

	const sql = MIGRATIONS[version];
	if (sql?.trim()) {
		database.exec(sql);
	}
}
