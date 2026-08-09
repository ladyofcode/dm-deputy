import { execSql, selectObjects } from '../bind';
import { withTransaction } from '../sql';
import {
  parseSessionZeroJson,
  serializeSessionZeroJson,
  trimSessionZeroAnswers
} from '$lib/domain/session-zero-questions';
import type {
  AddCampaignPcToCampaignInput,
  AddCampaignPcToCampaignResult,
  AddCampaignPlayerInput,
  AddCampaignPlayerResult,
  CampaignSnapshot,
  CreateAdventureInput,
  CreateCampaignInput,
  CreateCampaignPlayerInput,
  UpdateCampaignDetailsInput,
  UpdateSessionZeroAnswersInput
} from '../types';
import type { CampaignSessionZero, Character, Part } from '$lib/types/schema';
import { isNpcCharacterKind, normalizeCharacterKind } from '$lib/types/schema';
import { CHARACTER_SELECT_COLUMNS, type AppDb } from './context';
import { mapCharacterRow, loadCharacterById } from './characters';
import { loadCampaignMapsMetadata } from './maps';

export function loadCampaignSnapshot(database: AppDb): CampaignSnapshot {
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
		nickname: campaign.nickname ?? null,
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
		shorthand: adventure.shorthand ?? null,
		can_promote_to_campaign: Boolean(adventure.can_promote_to_campaign)
	}));
	const parts = selectObjects<CampaignSnapshot['parts'][number]>(database, 'SELECT * FROM parts');
	const characters = selectObjects<Parameters<typeof mapCharacterRow>[0]>(
		database,
		`SELECT ${CHARACTER_SELECT_COLUMNS} FROM characters`
	).map((character) => mapCharacterRow(character));
	const maps = loadCampaignMapsMetadata(database);
	const sessionZero = loadCampaignSessionZero(database);

	return { users, campaigns, campaignMembers, campaignNpcs, adventures, parts, characters, maps, sessionZero };
}

export function loadCampaignSessionZero(database: AppDb): CampaignSessionZero[] {
	return selectObjects<{
		campaign_id: string;
		answers_json: string;
		date_updated: string;
	}>(database, 'SELECT campaign_id, answers_json, date_updated FROM campaign_session_zero').map((row) => {
		const state = parseSessionZeroJson(row.answers_json);

		return {
			campaign_id: row.campaign_id,
			answers: state.answers,
			activeQuestionIds: state.activeQuestionIds,
			date_updated: row.date_updated
		};
	});
}

export function deletePartsCascade(database: AppDb, partIds: string[]): void {
	if (partIds.length === 0) return;

	const placeholders = partIds.map((_, index) => `$partId_${index}`).join(', ');
	const bind = Object.fromEntries(partIds.map((partId, index) => [`partId_${index}`, partId]));

	for (const table of [
		'story_nodes',
		'part_node_layouts',
		'part_item_layouts',
		'story_items'
	] as const) {
		execSql(database, {
			sql: `DELETE FROM ${table} WHERE part_id IN (${placeholders})`,
			bind
		});
	}

	execSql(database, {
		sql: `DELETE FROM parts WHERE part_id IN (${placeholders})`,
		bind
	});
}

export function insertCampaignPlayer(
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
			display_name: player.display_name,
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

	return loadCharacterById(database, player.character_id)!;
}

