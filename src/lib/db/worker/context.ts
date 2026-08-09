import type sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { execSql, selectObjects } from '../bind';
import type { DbExec } from '../types';

export const DB_FILENAME = '/dm-deputy.db';

export const CHARACTER_SELECT_COLUMNS = `
	character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
	display_name, experience_base, experience, level, hp_max_base, hp_current_base,
	hp_current, hp_max, reputation, notes, presentation, race, creature_type,
	alignment, age, class_name, background, height, weight, eyes, skin, hair,
	inspiration, initiative, temp_hp, hit_dice_remaining, death_save_successes,
	death_save_failures, personality_traits, ideals, bonds, flaws, backstory, allies,
	features, proficiencies, treasure, armor_class, armor_class_notes, speed, hp_dice,
	ability_str, ability_dex, ability_con, ability_int, ability_wis, ability_cha,
	skills, senses, languages, challenge_rating, traits, actions, is_spellcaster,
	spellcasting_class, spellcasting_ability, spell_slots_total_json, spell_slots_expended_json,
	mime_type, portrait_width, portrait_height, thumb_width, thumb_height, image_source,
	presentation_mime_type, presentation_width, presentation_height, presentation_thumb_width,
	presentation_thumb_height, presentation_image_source, date_deleted
`.replace(/\s+/g, ' ');

export type SqliteModule = Awaited<ReturnType<typeof sqlite3InitModule>>;
export type OpfsDb = InstanceType<NonNullable<SqliteModule['oo1']>['OpfsDb']>;
export type MemoryDb = InstanceType<SqliteModule['oo1']['DB']>;
export type AppDb = OpfsDb | MemoryDb;

let sqlite3: SqliteModule | null = null;
let db: AppDb | null = null;

export function getSqlite3(): SqliteModule {
	if (!sqlite3) {
		throw new Error('SQLite module not initialized');
	}
	return sqlite3;
}

export function peekSqlite3(): SqliteModule | null {
	return sqlite3;
}

export function setSqlite3(module: SqliteModule): void {
	sqlite3 = module;
}

export function getDb(): AppDb {
	if (!db) {
		throw new Error('Database not opened');
	}
	return db;
}

export function setDb(database: AppDb | null): void {
	db = database;
}

export function asDbExec(database: AppDb): DbExec {
	return {
		exec: (sql) => execSql(database, sql),
		selectObjects: <T>(sql: string, bind?: Record<string, unknown>) =>
			selectObjects(database, sql, bind) as T[]
	};
}

export function isOpfsAvailable(module: SqliteModule): boolean {
	return 'OpfsDb' in module.oo1;
}
