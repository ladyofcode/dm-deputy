import type { StoryItem } from '$lib/types/schema';
import { isPersistedStoryItem } from '$lib/domain/story-item';
import type { ItemSize } from '$lib/data/part-story';

export function rewardXpFromItems(rewardItems: StoryItem[]): number {
	return rewardItems
		.filter((item) => item.kind === 'xp' && (item.xp_amount ?? 0) > 0)
		.reduce((sum, item) => sum + (item.xp_amount ?? 0), 0);
}

export function isStoryItemReward(item: Pick<StoryItem, 'is_reward'>): boolean {
	return item.is_reward === true;
}

export function rewardGroupId(parentNodeId: string): string {
	return `reward:${parentNodeId}`;
}

export function isRewardGroupId(itemId: string): boolean {
	return itemId.startsWith('reward:');
}

export function estimateRewardGroupSize(items: StoryItem[]): ItemSize {
	const lineHeight = 26;
	const statsLineHeight = 22;
	const header = 30;
	const padding = 28;
	const divider = 8;

	let height = header + padding;

	for (const item of items) {
		height += lineHeight;
		if (item.kind === 'item') {
			height += statsLineHeight;
		} else if (item.kind === 'note' && item.note_text) {
			height += statsLineHeight;
		} else if (item.kind === 'map') {
			height += statsLineHeight;
		}
		if (items.length > 1) {
			height += divider;
		}
	}

	return {
		width: 352,
		height: Math.max(96, height)
	};
}

export function groupRewardItemsByParent(items: StoryItem[]): Map<string, StoryItem[]> {
	const groups = new Map<string, StoryItem[]>();

	for (const item of items) {
		if (!isStoryItemReward(item) || !isPersistedStoryItem(item)) continue;

		const group = groups.get(item.parent_node_id) ?? [];
		group.push(item);
		groups.set(item.parent_node_id, group);
	}

	return groups;
}

export function canvasAttachableItems(items: StoryItem[]): StoryItem[] {
	const byParent = items.reduce<Record<string, StoryItem[]>>((groups, item) => {
		const group = groups[item.parent_node_id] ?? [];
		group.push(item);
		groups[item.parent_node_id] = group;
		return groups;
	}, {});

	const attachables: StoryItem[] = [];

	for (const [parentNodeId, parentItems] of Object.entries(byParent)) {
		const regular = parentItems.filter((item) => !isStoryItemReward(item) && isPersistedStoryItem(item));
		const rewards = parentItems.filter((item) => isStoryItemReward(item) && isPersistedStoryItem(item));

		attachables.push(...regular);

		if (rewards.length) {
			attachables.push({
				item_id: rewardGroupId(parentNodeId),
				parent_node_id: parentNodeId,
				kind: 'xp',
				label: 'Reward',
				is_reward: true
			});
		}
	}

	return attachables;
}
