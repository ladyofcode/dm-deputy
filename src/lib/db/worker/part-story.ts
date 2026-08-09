import { execSql, selectObjects } from '../bind';
import { withTransaction } from '../sql';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../json';
import type {
	PartStorySnapshot,
	SavePartStoryInput,
	AddPartNpcInput,
	AddPartNpcResult
} from '../types';
import type { StoryItem, StoryNode, PartNpc } from '$lib/types/schema';
import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story-layout';
import type { AppDb } from './context';

export function loadPartStory(database: AppDb, partId: string): PartStorySnapshot {
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
					parent_node_ids: safeJsonParseArray(row.parent_node_ids),
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
		nodeLayout: nodeLayoutRow
			? safeJsonParseObject<PartNodeLayout>(nodeLayoutRow.layout_json, {})
			: null,
		itemLayout: itemLayoutRow
			? safeJsonParseObject<PartItemLayout>(itemLayoutRow.layout_json, {})
			: null,
		items: loadPartStoryItems(database, partId),
		partNpcs: loadPartNpcs(database, partId)
	};
}

export function loadPartNpcs(database: AppDb, partId: string): PartNpc[] | null {
	const rows = selectObjects<{
		part_npc_id: string;
		part_id: string;
		character_id: string;
		date_added: string;
	}>(database, 'SELECT * FROM part_npcs WHERE part_id = $partId ORDER BY date_added', { partId });

	if (!rows.length) return null;

	return rows.map((row) => ({
		part_npc_id: row.part_npc_id,
		part_id: row.part_id,
		character_id: row.character_id,
		date_added: row.date_added
	}));
}

export function addPartNpc(database: AppDb, input: AddPartNpcInput): AddPartNpcResult {
	const existing = selectObjects<{ part_npc_id: string }>(
		database,
		`SELECT part_npc_id FROM part_npcs
			WHERE part_id = $part_id AND character_id = $character_id LIMIT 1`,
		{ part_id: input.part_id, character_id: input.character_id }
	)[0];

	if (existing) {
		return {
			partNpc: {
				part_npc_id: existing.part_npc_id,
				part_id: input.part_id,
				character_id: input.character_id,
				date_added: input.date_added
			}
		};
	}

	execSql(database, {
		sql: `INSERT INTO part_npcs (part_npc_id, part_id, character_id, date_added)
			VALUES ($part_npc_id, $part_id, $character_id, $date_added)`,
		bind: {
			part_npc_id: input.part_npc_id,
			part_id: input.part_id,
			character_id: input.character_id,
			date_added: input.date_added
		}
	});

	return {
		partNpc: {
			part_npc_id: input.part_npc_id,
			part_id: input.part_id,
			character_id: input.character_id,
			date_added: input.date_added
		}
	};
}

export function removePartNpc(database: AppDb, partId: string, characterId: string): void {
	execSql(database, {
		sql: `DELETE FROM part_npcs
			WHERE part_id = $part_id AND character_id = $character_id`,
		bind: { part_id: partId, character_id: characterId }
	});
}

export function loadPartStoryItems(database: AppDb, partId: string): StoryItem[] | null {
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
		const payload = safeJsonParse<Partial<StoryItem>>(row.payload_json, {});
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
			is_reward: Boolean(kind === 'xp' ? true : (row.is_reward ?? payload.is_reward ?? false))
		};
	});
}

export function savePartStoryItems(database: AppDb, partId: string, items: StoryItem[]): void {
	withTransaction(database, () => {
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
	});
}

export function savePartStoryNodes(database: AppDb, partId: string, nodes: StoryNode[]): void {
	withTransaction(database, () => {
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
	});
}

export function savePartNodeLayout(database: AppDb, partId: string, layout: PartNodeLayout): void {
	execSql(database, {
		sql: `INSERT INTO part_node_layouts (part_id, layout_json) VALUES ($partId, $layout_json)
			ON CONFLICT(part_id) DO UPDATE SET layout_json = excluded.layout_json`,
		bind: { partId, layout_json: JSON.stringify(layout) }
	});
}

export function savePartItemLayout(database: AppDb, partId: string, layout: PartItemLayout): void {
	execSql(database, {
		sql: `INSERT INTO part_item_layouts (part_id, layout_json) VALUES ($partId, $layout_json)
			ON CONFLICT(part_id) DO UPDATE SET layout_json = excluded.layout_json`,
		bind: { partId, layout_json: JSON.stringify(layout) }
	});
}

export function savePartStory(database: AppDb, input: SavePartStoryInput): void {
	withTransaction(database, () => {
		if (input.nodes) {
			savePartStoryNodes(database, input.partId, input.nodes);
		}

		if (input.nodeLayout) {
			savePartNodeLayout(database, input.partId, input.nodeLayout);
		}

		if (input.itemLayout) {
			savePartItemLayout(database, input.partId, input.itemLayout);
		}

		if (input.items) {
			savePartStoryItems(database, input.partId, input.items);
		}
	});
}

export function activateStoryNode(database: AppDb, partId: string, nodeId: string): string {
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

export function toggleStoryNodeCompleted(
	database: AppDb,
	partId: string,
	nodeId: string
): string | null {
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
