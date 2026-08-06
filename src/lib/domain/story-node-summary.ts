import type { ItemSize } from '$lib/data/part-story-layout';
import { canvasAttachableItems } from '$lib/domain/story-item-reward';
import type { StoryItem, StoryNode } from '$lib/types/schema';

const SUMMARY_ID_PREFIX = 'summary:';

export function nodeSummaryId(nodeId: string): string {
	return `${SUMMARY_ID_PREFIX}${nodeId}`;
}

export function isNodeSummaryId(itemId: string): boolean {
	return itemId.startsWith(SUMMARY_ID_PREFIX);
}

export function nodeSummaryAttachable(node: StoryNode): StoryItem | null {
	if (!node.summary.trim()) return null;

	return {
		item_id: nodeSummaryId(node.node_id),
		parent_node_id: node.node_id,
		kind: 'note',
		label: 'Summary'
	};
}

export function estimateNodeSummarySize(summary: string): ItemSize {
	const lineCount = summary.trim().split('\n').length;
	const clampedLines = Math.min(Math.max(lineCount, 1), 3);

	return {
		width: 256,
		height: 28 + clampedLines * 20 + 24
	};
}

export function partCanvasAttachables(nodes: StoryNode[], items: StoryItem[]): StoryItem[] {
	const attachables = [...canvasAttachableItems(items)];

	for (const node of nodes) {
		const summaryAttachable = nodeSummaryAttachable(node);
		if (summaryAttachable) {
			attachables.push(summaryAttachable);
		}
	}

	return attachables;
}
