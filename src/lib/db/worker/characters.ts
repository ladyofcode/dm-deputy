import { execSql, selectObjects, bufferFromBytes } from '../bind';
import { withTransaction } from '../sql';
import type {
	AddCampaignNpcToCampaignInput,
	AddCampaignNpcToCampaignResult,
	CharacterLoadout,
	CreateCampaignCharacterInput,
	UpdateCampaignCharacterInput,
	UpdateCharacterPortraitInput,
	UpdateCharacterPresentationInput
} from '../types';
import { parseSpellSlotsJson } from '$lib/domain/spellcasting';
import {
	isNpcCharacterKind,
	normalizeCharacterKind,
	type CampaignNpc,
	type Character,
	type SpellcastingAbilityKey
} from '$lib/types/schema';
import { CHARACTER_SELECT_COLUMNS, type AppDb } from './context';
import { loadMediaAssetBlob } from './media-assets';

export function clearCharacterLoadout(database: AppDb, characterId: string): void {
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

export function replaceCharacterLoadout(
	database: AppDb,
	characterId: string,
	loadout: CharacterLoadout
): void {
	withTransaction(database, () => {
		clearCharacterLoadout(database, characterId);
		attachCharacterLoadout(database, characterId, loadout);
	});
}

export function loadCharacterLoadout(database: AppDb, characterId: string): CharacterLoadout {
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
	const spellIds = selectObjects<{ spell_id: string; prepared: number }>(
		database,
		'SELECT spell_id, prepared FROM character_spells WHERE character_id = $characterId ORDER BY rowid',
		{ characterId }
	).map((row) => ({
		spell_id: row.spell_id,
		prepared: row.prepared === 1
	}));

	return {
		weapon_ids: weaponIds,
		armor_ids: armorIds,
		item_ids: itemIds,
		spells: spellIds
	};
}

export function attachCharacterLoadout(
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

	for (const spell of loadout.spells) {
		execSql(database, {
			sql: `INSERT INTO character_spells (
				character_spell_id, character_id, spell_id, prepared
			) VALUES (
				$character_spell_id, $character_id, $spell_id, $prepared
			)`,
			bind: {
				character_spell_id: `csp-${crypto.randomUUID()}`,
				character_id: characterId,
				spell_id: spell.spell_id,
				prepared: spell.prepared ? 1 : 0
			}
		});
	}
}

export function insertCampaignNpcLink(
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

export function mapCharacterRow(row: {
	character_id: string;
	campaign_id: string;
	kind: string;
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
	presentation?: string | null;
	race?: string | null;
	creature_type?: string | null;
	alignment?: string | null;
	age?: string | null;
	class_name?: string | null;
	role_label?: string | null;
	background?: string | null;
	height?: string | null;
	weight?: string | null;
	eyes?: string | null;
	skin?: string | null;
	hair?: string | null;
	inspiration?: number | null;
	initiative?: number | null;
	temp_hp?: number | null;
	hit_dice_remaining?: string | null;
	death_save_successes?: number | null;
	death_save_failures?: number | null;
	personality_traits?: string | null;
	ideals?: string | null;
	bonds?: string | null;
	flaws?: string | null;
	backstory?: string | null;
	allies?: string | null;
	features?: string | null;
	proficiencies?: string | null;
	treasure?: string | null;
	armor_class?: number | null;
	armor_class_notes?: string | null;
	speed?: string | null;
	hp_dice?: string | null;
	ability_str?: number | null;
	ability_dex?: number | null;
	ability_con?: number | null;
	ability_int?: number | null;
	ability_wis?: number | null;
	ability_cha?: number | null;
	skills?: string | null;
	senses?: string | null;
	languages?: string | null;
	challenge_rating?: string | null;
	traits?: string | null;
	actions?: string | null;
	is_spellcaster?: number | null;
	spellcasting_class?: string | null;
	spellcasting_ability?: string | null;
	spell_slots_total_json?: string | null;
	spell_slots_expended_json?: string | null;
	mime_type?: string | null;
	portrait_width?: number | null;
	portrait_height?: number | null;
	thumb_width?: number | null;
	thumb_height?: number | null;
	image_source?: string | null;
	original_mime_type?: string | null;
	original_width?: number | null;
	original_height?: number | null;
	thumb_crop_json?: string | null;
	presentation_mime_type?: string | null;
	presentation_width?: number | null;
	presentation_height?: number | null;
	presentation_thumb_width?: number | null;
	presentation_thumb_height?: number | null;
	presentation_image_source?: string | null;
	presentation_original_mime_type?: string | null;
	presentation_original_width?: number | null;
	presentation_original_height?: number | null;
	presentation_thumb_crop_json?: string | null;
	portrait_media_id?: string | null;
	presentation_media_id?: string | null;
	date_deleted?: string | null;
}): Character {
	return {
		character_id: row.character_id,
		campaign_id: row.campaign_id,
		kind: normalizeCharacterKind(row.kind),
		created_by_user_id: row.created_by_user_id,
		cloned_from_character_id: row.cloned_from_character_id,
		display_name: row.display_name,
		experience_base: row.experience_base,
		experience: row.experience,
		level: row.level,
		hp_max_base: row.hp_max_base,
		hp_current_base: row.hp_current_base,
		hp_current: row.hp_current,
		hp_max: row.hp_max,
		reputation: row.reputation,
		notes: row.notes,
		presentation: row.presentation ?? null,
		race: row.race ?? null,
		creature_type: row.creature_type ?? null,
		alignment: row.alignment ?? null,
		age: row.age ?? null,
		class_name: row.class_name ?? null,
		role_label: row.role_label ?? null,
		background: row.background ?? null,
		height: row.height ?? null,
		weight: row.weight ?? null,
		eyes: row.eyes ?? null,
		skin: row.skin ?? null,
		hair: row.hair ?? null,
		inspiration: row.inspiration === 1,
		initiative: row.initiative ?? null,
		temp_hp: row.temp_hp ?? null,
		hit_dice_remaining: row.hit_dice_remaining ?? null,
		death_save_successes: row.death_save_successes ?? 0,
		death_save_failures: row.death_save_failures ?? 0,
		personality_traits: row.personality_traits ?? null,
		ideals: row.ideals ?? null,
		bonds: row.bonds ?? null,
		flaws: row.flaws ?? null,
		backstory: row.backstory ?? null,
		allies: row.allies ?? null,
		features: row.features ?? null,
		proficiencies: row.proficiencies ?? null,
		treasure: row.treasure ?? null,
		armor_class: row.armor_class ?? null,
		armor_class_notes: row.armor_class_notes ?? null,
		speed: row.speed ?? null,
		hp_dice: row.hp_dice ?? null,
		ability_str: row.ability_str ?? null,
		ability_dex: row.ability_dex ?? null,
		ability_con: row.ability_con ?? null,
		ability_int: row.ability_int ?? null,
		ability_wis: row.ability_wis ?? null,
		ability_cha: row.ability_cha ?? null,
		skills: row.skills ?? null,
		senses: row.senses ?? null,
		languages: row.languages ?? null,
		challenge_rating: row.challenge_rating ?? null,
		traits: row.traits ?? null,
		actions: row.actions ?? null,
		is_spellcaster: row.is_spellcaster === 1,
		spellcasting_class: row.spellcasting_class ?? null,
		spellcasting_ability: (row.spellcasting_ability as SpellcastingAbilityKey | null) ?? null,
		spell_slots_total: parseSpellSlotsJson(row.spell_slots_total_json),
		spell_slots_expended: parseSpellSlotsJson(row.spell_slots_expended_json),
		mime_type: row.mime_type ?? null,
		portrait_width: row.portrait_width ?? null,
		portrait_height: row.portrait_height ?? null,
		thumb_width: row.thumb_width ?? null,
		thumb_height: row.thumb_height ?? null,
		image_source: row.image_source ?? null,
		original_mime_type: row.original_mime_type ?? null,
		original_width: row.original_width ?? null,
		original_height: row.original_height ?? null,
		thumb_crop_json: row.thumb_crop_json ?? null,
		presentation_mime_type: row.presentation_mime_type ?? null,
		presentation_width: row.presentation_width ?? null,
		presentation_height: row.presentation_height ?? null,
		presentation_thumb_width: row.presentation_thumb_width ?? null,
		presentation_thumb_height: row.presentation_thumb_height ?? null,
		presentation_image_source: row.presentation_image_source ?? null,
		presentation_original_mime_type: row.presentation_original_mime_type ?? null,
		presentation_original_width: row.presentation_original_width ?? null,
		presentation_original_height: row.presentation_original_height ?? null,
		presentation_thumb_crop_json: row.presentation_thumb_crop_json ?? null,
		portrait_media_id: row.portrait_media_id ?? null,
		presentation_media_id: row.presentation_media_id ?? null,
		date_deleted: row.date_deleted ?? null
	};
}

export function loadCharacterById(database: AppDb, characterId: string): Character | null {
	const rows = selectObjects<Parameters<typeof mapCharacterRow>[0]>(
		database,
		`SELECT ${CHARACTER_SELECT_COLUMNS} FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId }
	);

	return rows[0] ? mapCharacterRow(rows[0]) : null;
}

export function createCampaignCharacter(
	database: AppDb,
	input: CreateCampaignCharacterInput
): Character {
	const experience = input.experience ?? 0;
	const level = input.level ?? 1;
	const hpMax = input.hp_max ?? 0;
	const hpCurrent = input.hp_current ?? hpMax;

	withTransaction(database, () => {
		createCampaignCharacterInTransaction(database, input, {
			experience,
			level,
			hpMax,
			hpCurrent
		});
	});

	return loadCharacterById(database, input.character_id)!;
}

export function createCampaignCharacterInTransaction(
	database: AppDb,
	input: CreateCampaignCharacterInput,
	stats: { experience: number; level: number; hpMax: number; hpCurrent: number }
): void {
	const { experience, level, hpMax, hpCurrent } = stats;

	execSql(database, {
		sql: `INSERT INTO characters (
			character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, experience, level,
			hp_max_base, hp_current_base, hp_current, hp_max, reputation, notes,
			race, creature_type, alignment, age, class_name, role_label, presentation,
			background, height, weight, eyes, skin, hair,
			inspiration, initiative, temp_hp, hit_dice_remaining,
			death_save_successes, death_save_failures,
			personality_traits, ideals, bonds, flaws, backstory, allies, features, proficiencies, treasure,
			armor_class, armor_class_notes, speed, hp_dice,
			ability_str, ability_dex, ability_con, ability_int, ability_wis, ability_cha,
			skills, senses, languages, challenge_rating, traits, actions,
			is_spellcaster, spellcasting_class, spellcasting_ability,
			spell_slots_total_json, spell_slots_expended_json
		) VALUES (
			$character_id, $campaign_id, $kind, $created_by_user_id, $cloned_from_character_id,
			$display_name, $experience_base, $experience, $level,
			$hp_max_base, $hp_current_base, $hp_current, $hp_max, $reputation, $notes,
			$race, $creature_type, $alignment, $age, $class_name, $role_label, $presentation,
			$background, $height, $weight, $eyes, $skin, $hair,
			$inspiration, $initiative, $temp_hp, $hit_dice_remaining,
			$death_save_successes, $death_save_failures,
			$personality_traits, $ideals, $bonds, $flaws, $backstory, $allies, $features, $proficiencies, $treasure,
			$armor_class, $armor_class_notes, $speed, $hp_dice,
			$ability_str, $ability_dex, $ability_con, $ability_int, $ability_wis, $ability_cha,
			$skills, $senses, $languages, $challenge_rating, $traits, $actions,
			$is_spellcaster, $spellcasting_class, $spellcasting_ability,
			$spell_slots_total_json, $spell_slots_expended_json
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
			notes: input.notes ?? null,
			race: input.race ?? null,
			creature_type: input.creature_type ?? null,
			alignment: input.alignment ?? null,
			age: input.age ?? null,
			class_name: input.class_name ?? null,
			role_label: input.role_label ?? null,
			presentation: input.presentation ?? null,
			background: input.background ?? null,
			height: input.height ?? null,
			weight: input.weight ?? null,
			eyes: input.eyes ?? null,
			skin: input.skin ?? null,
			hair: input.hair ?? null,
			inspiration: input.inspiration ?? 0,
			initiative: input.initiative ?? null,
			temp_hp: input.temp_hp ?? null,
			hit_dice_remaining: input.hit_dice_remaining ?? null,
			death_save_successes: input.death_save_successes ?? 0,
			death_save_failures: input.death_save_failures ?? 0,
			personality_traits: input.personality_traits ?? null,
			ideals: input.ideals ?? null,
			bonds: input.bonds ?? null,
			flaws: input.flaws ?? null,
			backstory: input.backstory ?? null,
			allies: input.allies ?? null,
			features: input.features ?? null,
			proficiencies: input.proficiencies ?? null,
			treasure: input.treasure ?? null,
			armor_class: input.armor_class ?? null,
			armor_class_notes: input.armor_class_notes ?? null,
			speed: input.speed ?? null,
			hp_dice: input.hp_dice ?? null,
			ability_str: input.ability_str ?? null,
			ability_dex: input.ability_dex ?? null,
			ability_con: input.ability_con ?? null,
			ability_int: input.ability_int ?? null,
			ability_wis: input.ability_wis ?? null,
			ability_cha: input.ability_cha ?? null,
			skills: input.skills ?? null,
			senses: input.senses ?? null,
			languages: input.languages ?? null,
			challenge_rating: input.challenge_rating ?? null,
			traits: input.traits ?? null,
			actions: input.actions ?? null,
			is_spellcaster: input.is_spellcaster ?? 0,
			spellcasting_class: input.spellcasting_class ?? null,
			spellcasting_ability: input.spellcasting_ability ?? null,
			spell_slots_total_json: input.spell_slots_total_json ?? null,
			spell_slots_expended_json: input.spell_slots_expended_json ?? null
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
}

export function updateCampaignCharacter(
	database: AppDb,
	input: UpdateCampaignCharacterInput
): Character {
	const existing = loadCharacterById(database, input.character_id);
	if (!existing) {
		throw new Error('Character not found');
	}

	const kind = normalizeCharacterKind(input.kind);

	withTransaction(database, () => {
		execSql(database, {
			sql: `UPDATE characters SET
			kind = $kind,
			display_name = $display_name,
			reputation = $reputation,
			notes = $notes,
			race = $race,
			creature_type = $creature_type,
			alignment = $alignment,
			age = $age,
			class_name = $class_name,
			role_label = $role_label,
			presentation = $presentation,
			background = $background,
			height = $height,
			weight = $weight,
			eyes = $eyes,
			skin = $skin,
			hair = $hair,
			inspiration = $inspiration,
			initiative = $initiative,
			temp_hp = $temp_hp,
			hit_dice_remaining = $hit_dice_remaining,
			death_save_successes = $death_save_successes,
			death_save_failures = $death_save_failures,
			personality_traits = $personality_traits,
			ideals = $ideals,
			bonds = $bonds,
			flaws = $flaws,
			backstory = $backstory,
			allies = $allies,
			features = $features,
			proficiencies = $proficiencies,
			treasure = $treasure,
			armor_class = $armor_class,
			armor_class_notes = $armor_class_notes,
			speed = $speed,
			hp_dice = $hp_dice,
			ability_str = $ability_str,
			ability_dex = $ability_dex,
			ability_con = $ability_con,
			ability_int = $ability_int,
			ability_wis = $ability_wis,
			ability_cha = $ability_cha,
			skills = $skills,
			senses = $senses,
			languages = $languages,
			challenge_rating = $challenge_rating,
			traits = $traits,
			actions = $actions,
			is_spellcaster = $is_spellcaster,
			spellcasting_class = $spellcasting_class,
			spellcasting_ability = $spellcasting_ability,
			spell_slots_total_json = $spell_slots_total_json,
			spell_slots_expended_json = $spell_slots_expended_json
		WHERE character_id = $character_id`,
			bind: {
				character_id: input.character_id,
				kind,
				display_name: input.display_name.trim(),
				reputation: input.reputation ?? null,
				notes: input.notes ?? null,
				race: input.race ?? null,
				creature_type: input.creature_type ?? null,
				alignment: input.alignment ?? null,
				age: input.age ?? null,
				class_name: input.class_name ?? null,
				role_label: input.role_label ?? null,
				presentation: input.presentation ?? null,
				background: input.background ?? null,
				height: input.height ?? null,
				weight: input.weight ?? null,
				eyes: input.eyes ?? null,
				skin: input.skin ?? null,
				hair: input.hair ?? null,
				inspiration: input.inspiration ?? 0,
				initiative: input.initiative ?? null,
				temp_hp: input.temp_hp ?? null,
				hit_dice_remaining: input.hit_dice_remaining ?? null,
				death_save_successes: input.death_save_successes ?? 0,
				death_save_failures: input.death_save_failures ?? 0,
				personality_traits: input.personality_traits ?? null,
				ideals: input.ideals ?? null,
				bonds: input.bonds ?? null,
				flaws: input.flaws ?? null,
				backstory: input.backstory ?? null,
				allies: input.allies ?? null,
				features: input.features ?? null,
				proficiencies: input.proficiencies ?? null,
				treasure: input.treasure ?? null,
				armor_class: input.armor_class ?? null,
				armor_class_notes: input.armor_class_notes ?? null,
				speed: input.speed ?? null,
				hp_dice: input.hp_dice ?? null,
				ability_str: input.ability_str ?? null,
				ability_dex: input.ability_dex ?? null,
				ability_con: input.ability_con ?? null,
				ability_int: input.ability_int ?? null,
				ability_wis: input.ability_wis ?? null,
				ability_cha: input.ability_cha ?? null,
				skills: input.skills ?? null,
				senses: input.senses ?? null,
				languages: input.languages ?? null,
				challenge_rating: input.challenge_rating ?? null,
				traits: input.traits ?? null,
				actions: input.actions ?? null,
				is_spellcaster: input.is_spellcaster ?? 0,
				spellcasting_class: input.spellcasting_class ?? null,
				spellcasting_ability: input.spellcasting_ability ?? null,
				spell_slots_total_json: input.spell_slots_total_json ?? null,
				spell_slots_expended_json: input.spell_slots_expended_json ?? null
			}
		});

		if (input.loadout) {
			clearCharacterLoadout(database, input.character_id);
			attachCharacterLoadout(database, input.character_id, input.loadout);
		}
	});

	return loadCharacterById(database, input.character_id)!;
}

export function updateCharacterPortrait(
	database: AppDb,
	input: UpdateCharacterPortraitInput,
	thumbBuffer: ArrayBuffer,
	fullBuffer: ArrayBuffer | null,
	originalBuffer: ArrayBuffer | null
): Character {
	const setClauses = [
		'thumb_width = $thumb_width',
		'thumb_height = $thumb_height',
		'thumb_blob = $thumb_blob',
		'thumb_crop_json = $thumb_crop_json',
		'image_source = $image_source'
	];
	const bind: Record<string, unknown> = {
		character_id: input.character_id,
		thumb_width: input.thumb_width,
		thumb_height: input.thumb_height,
		thumb_blob: new Uint8Array(thumbBuffer),
		thumb_crop_json: input.thumb_crop_json,
		image_source: input.image_source ?? null
	};

	if (fullBuffer) {
		setClauses.push(
			'mime_type = $mime_type',
			'portrait_width = $portrait_width',
			'portrait_height = $portrait_height',
			'full_blob = $full_blob',
			'portrait_media_id = NULL'
		);
		bind.mime_type = input.mime_type;
		bind.portrait_width = input.portrait_width;
		bind.portrait_height = input.portrait_height;
		bind.full_blob = new Uint8Array(fullBuffer);
	} else if (input.portrait_media_id) {
		setClauses.push(
			'portrait_media_id = $portrait_media_id',
			'mime_type = $mime_type',
			'portrait_width = $portrait_width',
			'portrait_height = $portrait_height',
			'full_blob = NULL',
			'original_blob = NULL'
		);
		bind.portrait_media_id = input.portrait_media_id;
		bind.mime_type = input.mime_type;
		bind.portrait_width = input.portrait_width;
		bind.portrait_height = input.portrait_height;
	}

	if (originalBuffer) {
		setClauses.push(
			'original_mime_type = $original_mime_type',
			'original_width = $original_width',
			'original_height = $original_height',
			'original_blob = $original_blob'
		);
		bind.original_mime_type = input.original_mime_type;
		bind.original_width = input.original_width;
		bind.original_height = input.original_height;
		bind.original_blob = new Uint8Array(originalBuffer);
	}

	execSql(database, {
		sql: `UPDATE characters SET ${setClauses.join(', ')} WHERE character_id = $character_id`,
		bind
	});

	const character = loadCharacterById(database, input.character_id);
	if (!character) {
		throw new Error('Character not found');
	}

	return character;
}

export function updateCharacterPresentation(
	database: AppDb,
	input: UpdateCharacterPresentationInput,
	thumbBuffer: ArrayBuffer,
	fullBuffer: ArrayBuffer | null,
	originalBuffer: ArrayBuffer | null
): Character {
	const setClauses = [
		'presentation_thumb_width = $presentation_thumb_width',
		'presentation_thumb_height = $presentation_thumb_height',
		'presentation_thumb_blob = $presentation_thumb_blob',
		'presentation_thumb_crop_json = $presentation_thumb_crop_json',
		'presentation_image_source = $presentation_image_source'
	];
	const bind: Record<string, unknown> = {
		character_id: input.character_id,
		presentation_thumb_width: input.presentation_thumb_width,
		presentation_thumb_height: input.presentation_thumb_height,
		presentation_thumb_blob: new Uint8Array(thumbBuffer),
		presentation_thumb_crop_json: input.presentation_thumb_crop_json,
		presentation_image_source: input.presentation_image_source ?? null
	};

	if (fullBuffer) {
		setClauses.push(
			'presentation_mime_type = $presentation_mime_type',
			'presentation_width = $presentation_width',
			'presentation_height = $presentation_height',
			'presentation_full_blob = $presentation_full_blob',
			'presentation_media_id = NULL'
		);
		bind.presentation_mime_type = input.presentation_mime_type;
		bind.presentation_width = input.presentation_width;
		bind.presentation_height = input.presentation_height;
		bind.presentation_full_blob = new Uint8Array(fullBuffer);
	} else if (input.presentation_media_id) {
		setClauses.push(
			'presentation_media_id = $presentation_media_id',
			'presentation_mime_type = $presentation_mime_type',
			'presentation_width = $presentation_width',
			'presentation_height = $presentation_height',
			'presentation_full_blob = NULL',
			'presentation_original_blob = NULL'
		);
		bind.presentation_media_id = input.presentation_media_id;
		bind.presentation_mime_type = input.presentation_mime_type;
		bind.presentation_width = input.presentation_width;
		bind.presentation_height = input.presentation_height;
	}

	if (originalBuffer) {
		setClauses.push(
			'presentation_original_mime_type = $presentation_original_mime_type',
			'presentation_original_width = $presentation_original_width',
			'presentation_original_height = $presentation_original_height',
			'presentation_original_blob = $presentation_original_blob'
		);
		bind.presentation_original_mime_type = input.presentation_original_mime_type;
		bind.presentation_original_width = input.presentation_original_width;
		bind.presentation_original_height = input.presentation_original_height;
		bind.presentation_original_blob = new Uint8Array(originalBuffer);
	}

	execSql(database, {
		sql: `UPDATE characters SET ${setClauses.join(', ')} WHERE character_id = $character_id`,
		bind
	});

	const character = loadCharacterById(database, input.character_id);
	if (!character) {
		throw new Error('Character not found');
	}

	return character;
}

export function updateCharacterPortraitSource(
	database: AppDb,
	characterId: string,
	imageSource: string | null
): Character {
	execSql(database, {
		sql: `UPDATE characters SET image_source = $image_source WHERE character_id = $character_id`,
		bind: {
			character_id: characterId,
			image_source: imageSource
		}
	});

	const character = loadCharacterById(database, characterId);
	if (!character) {
		throw new Error('Character not found');
	}

	return character;
}

export function updateCharacterPresentationSource(
	database: AppDb,
	characterId: string,
	presentationImageSource: string | null
): Character {
	execSql(database, {
		sql: `UPDATE characters SET presentation_image_source = $presentation_image_source WHERE character_id = $character_id`,
		bind: {
			character_id: characterId,
			presentation_image_source: presentationImageSource
		}
	});

	const character = loadCharacterById(database, characterId);
	if (!character) {
		throw new Error('Character not found');
	}

	return character;
}

export function removeCampaignNpcFromCampaign(
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

export function addCampaignNpcToCampaign(
	database: AppDb,
	input: AddCampaignNpcToCampaignInput
): AddCampaignNpcToCampaignResult {
	const rows = selectObjects<Character>(
		database,
		`SELECT ${CHARACTER_SELECT_COLUMNS} FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId: input.character_id }
	);

	const character = rows[0];
	if (!character || !isNpcCharacterKind(character.kind) || character.date_deleted) {
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

function loadCharacterImageBlob(
	database: AppDb,
	characterId: string,
	variant: 'thumb' | 'full' | 'original',
	columns: { thumb: string; full: string; original: string; mediaId: string }
): ArrayBuffer | null {
	const rows = selectObjects<{
		thumb_blob: Uint8Array | null;
		full_blob: Uint8Array | null;
		original_blob: Uint8Array | null;
		media_id: string | null;
	}>(
		database,
		`SELECT ${columns.thumb} AS thumb_blob, ${columns.full} AS full_blob,
			${columns.original} AS original_blob, ${columns.mediaId} AS media_id
		 FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId }
	);

	const row = rows[0];
	if (!row) return null;

	if (variant === 'thumb') {
		const thumbBytes = row.thumb_blob;
		if (thumbBytes?.byteLength) {
			return bufferFromBytes(thumbBytes);
		}
		if (row.media_id) {
			return (
				loadMediaAssetBlob(database, row.media_id, 'thumb') ??
				loadMediaAssetBlob(database, row.media_id, 'full')
			);
		}
		return null;
	}

	const column = variant === 'original' ? 'original_blob' : 'full_blob';
	const bytes = row[column];
	if (bytes?.byteLength) {
		return bufferFromBytes(bytes);
	}

	if (row.media_id) {
		return loadMediaAssetBlob(
			database,
			row.media_id,
			variant === 'original' ? 'original' : 'full'
		);
	}

	return null;
}

export function loadCharacterPortraitBlob(
	database: AppDb,
	characterId: string,
	variant: 'thumb' | 'full' | 'original'
): ArrayBuffer | null {
	return loadCharacterImageBlob(database, characterId, variant, {
		thumb: 'thumb_blob',
		full: 'full_blob',
		original: 'original_blob',
		mediaId: 'portrait_media_id'
	});
}

export function loadCharacterPresentationBlob(
	database: AppDb,
	characterId: string,
	variant: 'thumb' | 'full' | 'original'
): ArrayBuffer | null {
	return loadCharacterImageBlob(database, characterId, variant, {
		thumb: 'presentation_thumb_blob',
		full: 'presentation_full_blob',
		original: 'presentation_original_blob',
		mediaId: 'presentation_media_id'
	});
}
