export type User = {
	user_id: string;
	email: string;
	username: string;
	theme: 'default' | 'medieval';
	date_created: string;
	date_deleted: string | null;
};

export type Campaign = {
	campaign_id: string;
	owner_user_id: string;
	campaign_name: string;
	description: string | null;
	game_schema: string;
	theme: 'default' | 'medieval';
	date_created: string;
	date_deleted: string | null;
};

export type CampaignMember = {
	player_id: string;
	campaign_id: string;
	user_id: string;
	character_id: string | null;
	date_campaign_joined: string;
	role: 'gm' | 'player';
	last_played_at: string | null;
};

export type CampaignNpc = {
	campaign_npc_id: string;
	campaign_id: string;
	character_id: string;
	date_added: string;
};

export type CampaignSessionZero = {
	campaign_id: string;
	answers: Record<string, string>;
	activeQuestionIds: string[];
	date_updated: string;
};

export type Adventure = {
	adventure_id: string;
	campaign_id: string;
	name: string;
	overview: string | null;
	adventure_hook: string | null;
	can_promote_to_campaign: boolean;
	date_created: string;
};

export type Part = {
	part_id: string;
	adventure_id: string;
	title: string;
	summary: string | null;
	session_duration: string | null;
	sort_order: number;
};

export type StoryNodeKind = 'encounter' | 'exploration';

export const STORY_NODE_KIND_LABELS: Record<StoryNodeKind, string> = {
	encounter: 'Encounter',
	exploration: 'Exploration'
};

export type StoryNode = {
	node_id: string;
	kind: StoryNodeKind;
	title: string;
	summary: string;
	parent_node_ids: string[];
	difficulty?: string | null;
	activated_at?: string | null;
	completed_at?: string | null;
};

export type CharacterKind = 'pc' | 'npc_general' | 'npc_foe';

export const CHARACTER_KIND_LABELS: Record<CharacterKind, string> = {
	pc: 'Player character',
	npc_general: 'NPC',
	npc_foe: 'Foe'
};

export function isNpcCharacterKind(kind: CharacterKind): boolean {
	return kind === 'npc_general' || kind === 'npc_foe';
}

export function isActiveNpc(character: Character | undefined): boolean {
	return character != null && isNpcCharacterKind(character.kind) && !character.date_deleted;
}

export function normalizeCharacterKind(kind: string): CharacterKind {
	if (kind === 'pc' || kind === 'npc_foe') {
		return kind;
	}

	if (kind === 'npc_general' || kind === 'npc') {
		return 'npc_general';
	}

	return 'npc_general';
}

export const NPC_CHARACTER_KINDS = [
	'npc_general',
	'npc_foe'
] as const satisfies readonly CharacterKind[];

export type NpcCharacterKind = (typeof NPC_CHARACTER_KINDS)[number];

export type AbilityScores = {
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
};

export const DEFAULT_ABILITY_SCORES: AbilityScores = {
	str: 10,
	dex: 10,
	con: 10,
	int: 10,
	wis: 10,
	cha: 10
};

export type SpellcastingAbilityKey = keyof AbilityScores;

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type SpellSlotsByLevel = Partial<Record<SpellSlotLevel, number>>;

export type CharacterSpellEntry = {
	spell_id: string;
	prepared: boolean;
};

export const SPELL_SLOT_LEVELS: SpellSlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export type Character = {
	character_id: string;
	campaign_id: string;
	kind: CharacterKind;
	created_by_user_id: string;
	cloned_from_character_id: string | null;
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
	presentation: string | null;
	race: string | null;
	creature_type: string | null;
	alignment: string | null;
	age: string | null;
	class_name: string | null;
	background: string | null;
	height: string | null;
	weight: string | null;
	eyes: string | null;
	skin: string | null;
	hair: string | null;
	inspiration: boolean;
	initiative: number | null;
	temp_hp: number | null;
	hit_dice_remaining: string | null;
	death_save_successes: number;
	death_save_failures: number;
	personality_traits: string | null;
	ideals: string | null;
	bonds: string | null;
	flaws: string | null;
	backstory: string | null;
	allies: string | null;
	features: string | null;
	proficiencies: string | null;
	treasure: string | null;
	armor_class: number | null;
	armor_class_notes: string | null;
	speed: string | null;
	hp_dice: string | null;
	ability_str: number | null;
	ability_dex: number | null;
	ability_con: number | null;
	ability_int: number | null;
	ability_wis: number | null;
	ability_cha: number | null;
	skills: string | null;
	senses: string | null;
	languages: string | null;
	challenge_rating: string | null;
	traits: string | null;
	actions: string | null;
	is_spellcaster: boolean;
	spellcasting_class: string | null;
	spellcasting_ability: SpellcastingAbilityKey | null;
	spell_slots_total: SpellSlotsByLevel | null;
	spell_slots_expended: SpellSlotsByLevel | null;
	mime_type: string | null;
	portrait_width: number | null;
	portrait_height: number | null;
	thumb_width: number | null;
	thumb_height: number | null;
	image_source: string | null;
	date_deleted: string | null;
};

export function characterHasPortrait(character: Character | undefined): boolean {
	return Boolean(character?.mime_type);
}

