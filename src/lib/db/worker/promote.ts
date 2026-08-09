import { execSql, selectObjects } from '../bind';
import { withTransaction } from '../sql';
import {
	remapItemLayout,
	remapNodeLayout,
	remapStoryItems,
	remapStoryNodes
} from '$lib/domain/promote-adventure';
import { isRewardGroupId } from '$lib/domain/story-item-reward';
import type { PromoteAdventureInput, PromoteAdventureResult } from '../types';
import type { Part } from '$lib/types/schema';
import { normalizeCharacterKind } from '$lib/types/schema';
import type { AppDb } from './context';
import { attachCharacterLoadout, insertCampaignNpcLink } from './characters';
import { createAdventure, touchCampaign } from './campaigns';
import {
	loadPartStory,
	savePartItemLayout,
	savePartNodeLayout,
	savePartStoryItems,
	savePartStoryNodes,
	addPartNpc
} from './part-story';

export function cloneCharacterFromDb(
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
	const spellRows = selectObjects<{ spell_id: string; prepared: number }>(
		database,
		'SELECT spell_id, prepared FROM character_spells WHERE character_id = $characterId',
		{ characterId: sourceCharacterId }
	).map((row) => ({
		spell_id: row.spell_id,
		prepared: row.prepared === 1
	}));

	if (weaponIds.length || armorIds.length || itemIds.length || spellRows.length) {
		attachCharacterLoadout(database, newCharacterId, {
			weapon_ids: weaponIds,
			armor_ids: armorIds,
			item_ids: itemIds,
			spells: spellRows
		});
	}
}

export function cloneMapFromDb(
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

export function promoteAdventureToCampaign(
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
	let result!: PromoteAdventureResult;

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
				? remapStoryItems(
						story.items,
						nodeIdMap,
						itemIdMap,
						characterIdMap,
						mapIdMap,
						input.options
					)
				: [];
			if (items.length) {
				savePartStoryItems(database, newPartId, items);
			}

			for (const partNpc of story.partNpcs ?? []) {
				const mappedCharacterId = characterIdMap.get(partNpc.character_id);
				if (!mappedCharacterId) continue;

				addPartNpc(database, {
					part_id: newPartId,
					character_id: mappedCharacterId,
					part_npc_id: `pnpc-${crypto.randomUUID()}`,
					date_added: partNpc.date_added
				});
			}
		}

		touchCampaign(database, input.owner_user_id, newCampaignId);

		result = {
			campaign_id: newCampaignId,
			adventure_id: newAdventureId,
			part_ids: newPartIds
		};
	});

	return result;
}
