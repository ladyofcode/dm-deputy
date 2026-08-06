export const SCHEMA_VERSION = 28;

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
	18: ``,
	19: `
		CREATE TABLE IF NOT EXISTS campaign_session_zero (
			campaign_id TEXT PRIMARY KEY NOT NULL,
			answers_json TEXT NOT NULL DEFAULT '{}',
			date_updated TEXT NOT NULL
		);
	`,
	20: `
		ALTER TABLE characters ADD COLUMN date_deleted TEXT;
	`,
	21: `
		ALTER TABLE characters ADD COLUMN race TEXT;
		ALTER TABLE characters ADD COLUMN alignment TEXT;
		ALTER TABLE characters ADD COLUMN age TEXT;
		ALTER TABLE characters ADD COLUMN class_name TEXT;
		ALTER TABLE characters ADD COLUMN mime_type TEXT;
		ALTER TABLE characters ADD COLUMN portrait_width INTEGER;
		ALTER TABLE characters ADD COLUMN portrait_height INTEGER;
		ALTER TABLE characters ADD COLUMN thumb_width INTEGER;
		ALTER TABLE characters ADD COLUMN thumb_height INTEGER;
		ALTER TABLE characters ADD COLUMN thumb_blob BLOB;
		ALTER TABLE characters ADD COLUMN full_blob BLOB;
	`,
	22: `
		ALTER TABLE characters ADD COLUMN image_source TEXT;
		ALTER TABLE maps ADD COLUMN image_source TEXT;
	`,
	23: `
		ALTER TABLE characters ADD COLUMN presentation TEXT;
	`,
	24: `
		ALTER TABLE characters ADD COLUMN creature_type TEXT;
		ALTER TABLE characters ADD COLUMN armor_class INTEGER;
		ALTER TABLE characters ADD COLUMN armor_class_notes TEXT;
		ALTER TABLE characters ADD COLUMN speed TEXT;
		ALTER TABLE characters ADD COLUMN hp_dice TEXT;
		ALTER TABLE characters ADD COLUMN ability_str INTEGER;
		ALTER TABLE characters ADD COLUMN ability_dex INTEGER;
		ALTER TABLE characters ADD COLUMN ability_con INTEGER;
		ALTER TABLE characters ADD COLUMN ability_int INTEGER;
		ALTER TABLE characters ADD COLUMN ability_wis INTEGER;
		ALTER TABLE characters ADD COLUMN ability_cha INTEGER;
		ALTER TABLE characters ADD COLUMN skills TEXT;
		ALTER TABLE characters ADD COLUMN senses TEXT;
		ALTER TABLE characters ADD COLUMN languages TEXT;
		ALTER TABLE characters ADD COLUMN challenge_rating TEXT;
		ALTER TABLE characters ADD COLUMN traits TEXT;
		ALTER TABLE characters ADD COLUMN actions TEXT;
	`,
	25: `
		ALTER TABLE characters ADD COLUMN is_spellcaster INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE characters ADD COLUMN spellcasting_class TEXT;
		ALTER TABLE characters ADD COLUMN spellcasting_ability TEXT;
		ALTER TABLE characters ADD COLUMN spell_slots_total_json TEXT;
		ALTER TABLE characters ADD COLUMN spell_slots_expended_json TEXT;
	`,
	26: `
		CREATE TABLE IF NOT EXISTS conditions (
			condition_id TEXT PRIMARY KEY NOT NULL,
			condition_name TEXT NOT NULL,
			description TEXT NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_conditions_name ON conditions (condition_name);

		INSERT OR IGNORE INTO conditions (condition_id, condition_name, description) VALUES
			('cond-blinded', 'Blinded', 'A blinded creature can''t see and automatically fails any ability check that requires sight.
Attack rolls against the creature have advantage, and the creature''s attack rolls have disadvantage.'),
			('cond-charmed', 'Charmed', 'A charmed creature can''t attack the charmer or target the charmer with harmful abilities or magical effects.
The charmer has advantage on any ability check to interact socially with the creature.'),
			('cond-deafened', 'Deafened', 'A deafened creature can''t hear and automatically fails any ability check that requires hearing.'),
			('cond-frightened', 'Frightened', 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.
The creature can''t willingly move closer to the source of its fear.'),
			('cond-grappled', 'Grappled', 'A grappled creature''s speed becomes 0, and it can''t benefit from any bonus to its speed.
The condition ends if the grappler is incapacitated (see the condition).
The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell.'),
			('cond-incapacitated', 'Incapacitated', 'An incapacitated creature can''t take actions or reactions.'),
			('cond-invisible', 'Invisible', 'An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature''s location can be detected by any noise it makes or any tracks it leaves.
Attack rolls against the creature have disadvantage, and the creature''s attack rolls have advantage.'),
			('cond-paralyzed', 'Paralyzed', 'A paralyzed creature is incapacitated (see the condition) and can''t move or speak.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.
Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.'),
			('cond-petrified', 'Petrified', 'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.
The creature is incapacitated (see the condition), can''t move or speak, and is unaware of its surroundings.
Attack rolls against the creature have advantage.
The creature automatically fails Strength and Dexterity saving throws.
The creature has resistance to all damage.
The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.'),
			('cond-poisoned', 'Poisoned', 'A poisoned creature has disadvantage on attack rolls and ability checks.'),
			('cond-prone', 'Prone', 'A prone creature''s only movement option is to crawl, unless it stands up and thereby ends the condition.
The creature has disadvantage on attack rolls.
An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.'),
			('cond-restrained', 'Restrained', 'A restrained creature''s speed becomes 0, and it can''t benefit from any bonus to its speed.
Attack rolls against the creature have advantage, and the creature''s attack rolls have disadvantage.
The creature has disadvantage on Dexterity saving throws.'),
			('cond-stunned', 'Stunned', 'A stunned creature is incapacitated (see the condition), can''t move, and can speak only falteringly.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.'),
			('cond-unconscious', 'Unconscious', 'An unconscious creature is incapacitated (see the condition), can''t move or speak, and is unaware of its surroundings.
The creature drops whatever it''s holding and falls prone.
The creature automatically fails Strength and Dexterity saving throws.
Attack rolls against the creature have advantage.
Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.');
	`,
	27: `
		ALTER TABLE characters ADD COLUMN background TEXT;
		ALTER TABLE characters ADD COLUMN height TEXT;
		ALTER TABLE characters ADD COLUMN weight TEXT;
		ALTER TABLE characters ADD COLUMN eyes TEXT;
		ALTER TABLE characters ADD COLUMN skin TEXT;
		ALTER TABLE characters ADD COLUMN hair TEXT;
		ALTER TABLE characters ADD COLUMN inspiration INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE characters ADD COLUMN initiative INTEGER;
		ALTER TABLE characters ADD COLUMN temp_hp INTEGER;
		ALTER TABLE characters ADD COLUMN hit_dice_remaining TEXT;
		ALTER TABLE characters ADD COLUMN death_save_successes INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE characters ADD COLUMN death_save_failures INTEGER NOT NULL DEFAULT 0;
		ALTER TABLE characters ADD COLUMN personality_traits TEXT;
		ALTER TABLE characters ADD COLUMN ideals TEXT;
		ALTER TABLE characters ADD COLUMN bonds TEXT;
		ALTER TABLE characters ADD COLUMN flaws TEXT;
		ALTER TABLE characters ADD COLUMN backstory TEXT;
		ALTER TABLE characters ADD COLUMN allies TEXT;
		ALTER TABLE characters ADD COLUMN features TEXT;
		ALTER TABLE characters ADD COLUMN proficiencies TEXT;
		ALTER TABLE characters ADD COLUMN treasure TEXT;
	`,
	28: `
		CREATE TABLE IF NOT EXISTS species (
			species_id TEXT PRIMARY KEY NOT NULL,
			species_name TEXT NOT NULL,
			creature_type TEXT NOT NULL DEFAULT 'Humanoid',
			size TEXT NOT NULL,
			speed TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT ''
		);

		CREATE INDEX IF NOT EXISTS idx_species_name ON species (species_name);

		CREATE TABLE IF NOT EXISTS species_traits (
			trait_id TEXT PRIMARY KEY NOT NULL,
			species_id TEXT NOT NULL,
			trait_name TEXT NOT NULL,
			description TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		);

		CREATE INDEX IF NOT EXISTS idx_species_traits_species ON species_traits (species_id);

		CREATE TABLE IF NOT EXISTS species_trait_effects (
			effect_id TEXT PRIMARY KEY NOT NULL,
			trait_id TEXT NOT NULL,
			effect_kind TEXT NOT NULL,
			target TEXT,
			value TEXT,
			notes TEXT
		);

		CREATE INDEX IF NOT EXISTS idx_species_trait_effects_trait ON species_trait_effects (trait_id);

		INSERT OR IGNORE INTO skills (skill_id, skill_name, ability) VALUES
			('skill-acrobatics', 'Acrobatics', 'dex'),
			('skill-animal-handling', 'Animal Handling', 'wis'),
			('skill-arcana', 'Arcana', 'int'),
			('skill-athletics', 'Athletics', 'str'),
			('skill-deception', 'Deception', 'cha'),
			('skill-history', 'History', 'int'),
			('skill-insight', 'Insight', 'wis'),
			('skill-intimidation', 'Intimidation', 'cha'),
			('skill-investigation', 'Investigation', 'int'),
			('skill-medicine', 'Medicine', 'wis'),
			('skill-nature', 'Nature', 'int'),
			('skill-perception', 'Perception', 'wis'),
			('skill-performance', 'Performance', 'cha'),
			('skill-persuasion', 'Persuasion', 'cha'),
			('skill-religion', 'Religion', 'int'),
			('skill-sleight-of-hand', 'Sleight of Hand', 'dex'),
			('skill-stealth', 'Stealth', 'dex'),
			('skill-survival', 'Survival', 'wis');
	`
};

export const REPAIR_MIGRATION_VERSIONS = [1, 3, 5, 6, 8, 9, 26] as const;

export function getFreshInstallSql(): string {
	return Object.keys(MIGRATIONS)
		.map(Number)
		.sort((left, right) => left - right)
		.map((version) => MIGRATIONS[version])
		.join('\n');
}