export function addCampaignPlayer(
	database: AppDb,
	input: AddCampaignPlayerInput
): AddCampaignPlayerResult {
	const username = input.username.trim();
	if (!username) {
		throw new Error('Player name is required');
	}

	const displayName = input.display_name.trim();
	if (!displayName) {
		throw new Error('Character name is required');
	}

	const character = insertCampaignPlayer(
		database,
		input.campaign_id,
		input.owner_user_id,
		input.date_created,
		{
			user_id: input.user_id,
			username,
			display_name: displayName,
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

export function removeCampaignPlayer(database: AppDb, campaignId: string, characterId: string): void {
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

export function addCampaignPcToCampaign(
	database: AppDb,
	input: AddCampaignPcToCampaignInput
): AddCampaignPcToCampaignResult {
	const characterRows = selectObjects<Character>(
		database,
		`SELECT ${CHARACTER_SELECT_COLUMNS} FROM characters WHERE character_id = $characterId LIMIT 1`,
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

export function createCampaign(database: AppDb, input: CreateCampaignInput): void {
	withTransaction(database, () => {
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
	});
}

export function createAdventure(database: AppDb, input: CreateAdventureInput): void {
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

export function updateAdventurePromote(database: AppDb, adventureId: string, canPromote: boolean): void {
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

export function updateUserTheme(database: AppDb, userId: string, theme: string): void {
	execSql(database, {
		sql: `UPDATE users SET theme = $theme WHERE user_id = $user_id`,
		bind: { user_id: userId, theme }
	});
}

export function updateUserUsername(database: AppDb, userId: string, username: string): void {
	const trimmed = username.trim();
	if (!trimmed) {
		throw new Error('Player name is required');
	}

	execSql(database, {
		sql: `UPDATE users SET username = $username WHERE user_id = $user_id`,
		bind: { user_id: userId, username: trimmed }
	});
}

export function softDeletePlayer(database: AppDb, userId: string): string {
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

export function softDeleteNpc(database: AppDb, characterId: string): string {
	const rows = selectObjects<{ kind: string; date_deleted: string | null }>(
		database,
		`SELECT kind, date_deleted FROM characters WHERE character_id = $characterId LIMIT 1`,
		{ characterId }
	);

	if (!rows[0]) {
		throw new Error('NPC not found');
	}

	if (!isNpcCharacterKind(normalizeCharacterKind(rows[0].kind))) {
		throw new Error('Only NPCs can be removed from the library');
	}

	if (rows[0].date_deleted) {
		throw new Error('NPC has already been removed from the library');
	}

	const deletedAt = new Date().toISOString();

	execSql(database, {
		sql: `UPDATE characters SET date_deleted = $date_deleted WHERE character_id = $character_id`,
		bind: {
			character_id: characterId,
			date_deleted: deletedAt
		}
	});

	return deletedAt;
}

export function softDeleteCampaign(database: AppDb, campaignId: string): string {
	const rows = selectObjects<{ date_deleted: string | null }>(
		database,
		`SELECT date_deleted FROM campaigns WHERE campaign_id = $campaignId LIMIT 1`,
		{ campaignId }
	);

	if (!rows[0]) {
		throw new Error('Campaign not found');
	}

	if (rows[0].date_deleted) {
		throw new Error('Campaign has already been deleted');
	}

	const deletedAt = new Date().toISOString();

	execSql(database, {
		sql: `UPDATE campaigns SET date_deleted = $date_deleted WHERE campaign_id = $campaign_id`,
		bind: {
			campaign_id: campaignId,
			date_deleted: deletedAt
		}
	});

	return deletedAt;
}

export function updateCampaignTheme(database: AppDb, campaignId: string, theme: string): void {
	execSql(database, {
		sql: `UPDATE campaigns SET theme = $theme WHERE campaign_id = $campaign_id`,
		bind: { campaign_id: campaignId, theme }
	});
}

export function updateCampaignDetails(
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

	const nickname = input.nickname?.trim() || null;
	const description = input.description?.trim() || null;

	execSql(database, {
		sql: `UPDATE campaigns
			SET campaign_name = $campaign_name, nickname = $nickname, description = $description
			WHERE campaign_id = $campaign_id`,
		bind: {
			campaign_id: input.campaign_id,
			campaign_name: campaignName,
			nickname,
			description
		}
	});

	return {
		...existing,
		campaign_name: campaignName,
		nickname,
		description
	};
}

export function updateAdventureShorthand(
	database: AppDb,
	input: import('../types').UpdateAdventureShorthandInput
): import('$lib/types/schema').Adventure {
	const rows = selectObjects<import('$lib/types/schema').Adventure>(
		database,
		`SELECT * FROM adventures WHERE adventure_id = $adventure_id LIMIT 1`,
		{ adventure_id: input.adventure_id }
	);

	const existing = rows[0];
	if (!existing) {
		throw new Error('Adventure not found');
	}

	const shorthand = input.shorthand?.trim() || null;

	execSql(database, {
		sql: `UPDATE adventures
			SET shorthand = $shorthand
			WHERE adventure_id = $adventure_id`,
		bind: {
			adventure_id: input.adventure_id,
			shorthand
		}
	});

	return {
		...existing,
		shorthand,
		can_promote_to_campaign: Boolean(existing.can_promote_to_campaign)
	};
}

export function updateSessionZeroAnswers(
	database: AppDb,
	input: UpdateSessionZeroAnswersInput
): CampaignSessionZero {
	const rows = selectObjects<import('$lib/types/schema').Campaign>(
		database,
		`SELECT campaign_id FROM campaigns WHERE campaign_id = $campaign_id LIMIT 1`,
		{ campaign_id: input.campaign_id }
	);

	if (!rows[0]) {
		throw new Error('Campaign not found');
	}

	const answers = trimSessionZeroAnswers(input.answers);
	const activeQuestionIds = input.activeQuestionIds;
	const dateUpdated = new Date().toISOString();

	execSql(database, {
		sql: `INSERT INTO campaign_session_zero (campaign_id, answers_json, date_updated)
			VALUES ($campaign_id, $answers_json, $date_updated)
			ON CONFLICT(campaign_id) DO UPDATE SET
				answers_json = excluded.answers_json,
				date_updated = excluded.date_updated`,
		bind: {
			campaign_id: input.campaign_id,
			answers_json: serializeSessionZeroJson({ answers, activeQuestionIds }),
			date_updated: dateUpdated
		}
	});

	return {
		campaign_id: input.campaign_id,
		answers,
		activeQuestionIds,
		date_updated: dateUpdated
	};
}

export function syncAdventureParts(database: AppDb, adventureId: string, parts: Part[]): void {
	withTransaction(database, () => {
		const existing = selectObjects<{ part_id: string }>(
			database,
			'SELECT part_id FROM parts WHERE adventure_id = $adventureId',
			{ adventureId }
		);
		const nextIds = new Set(parts.map((part) => part.part_id));
		const removedIds = existing.map((row) => row.part_id).filter((partId) => !nextIds.has(partId));

		deletePartsCascade(database, removedIds);

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
	});
}

export function touchCampaign(database: AppDb, userId: string, campaignId: string): void {
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
