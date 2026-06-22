import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story';
import { isRewardGroupId, rewardGroupId } from '$lib/domain/story-item-reward';
import type { StoryItem, StoryNode } from '$lib/types/schema';

export type PromoteAdventureOptions = {
	copyMaps: boolean;
	copyNpcs: boolean;
};

export type IdMap = Map<string, string>;

export function remapNodeLayout(
	layout: PartNodeLayout | null,
	nodeIdMap: IdMap
): PartNodeLayout | null {
	if (!layout) return null;

	const next: PartNodeLayout = {};
	for (const [nodeId, position] of Object.entries(layout)) {
		next[nodeIdMap.get(nodeId) ?? nodeId] = position;
	}

	return next;
}

export function remapItemLayout(
	layout: PartItemLayout | null,
	itemIdMap: IdMap,
	nodeIdMap: IdMap
): PartItemLayout | null {
	if (!layout) return null;

	const next: PartItemLayout = {};
	for (const [itemId, position] of Object.entries(layout)) {
		if (isRewardGroupId(itemId)) {
			const parentNodeId = itemId.slice('reward:'.length);
			const remappedParent = nodeIdMap.get(parentNodeId) ?? parentNodeId;
			next[rewardGroupId(remappedParent)] = position;
			continue;
		}

		next[itemIdMap.get(itemId) ?? itemId] = position;
	}

	return next;
}

export function remapStoryNodes(nodes: StoryNode[], nodeIdMap: IdMap): StoryNode[] {
	return nodes.map((node) => ({
		...node,
		node_id: nodeIdMap.get(node.node_id) ?? node.node_id,
		parent_node_ids: (node.parent_node_ids ?? []).map(
			(parentId) => nodeIdMap.get(parentId) ?? parentId
		)
	}));
}

export function remapStoryItems(
	items: StoryItem[],
	nodeIdMap: IdMap,
	itemIdMap: IdMap,
	characterIdMap: IdMap,
	mapIdMap: IdMap,
	options: Pick<PromoteAdventureOptions, 'copyNpcs' | 'copyMaps'>
): StoryItem[] {
	return items.map((item) => {
		const next: StoryItem = {
			...item,
			item_id: itemIdMap.get(item.item_id) ?? item.item_id,
			parent_node_id: nodeIdMap.get(item.parent_node_id) ?? item.parent_node_id
		};

		if (item.character_id) {
			next.character_id = options.copyNpcs ? (characterIdMap.get(item.character_id) ?? null) : null;
		}

		if (item.map_id) {
			next.map_id = options.copyMaps ? (mapIdMap.get(item.map_id) ?? null) : null;
		}

		return next;
	});
}