export type StatKind = 'experience' | 'hp_current' | 'hp_max';

export type StatSourceType =
	| 'creation'
	| 'encounter_xp'
	| 'story_event'
	| 'damage'
	| 'healing'
	| 'rest'
	| 'level_up'
	| 'manual';

export type CharacterStatEvent = {
	stat_event_id: string;
	character_id: string;
	campaign_id: string;
	stat: StatKind;
	delta: number;
	value_after: number;
	source_type: StatSourceType;
	source_id: string | null;
	source_label: string;
	description: string | null;
	batch_id: string | null;
	actor_user_id: string;
	metadata: Record<string, unknown> | null;
	created_at: string;
};

export type EncounterXpSplitMode = 'equal' | 'custom';

export type EncounterResolution = {
	resolution_id: string;
	event_id: string;
	total_xp: number;
	split_mode: EncounterXpSplitMode;
	resolved_by_user_id: string;
	resolved_at: string;
};

export type EncounterXpAward = {
	event_id: string;
	character_id: string;
	amount: number;
	description: string | null;
	resolved_at: string;
};

export type StoryItemKind = 'xp' | 'npc' | 'money' | 'item' | 'note' | 'map';

export type CampaignMap = {
	map_id: string;
	campaign_id: string;
	name: string;
	mime_type: string;
	full_width: number;
	full_height: number;
	thumb_width: number;
	thumb_height: number;
	image_source: string | null;
	created_at: string;
};

export type StoryItemCatalogType = 'weapon' | 'armor' | 'item';

export const STORY_ITEM_KIND_LABELS: Record<StoryItemKind, string> = {
	xp: 'XP',
	npc: 'NPC',
	money: '$$$',
	item: 'Item',
	note: 'Note',
	map: 'Map'
};

export type StoryItem = {
	item_id: string;
	parent_node_id: string;
	kind: StoryItemKind;
	label: string;
	xp_amount?: number | null;
	character_id?: string | null;
	gold?: number | null;
	silver?: number | null;
	copper?: number | null;
	is_treasure?: boolean | null;
	is_reward?: boolean | null;
	catalog_type?: StoryItemCatalogType | null;
	catalog_id?: string | null;
	note_text?: string | null;
	note_width?: number | null;
	note_height?: number | null;
	map_id?: string | null;
};

export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield';

export type ArmorClassDexterity = 'full' | 'max_2' | 'none' | 'bonus';

export type Armor = {
	armor_id: string;
	armor_name: string;
	armor_category: ArmorCategory;
	armor_class: number;
	armor_class_dexterity: ArmorClassDexterity;
	cost: number;
	weight: number;
	body_location: string;
};

export type WeaponCategory = 'simple_melee' | 'simple_ranged' | 'martial_melee' | 'martial_ranged';

export type DamageType = 'bludgeoning' | 'piercing' | 'slashing';

export type CostCurrency = 'copper' | 'silver' | 'gold';

export type Weapon = {
	weapon_id: string;
	weapon_name: string;
	weapon_category: WeaponCategory;
	cost: number | null;
	cost_currency: CostCurrency | null;
	damage_dice: string;
	damage_type: DamageType;
	weight: number | null;
	properties: string | null;
};

export type ItemCategory =
	| 'adventuring_gear'
	| 'mounts_and_other_animals'
	| 'tack_and_harness'
	| 'food_drink_and_lodging';

export type Item = {
	item_id: string;
	item_name: string;
	item_category: ItemCategory;
	item_subcategory: string | null;
	cost: number;
	cost_currency: CostCurrency;
	weight: number | null;
	speed: string | null;
	carrying_capacity: string | null;
};

export type SpellSchool =
	| 'abjuration'
	| 'conjuration'
	| 'divination'
	| 'enchantment'
	| 'evocation'
	| 'illusion'
	| 'necromancy'
	| 'transmutation';

export type Spell = {
	spell_id: string;
	spell_name: string;
	spell_level: number;
	spell_school: SpellSchool;
	is_ritual: boolean;
	casting_time: string;
	range: string;
	components: string;
	duration: string;
	description: string;
};

export type Condition = {
	condition_id: string;
	condition_name: string;
	description: string;
};

export type Skill = {
	skill_id: string;
	skill_name: string;
	ability: string;
};

export type SpeciesTraitEffectKind =
	| 'darkvision'
	| 'damage_resistance'
	| 'damage_immunity'
	| 'save_advantage'
	| 'save_disadvantage'
	| 'hp_max_bonus'
	| 'bonus_action_sense'
	| 'skill_proficiency'
	| 'skill_expertise'
	| 'skill_advantage'
	| 'tool_proficiency'
	| 'language'
	| 'ability_score_increase';

export type SpeciesTraitEffect = {
	effect_id: string;
	effect_kind: SpeciesTraitEffectKind;
	target: string | null;
	value: string | null;
	notes: string | null;
};

export type SpeciesTrait = {
	trait_id: string;
	trait_name: string;
	description: string;
	sort_order: number;
	effects: SpeciesTraitEffect[];
};

export type Species = {
	species_id: string;
	species_name: string;
	creature_type: string;
	size: string;
	speed: string;
	description: string;
	traits: SpeciesTrait[];
};
