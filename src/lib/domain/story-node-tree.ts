import { normalizeStoryNode } from '$lib/data/part-story';
import type { StoryNode } from '$lib/types/schema';

export type StoryNodeTreeItem = {
	node: StoryNode;
	depth: number;
	children: StoryNodeTreeItem[];
};

export type StoryNodeTreeRow = {
	key: string;
	node: StoryNode;
	depth: number;
	viaParentId: string | null;
};

function nodeById(nodes: StoryNode[]): Map<string, StoryNode> {
	return new Map(nodes.map((node) => [node.node_id, node]));
}

export function isStoryNodeRoot(node: StoryNode, nodesById: Map<string, StoryNode>): boolean {
	const parentIds = node.parent_node_ids ?? [];
	return parentIds.length === 0 || parentIds.every((parentId) => !nodesById.has(parentId));
}

export function buildStoryNodeForest(nodes: StoryNode[]): StoryNodeTreeItem[] {
	const nodesById = nodeById(nodes);

	function buildChildren(parentId: string, depth: number, path: Set<string>): StoryNodeTreeItem[] {
		return nodes
			.filter((node) => node.parent_node_ids?.includes(parentId))
			.flatMap((node) => {
				if (path.has(node.node_id)) return [];

				return [
					{
						node,
						depth,
						children: buildChildren(node.node_id, depth + 1, new Set([...path, node.node_id]))
					}
				];
			});
	}

	return nodes
		.filter((node) => isStoryNodeRoot(node, nodesById))
		.map((node) => ({
			node,
			depth: 0,
			children: buildChildren(node.node_id, 1, new Set([node.node_id]))
		}));
}

export function flattenStoryNodeTree(nodes: StoryNode[]): StoryNodeTreeRow[] {
	const rows: StoryNodeTreeRow[] = [];
	const seenKeys = new Set<string>();

	function walk(items: StoryNodeTreeItem[], viaParentId: string | null) {
		for (const item of items) {
			const key = `${item.node.node_id}:${viaParentId ?? 'root'}`;
			if (!seenKeys.has(key)) {
				seenKeys.add(key);
				rows.push({
					key,
					node: item.node,
					depth: item.depth,
					viaParentId
				});
			}

			walk(item.children, item.node.node_id);
		}
	}

	walk(buildStoryNodeForest(nodes), null);

	const nodesById = nodeById(nodes);
	for (const node of nodes) {
		const orphanKey = `${node.node_id}:orphan`;
		if (seenKeys.has(orphanKey)) continue;

		const hasKnownParent = (node.parent_node_ids ?? []).some((parentId) => nodesById.has(parentId));
		if (!hasKnownParent && !isStoryNodeRoot(node, nodesById)) {
			rows.push({
				key: orphanKey,
				node,
				depth: 0,
				viaParentId: null
			});
		}
	}

	return rows;
}

export function parentTitlesForNode(node: StoryNode, nodes: StoryNode[]): string[] {
	const nodesById = nodeById(nodes);
	return (node.parent_node_ids ?? [])
		.map((parentId) => nodesById.get(parentId)?.title)
		.filter((title): title is string => Boolean(title));
}

export function wouldCreateParentCycle(
	nodes: StoryNode[],
	nodeId: string,
	parentIds: string[]
): boolean {
	const nodesById = nodeById(nodes);

	function isAncestor(ancestorId: string, descendantId: string, visited: Set<string>): boolean {
		if (ancestorId === descendantId) return true;

		const descendant = nodesById.get(descendantId);
		if (!descendant || visited.has(descendantId)) return false;

		visited.add(descendantId);
		return (descendant.parent_node_ids ?? []).some((parentId) =>
			isAncestor(ancestorId, parentId, visited)
		);
	}

	return parentIds.some((parentId) => isAncestor(nodeId, parentId, new Set()));
}

export function removeStoryNode(nodes: StoryNode[], nodeId: string): StoryNode[] {
	return nodes
		.filter((node) => node.node_id !== nodeId)
		.map((node) => ({
			...node,
			parent_node_ids: (node.parent_node_ids ?? []).filter((parentId) => parentId !== nodeId)
		}));
}

export function updateStoryNode(nodes: StoryNode[], nextNode: StoryNode): StoryNode[] {
	return nodes.map((node) => (node.node_id === nextNode.node_id ? nextNode : node));
}

export function cloneStoryNodes(nodes: StoryNode[]): StoryNode[] {
	return nodes.map((node) => normalizeStoryNode({ ...node }));
}
