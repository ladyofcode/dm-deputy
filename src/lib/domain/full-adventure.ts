import { isStoryItemReward, rewardXpFromItems } from '$lib/domain/story-item-reward';
import { buildStoryNodeForest, type StoryNodeTreeItem } from '$lib/domain/story-node-tree';
import type { Part, StoryItem, StoryNode, EncounterXpAward } from '$lib/types/schema';

export type FullAdventureContextItem = {
	item: StoryItem;
	kind: 'note' | 'npc' | 'money' | 'map' | 'item' | 'other';
};

export type FullAdventureRewardCatalogGroup = 'weapon' | 'armor' | 'item';

export type FullAdventureNodeSection = {
	part: Part;
	node: StoryNode;
	narrativeNotes: StoryItem[];
	contextItems: FullAdventureContextItem[];
	rewardItems: StoryItem[];
};

export type NodeXpAwardLine = {
	characterName: string;
	amount: number;
	description: string | null;
};

export function buildNodeXpAwardLines(
	awards: EncounterXpAward[],
	characterNameFor: (characterId: string) => string
): NodeXpAwardLine[] {
	return awards.map((award) => ({
		characterName: characterNameFor(award.character_id),
		amount: award.amount,
		description: award.description
	}));
}

export function groupXpAwardsByEventId(
	awards: EncounterXpAward[]
): Map<string, EncounterXpAward[]> {
	const grouped = new Map<string, EncounterXpAward[]>();

	for (const award of awards) {
		const list = grouped.get(award.event_id) ?? [];
		list.push(award);
		grouped.set(award.event_id, list);
	}

	return grouped;
}

export type FullAdventurePartBlock = {
	part: Part;
	sections: FullAdventureNodeSection[];
};

export function uniqueNodesInTreeOrder(nodes: StoryNode[]): StoryNode[] {
	const seen = new Set<string>();
	const ordered: StoryNode[] = [];

	function walk(items: StoryNodeTreeItem[]) {
		for (const item of items) {
			if (!seen.has(item.node.node_id)) {
				seen.add(item.node.node_id);
				ordered.push(item.node);
			}
			walk(item.children);
		}
	}

	walk(buildStoryNodeForest(nodes));

	for (const node of nodes) {
		if (!seen.has(node.node_id)) {
			ordered.push(node);
		}
	}

	return ordered;
}

function contextKindForItem(item: StoryItem): FullAdventureContextItem['kind'] {
	switch (item.kind) {
		case 'note':
			return 'note';
		case 'npc':
			return 'npc';
		case 'money':
			return 'money';
		case 'map':
			return 'map';
		case 'item':
			return 'item';
		default:
			return 'other';
	}
}

function splitNodeItems(
	nodeId: string,
	items: StoryItem[]
): Pick<FullAdventureNodeSection, 'narrativeNotes' | 'contextItems' | 'rewardItems'> {
	const nodeItems = items.filter((item) => item.parent_node_id === nodeId);
	const rewardItems = nodeItems.filter(isStoryItemReward);
	const nonRewards = nodeItems.filter((item) => !isStoryItemReward(item));

	const narrativeNotes = nonRewards.filter((item) => item.kind === 'note' && item.note_text?.trim());
	const contextItems = nonRewards
		.filter((item) => item.kind !== 'note')
		.map((item) => ({ item, kind: contextKindForItem(item) }));

	return { narrativeNotes, contextItems, rewardItems };
}

export function buildFullAdventurePartBlocks(
	parts: Part[],
	nodesByPartId: Map<string, StoryNode[]>,
	itemsByPartId: Map<string, StoryItem[]>
): FullAdventurePartBlock[] {
	return parts
		.map((part) => {
			const nodes = nodesByPartId.get(part.part_id) ?? [];
			const items = itemsByPartId.get(part.part_id) ?? [];

			const sections = uniqueNodesInTreeOrder(nodes).map((node) => ({
				part,
				node,
				...splitNodeItems(node.node_id, items)
			}));

			return { part, sections };
		})
		.filter((block) => block.sections.length > 0);
}

export function totalRewardXp(rewardItems: StoryItem[]): number | null {
	const total = rewardXpFromItems(rewardItems);
	return total > 0 ? total : null;
}

export function rewardCatalogGroupForItem(item: StoryItem): FullAdventureRewardCatalogGroup | null {
	if (item.kind !== 'item') return null;
	if (item.catalog_type === 'weapon' || item.catalog_type === 'armor') {
		return item.catalog_type;
	}
	return 'item';
}

export function formatRewardMoney(item: StoryItem): string | null {
	if (item.kind !== 'money') return null;

	const parts = [
		item.gold ? `${item.gold} gp` : '',
		item.silver ? `${item.silver} sp` : '',
		item.copper ? `${item.copper} cp` : ''
	].filter(Boolean);

	return parts.length ? parts.join(', ') : null;
}

export function hasRewardContent(section: FullAdventureNodeSection): boolean {
	if (totalRewardXp(section.rewardItems) != null) return true;

	return section.rewardItems.some((item) => {
		if (item.kind === 'item') return true;
		if (item.kind === 'npc') return Boolean(item.character_id);
		if (item.kind === 'money') return formatRewardMoney(item) != null;
		if (item.kind === 'note') return Boolean(item.note_text?.trim());
		if (item.kind === 'map') return Boolean(item.map_id);
		return false;
	});
}
