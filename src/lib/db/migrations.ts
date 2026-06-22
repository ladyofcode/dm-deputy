export const SCHEMA_VERSION = 18;

export const MIGRATIONS: Record<number, string> = {
	1: `
		CREATE TABLE IF NOT EXISTS schema_meta (
			key TEXT PRIMARY KEY NOT NULL,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS users (
			user_id TEXT PRIMARY KEY NOT NULL,
			email TEXT NOT NULL,
			username TEXT NOT NULL,
			theme TEXT NOT NULL DEFAULT 'default',
			date_created TEXT NOT NULL,
			date_deleted TEXT
		);

		CREATE TABLE IF NOT EXISTS campaigns (
			campaign_id TEXT PRIMARY KEY NOT NULL,
			owner_user_id TEXT NOT NULL,
			campaign_name TEXT NOT NULL,
			description TEXT,
			game_schema TEXT NOT NULL,
			theme TEXT NOT NULL DEFAULT 'default',
			date_created TEXT NOT NULL,
			date_deleted TEXT
		);

		CREATE TABLE IF NOT EXISTS campaign_members (
			player_id TEXT PRIMARY KEY NOT NULL,
			campaign_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			character_id TEXT,
			date_campaign_joined TEXT NOT NULL,
			role TEXT NOT NULL,
			last_played_at TEXT
		);

		CREATE TABLE IF NOT EXISTS adventures (
			adventure_id TEXT PRIMARY KEY NOT NULL,
			campaign_id TEXT NOT NULL,
			name TEXT NOT NULL,
			overview TEXT,
			adventure_hook TEXT,
			can_promote_to_campaign INTEGER NOT NULL DEFAULT 0,
			date_created TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS parts (
			part_id TEXT PRIMARY KEY NOT NULL,
			adventure_id TEXT NOT NULL,
			title TEXT NOT NULL,
			summary TEXT,
			session_duration TEXT,
			sort_order INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS story_nodes (
			part_id TEXT NOT NULL,
			node_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			title TEXT NOT NULL,
			summary TEXT NOT NULL,
			parent_node_ids TEXT NOT NULL,
			difficulty TEXT,
			activated_at TEXT,
			PRIMARY KEY (part_id, node_id)
		);

		CREATE TABLE IF NOT EXISTS part_node_layouts (
			part_id TEXT PRIMARY KEY NOT NULL,
			layout_json TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS part_item_layouts (
			part_id TEXT PRIMARY KEY NOT NULL,
			layout_json TEXT NOT NULL
		);
	`,
	2: `
		INSERT OR IGNORE INTO users (user_id, email, username, theme, date_created)
		VALUES (
			'usr-local',
			'',
			'Game Master',
			'default',
			datetime('now')
		);

		UPDATE campaigns
		SET owner_user_id = 'usr-local'
		WHERE owner_user_id IN ('usr-returning-gm', 'usr-new-gm');

		UPDATE campaign_members
		SET user_id = 'usr-local'
		WHERE user_id IN ('usr-returning-gm', 'usr-new-gm');

		UPDATE schema_meta
		SET value = 'default-v1'
		WHERE key = 'seeded' AND value = 'dummy-v1';
	`,
	3: `
		CREATE TABLE IF NOT EXISTS characters (
			character_id TEXT PRIMARY KEY NOT NULL,
			campaign_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			created_by_user_id TEXT NOT NULL,
			cloned_from_character_id TEXT,
			display_name TEXT NOT NULL,
			experience_base INTEGER NOT NULL DEFAULT 0,
			experience INTEGER NOT NULL DEFAULT 0,
			level INTEGER NOT NULL DEFAULT 1,
			hp_max_base INTEGER NOT NULL DEFAULT 0,
			hp_current_base INTEGER NOT NULL DEFAULT 0,
			hp_current INTEGER NOT NULL DEFAULT 0,
			hp_max INTEGER NOT NULL DEFAULT 0,
			reputation TEXT,
			notes TEXT
		);
	`,
	4: ``,
	5: `
		CREATE TABLE IF NOT EXISTS catalog_meta (
			key TEXT PRIMARY KEY NOT NULL,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS spells (
			spell_id TEXT PRIMARY KEY NOT NULL,
			spell_name TEXT NOT NULL,
			spell_level INTEGER NOT NULL,
			spell_school TEXT NOT NULL,
			is_ritual INTEGER NOT NULL DEFAULT 0,
			casting_time TEXT NOT NULL,
			range TEXT NOT NULL,
			components TEXT NOT NULL,
			duration TEXT NOT NULL,
			description TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS weapons (
			weapon_id TEXT PRIMARY KEY NOT NULL,
			weapon_name TEXT NOT NULL,
			weapon_category TEXT NOT NULL,
			cost REAL,
			cost_currency TEXT,
			damage_dice TEXT NOT NULL,
			damage_type TEXT NOT NULL,
			weight REAL,
			properties TEXT
		);

		CREATE TABLE IF NOT EXISTS armor (
			armor_id TEXT PRIMARY KEY NOT NULL,
			armor_name TEXT NOT NULL,
			armor_category TEXT NOT NULL,
			armor_class INTEGER NOT NULL,
			armor_class_dexterity TEXT NOT NULL,
			cost REAL NOT NULL,
			weight REAL NOT NULL,
			body_location TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS items (
			item_id TEXT PRIMARY KEY NOT NULL,
			item_name TEXT NOT NULL,
			item_category TEXT NOT NULL,
			item_subcategory TEXT,
			cost REAL NOT NULL,
			cost_currency TEXT NOT NULL,
			weight REAL,
			speed TEXT,
			carrying_capacity TEXT
		);

		CREATE INDEX IF NOT EXISTS idx_spells_level ON spells (spell_level);
		CREATE INDEX IF NOT EXISTS idx_spells_school ON spells (spell_school);
		CREATE INDEX IF NOT EXISTS idx_weapons_category ON weapons (weapon_category);
		CREATE INDEX IF NOT EXISTS idx_armor_category ON armor (armor_category);
		CREATE INDEX IF NOT EXISTS idx_items_category ON items (item_category);
		CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items (item_subcategory);
	`,
	6: `
		CREATE TABLE IF NOT EXISTS events (
			event_id TEXT PRIMARY KEY NOT NULL,
			part_id TEXT NOT NULL,
			kind TEXT NOT NULL DEFAULT 'story',
			sort_order INTEGER NOT NULL DEFAULT 0,
			title TEXT NOT NULL,
			description TEXT,
			xp_award INTEGER NOT NULL DEFAULT 0,
			difficulty TEXT
		);

		CREATE TABLE IF NOT EXISTS maps (
			map_id TEXT PRIMARY KEY NOT NULL,
			campaign_id TEXT NOT NULL,
			name TEXT NOT NULL,
			image_url TEXT,
			layout_mode TEXT NOT NULL DEFAULT 'popup',
			notes TEXT
		);

		CREATE TABLE IF NOT EXISTS event_maps (
			event_map_id TEXT PRIMARY KEY NOT NULL,
			event_id TEXT NOT NULL,
			map_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			label TEXT
		);

		CREATE TABLE IF NOT EXISTS skills (
			skill_id TEXT PRIMARY KEY NOT NULL,
			skill_name TEXT NOT NULL,
			ability TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS encounter_resolutions (
			resolution_id TEXT PRIMARY KEY NOT NULL,
			event_id TEXT NOT NULL,
			total_xp INTEGER NOT NULL,
			split_mode TEXT NOT NULL,
			resolved_by_user_id TEXT NOT NULL,
			resolved_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS character_stat_events (
			stat_event_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			campaign_id TEXT NOT NULL,
			stat TEXT NOT NULL,
			delta INTEGER NOT NULL,
			value_after INTEGER NOT NULL,
			source_type TEXT NOT NULL,
			source_id TEXT,
			source_label TEXT,
			description TEXT,
			batch_id TEXT,
			actor_user_id TEXT,
			metadata TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS character_items (
			character_item_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			item_id TEXT NOT NULL,
			quantity INTEGER NOT NULL DEFAULT 1,
			notes TEXT
		);

		CREATE TABLE IF NOT EXISTS character_weapons (
			character_weapon_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			weapon_id TEXT NOT NULL,
			equipped INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS character_spells (
			character_spell_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			spell_id TEXT NOT NULL,
			prepared INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS character_armor (
			character_armor_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			armor_id TEXT NOT NULL,
			equipped INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS character_skills (
			character_skill_id TEXT PRIMARY KEY NOT NULL,
			character_id TEXT NOT NULL,
			skill_id TEXT NOT NULL,
			proficient INTEGER NOT NULL DEFAULT 0,
			bonus INTEGER NOT NULL DEFAULT 0
		);

		CREATE INDEX IF NOT EXISTS idx_events_part ON events (part_id);
		CREATE INDEX IF NOT EXISTS idx_maps_campaign ON maps (campaign_id);
		CREATE INDEX IF NOT EXISTS idx_event_maps_event ON event_maps (event_id);
		CREATE INDEX IF NOT EXISTS idx_character_stat_events_character ON character_stat_events (character_id);
	`,
	7: `
		UPDATE story_nodes SET kind = 'exploration' WHERE kind = 'event';
	`,
	8: `
		CREATE TABLE IF NOT EXISTS story_items (
			part_id TEXT NOT NULL,
			item_id TEXT NOT NULL,
			parent_node_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			label TEXT NOT NULL,
			payload_json TEXT NOT NULL DEFAULT '{}',
			PRIMARY KEY (part_id, item_id)
		);

		CREATE INDEX IF NOT EXISTS idx_story_items_part ON story_items (part_id);
		CREATE INDEX IF NOT EXISTS idx_story_items_parent ON story_items (parent_node_id);
	`,
	9: `
		CREATE TABLE IF NOT EXISTS story_items (
			part_id TEXT NOT NULL,
			item_id TEXT NOT NULL,
			parent_node_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			label TEXT NOT NULL,
			payload_json TEXT NOT NULL DEFAULT '{}',
			PRIMARY KEY (part_id, item_id)
		);

		CREATE INDEX IF NOT EXISTS idx_story_items_part ON story_items (part_id);
		CREATE INDEX IF NOT EXISTS idx_story_items_parent ON story_items (parent_node_id);
	`,
	10: `
		ALTER TABLE story_items ADD COLUMN is_treasure INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE story_items ADD COLUMN is_reward INTEGER NOT NULL DEFAULT 0;
	`,
	11: `
		ALTER TABLE story_nodes ADD COLUMN completed_at TEXT;
	`,
	12: `
		ALTER TABLE maps ADD COLUMN mime_type TEXT;
		ALTER TABLE maps ADD COLUMN full_width INTEGER;
		ALTER TABLE maps ADD COLUMN full_height INTEGER;
		ALTER TABLE maps ADD COLUMN thumb_width INTEGER;
		ALTER TABLE maps ADD COLUMN thumb_height INTEGER;
		ALTER TABLE maps ADD COLUMN thumb_blob BLOB;
		ALTER TABLE maps ADD COLUMN full_blob BLOB;
		ALTER TABLE maps ADD COLUMN created_at TEXT;
	`,
	13: `
		UPDATE characters SET kind = 'npc_general' WHERE kind = 'npc';
	`,
	14: `
		CREATE TABLE IF NOT EXISTS campaign_npcs (
			campaign_npc_id TEXT PRIMARY KEY NOT NULL,
			campaign_id TEXT NOT NULL,
			character_id TEXT NOT NULL,
			date_added TEXT NOT NULL,
			UNIQUE (campaign_id, character_id)
		);

		CREATE INDEX IF NOT EXISTS idx_campaign_npcs_campaign ON campaign_npcs (campaign_id);
		CREATE INDEX IF NOT EXISTS idx_campaign_npcs_character ON campaign_npcs (character_id);

		INSERT OR IGNORE INTO campaign_npcs (campaign_npc_id, campaign_id, character_id, date_added)
		SELECT
			'cnpc-' || character_id,
			campaign_id,
			character_id,
			datetime('now')
		FROM characters
		WHERE kind IN ('npc_general', 'npc_foe');
	`,
	15: ``,
	16: ``,
	17: ``,
	18: ``
};

export const REPAIR_MIGRATION_VERSIONS = [1, 3, 5, 6, 8, 9] as const;

export function getFreshInstallSql(): string {
	return Object.keys(MIGRATIONS)
		.map(Number)
		.sort((left, right) => left - right)
		.map((version) => MIGRATIONS[version])
		.join('\n');
}
