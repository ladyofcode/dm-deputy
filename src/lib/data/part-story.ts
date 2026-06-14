import type { StoryNode } from '$lib/types/schema';

export type NodePosition = {
	x: number;
	y: number;
};

export type PartNodeLayout = Record<string, NodePosition>;

export type StoryEdge = {
	id: string;
	fromId: string;
	toId: string;
};

const DUMMY_STORY_NODES: StoryNode[] = [
	{
		node_id: 'node-encounter',
		kind: 'encounter',
		title: 'Guarded Threshold',
		summary: 'A warded archway blocks the path. Sentinels challenge anyone without the keep sigil.',
		parent_node_ids: []
	},
	{
		node_id: 'node-event',
		kind: 'event',
		title: 'Ashfall Revelation',
		summary: 'Scorched ledgers reveal who ordered the fire — and who was meant to die in it.',
		parent_node_ids: ['node-encounter']
	}
];

function layoutStorageKey(partId: string): string {
	return `dm-deputy:part-node-layout:${partId}`;
}

function nodesStorageKey(partId: string): string {
	return `dm-deputy:part-story-nodes:${partId}`;
}

export function getDefaultStoryNodes(): StoryNode[] {
	return DUMMY_STORY_NODES.map(normalizeStoryNode);
}

export function loadPartStoryNodes(partId: string): StoryNode[] | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(nodesStorageKey(partId));
		if (!raw) return null;

		return JSON.parse(raw) as StoryNode[];
	} catch {
		return null;
	}
}

export function savePartStoryNodes(partId: string, nodes: StoryNode[]): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(nodesStorageKey(partId), JSON.stringify(nodes));
}

export function normalizeStoryNode(node: StoryNode): StoryNode {
	return {
		...node,
		parent_node_ids: [...(node.parent_node_ids ?? [])]
	};
}

export function getInitialStoryNodes(partId: string): StoryNode[] {
	const saved = loadPartStoryNodes(partId);
	if (!saved?.length) return getDefaultStoryNodes();

	return saved.map(normalizeStoryNode);
}

export function buildStoryEdges(nodes: StoryNode[]): StoryEdge[] {
	return nodes.flatMap((node) =>
		(node.parent_node_ids ?? []).map((fromId) => ({
			id: `${fromId}->${node.node_id}`,
			fromId,
			toId: node.node_id
		}))
	);
}

export function loadPartNodeLayout(partId: string): PartNodeLayout | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(layoutStorageKey(partId));
		if (!raw) return null;

		return JSON.parse(raw) as PartNodeLayout;
	} catch {
		return null;
	}
}

export function savePartNodeLayout(partId: string, layout: PartNodeLayout): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(layoutStorageKey(partId), JSON.stringify(layout));
}

export function createDefaultNodeLayout(
	nodeIds: string[],
	canvasWidth: number,
	canvasHeight: number,
	nodeSize: number
): PartNodeLayout {
	const radius = nodeSize / 2;
	const centerX = canvasWidth / 2 - radius;
	const count = nodeIds.length || 1;

	return nodeIds.reduce<PartNodeLayout>((layout, nodeId, index) => {
		layout[nodeId] = {
			x: centerX,
			y: (canvasHeight / (count + 1)) * (index + 1) - radius
		};
		return layout;
	}, {});
}

export function defaultPositionForNewNode(
	existingLayout: PartNodeLayout,
	canvasWidth: number,
	canvasHeight: number,
	nodeSize: number
): NodePosition {
	const radius = nodeSize / 2;
	const centerX = canvasWidth / 2 - radius;
	const lowestY = Object.values(existingLayout).reduce(
		(max, position) => Math.max(max, position.y),
		canvasHeight * 0.22 - radius
	);

	return {
		x: centerX,
		y: lowestY + nodeSize * 1.5
	};
}

export function resolvePartNodeLayout(
	partId: string,
	nodeIds: string[],
	canvasWidth: number,
	canvasHeight: number,
	nodeSize: number
): PartNodeLayout {
	const saved = loadPartNodeLayout(partId);
	const defaults = createDefaultNodeLayout(nodeIds, canvasWidth, canvasHeight, nodeSize);

	return nodeIds.reduce<PartNodeLayout>((layout, nodeId) => {
		layout[nodeId] = saved?.[nodeId] ??
			defaults[nodeId] ?? { x: centerX(canvasWidth, nodeSize), y: 0 };
		return layout;
	}, {});
}

function centerX(canvasWidth: number, nodeSize: number): number {
	return canvasWidth / 2 - nodeSize / 2;
}
