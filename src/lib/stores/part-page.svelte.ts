import { SvelteSet } from 'svelte/reactivity';
import { formatErrorMessage } from '$lib/domain/errors';
import { rewardXpFromItems } from '$lib/domain/story-item-reward';
import { ensurePartStoryInCache } from '$lib/db/cache';
import { loadPartStory } from '$lib/db/client';
import { getCampaignById, getAdventureById, getPartById } from '$lib/data';
import {
	appendNodesToPart,
	createChainedStoryNodes,
	persistPartStoryItems,
	refreshXpAwardedNodeIds,
	replacePartStoryNodes,
	activateStoryNode,
	getInitialStoryNodes,
	getInitialStoryItems,
	toggleStoryNodeCompleted
} from '$lib/data/part-story';
import { addPartNpc, getInitialPartNpcs, removePartNpc } from '$lib/data/part-npcs';
import { database } from '$lib/stores/database.svelte';
import { timeAsync, timeSync } from '$lib/debug/load-timing';
import type { AwardXpMode } from '$lib/components/part/AwardEncounterXpModal.svelte';
import {
	type StoryItem,
	type StoryNode,
	type StoryNodeKind,
	type PartNpc
} from '$lib/types/schema';

export function createPartPageState(
	getIds: () => {
		campaignId: string;
		adventureId: string;
		partId: string;
	}
) {
	let storyNodes = $state.raw<StoryNode[]>([]);
	let storyItems = $state.raw<StoryItem[]>([]);
	let partNpcs = $state.raw<PartNpc[]>([]);
	let storyLoaded = $state(false);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showArmsModal = $state(false);
	let showAwardXpModal = $state(false);
	let showNpcViewerModal = $state(false);
	let armsModalNodeId = $state<string | null>(null);
	let awardXpNodeId = $state<string | null>(null);
	let awardXpMode = $state<AwardXpMode>('menu');
	const xpAwardedNodeIds = new SvelteSet<string>();
	let error = $state<string | null>(null);

	const hasStoryNodes = $derived(storyNodes.length > 0);

	const part = $derived.by(() => {
		const { partId } = getIds();
		if (!database.isReady || !partId) return undefined;
		return getPartById(partId);
	});

	const campaign = $derived.by(() => {
		const { campaignId } = getIds();
		if (!database.isReady || !campaignId) return undefined;
		return getCampaignById(campaignId);
	});

	const adventure = $derived.by(() => {
		const { adventureId } = getIds();
		if (!database.isReady || !adventureId) return undefined;
		return getAdventureById(adventureId);
	});

	const armsModalNode = $derived(
		armsModalNodeId ? (storyNodes.find((node) => node.node_id === armsModalNodeId) ?? null) : null
	);

	const awardXpNode = $derived(
		awardXpNodeId ? (storyNodes.find((node) => node.node_id === awardXpNodeId) ?? null) : null
	);

	const awardXpRewardTotal = $derived.by(() => {
		if (!awardXpNodeId) return 0;
		const rewards = storyItems.filter(
			(item) => item.is_reward && item.parent_node_id === awardXpNodeId
		);
		return rewardXpFromItems(rewards);
	});

	$effect(() => {
		const { partId } = getIds();
		if (!database.isReady || !partId) {
			storyLoaded = false;
			return;
		}

		let cancelled = false;
		storyLoaded = false;
		storyNodes = [];
		storyItems = [];
		partNpcs = [];

		void timeAsync('part: load story into cache', () =>
			ensurePartStoryInCache(partId, loadPartStory)
		).then(() => {
			if (cancelled) return;

			timeSync('part: read story from cache', () => {
				storyNodes = getInitialStoryNodes(partId);
				storyItems = getInitialStoryItems(partId);
				partNpcs = getInitialPartNpcs(partId);
			});
			storyLoaded = true;
			void timeAsync('part: refresh awarded xp', () =>
				refreshXpAwardedNodeIds(storyNodes, storyItems)
			).then((ids) => {
				if (!cancelled) {
					xpAwardedNodeIds.clear();
					for (const id of ids) xpAwardedNodeIds.add(id);
				}
			});
		});

		return () => {
			cancelled = true;
		};
	});

	async function appendNodes(nodes: StoryNode[]) {
		if (!part || nodes.length === 0) return;

		storyNodes = await appendNodesToPart(part.part_id, storyNodes, nodes);
	}

	async function persistStoryItems(items: StoryItem[]) {
		if (!part) return;

		storyItems = await persistPartStoryItems(part.part_id, storyNodes, storyItems, items);
	}

	function openArmsModal(nodeId: string) {
		armsModalNodeId = nodeId;
		showArmsModal = true;
	}

	async function handleSaveNodeArms(nodeId: string, arms: StoryItem[]) {
		if (!part) return;

		error = null;

		try {
			const others = storyItems.filter((item) => item.parent_node_id !== nodeId);
			await persistStoryItems([...others, ...arms]);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save connector arms');
			throw cause;
		}
	}

	async function replaceStoryNodes(nodes: StoryNode[]) {
		if (!part) return;

		const result = await replacePartStoryNodes(part.part_id, nodes, storyItems);
		storyNodes = result.nodes;
		storyItems = result.items;
	}

	async function handleSaveEditedNodes(nodes: StoryNode[]) {
		error = null;

		try {
			await replaceStoryNodes(nodes);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save story nodes');
			throw cause;
		}
	}

	async function handleCreateNode(node: StoryNode) {
		error = null;

		try {
			await appendNodes([node]);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save story node');
		}
	}

	async function handleSaveEmptyForm(lines: { title: string; kind: StoryNodeKind }[]) {
		if (!part) return;

		await appendNodes(createChainedStoryNodes(lines));
	}

	async function handleStoryItemUpdate(updated: StoryItem) {
		if (!part) return;

		const nextItems = storyItems.map((item) => (item.item_id === updated.item_id ? updated : item));
		await persistStoryItems(nextItems);
	}

	async function handleActivateNode(nodeId: string) {
		if (!part) return;

		const activatedAt = await activateStoryNode(part.part_id, nodeId);
		storyNodes = storyNodes.map((node) =>
			node.node_id === nodeId ? { ...node, activated_at: activatedAt } : node
		);
	}

	async function handleToggleNodeComplete(nodeId: string) {
		if (!part) return;

		const completedAt = await toggleStoryNodeCompleted(part.part_id, nodeId);
		storyNodes = storyNodes.map((node) =>
			node.node_id === nodeId ? { ...node, completed_at: completedAt } : node
		);
	}

	function openAssignRewardXp(nodeId: string) {
		awardXpNodeId = nodeId;
		awardXpMode = 'reward';
		showAwardXpModal = true;
	}

	function openAwardXpFromMenu() {
		awardXpNodeId = null;
		awardXpMode = 'menu';
		showAwardXpModal = true;
	}

	async function handleXpAwarded() {
		const ids = await refreshXpAwardedNodeIds(storyNodes, storyItems);
		xpAwardedNodeIds.clear();
		for (const id of ids) xpAwardedNodeIds.add(id);
	}

	async function handleAddPartNpc(characterId: string) {
		if (!part) return;

		const added = await addPartNpc(part.part_id, characterId);
		partNpcs = [...partNpcs.filter((entry) => entry.character_id !== characterId), added];
	}

	async function handleRemovePartNpc(characterId: string) {
		if (!part) return;

		await removePartNpc(part.part_id, characterId);
		partNpcs = partNpcs.filter((entry) => entry.character_id !== characterId);
	}

	return {
		get storyNodes() {
			return storyNodes;
		},
		get storyItems() {
			return storyItems;
		},
		get partNpcs() {
			return partNpcs;
		},
		get storyLoaded() {
			return storyLoaded;
		},
		get hasStoryNodes() {
			return hasStoryNodes;
		},
		get showCreateModal() {
			return showCreateModal;
		},
		set showCreateModal(value: boolean) {
			showCreateModal = value;
		},
		get showEditModal() {
			return showEditModal;
		},
		set showEditModal(value: boolean) {
			showEditModal = value;
		},
		get showArmsModal() {
			return showArmsModal;
		},
		set showArmsModal(value: boolean) {
			showArmsModal = value;
		},
		get showAwardXpModal() {
			return showAwardXpModal;
		},
		set showAwardXpModal(value: boolean) {
			showAwardXpModal = value;
		},
		get showNpcViewerModal() {
			return showNpcViewerModal;
		},
		set showNpcViewerModal(value: boolean) {
			showNpcViewerModal = value;
		},
		get armsModalNodeId() {
			return armsModalNodeId;
		},
		get awardXpNodeId() {
			return awardXpNodeId;
		},
		get awardXpMode() {
			return awardXpMode;
		},
		get xpAwardedNodeIds() {
			return xpAwardedNodeIds;
		},
		get error() {
			return error;
		},
		get part() {
			return part;
		},
		get campaign() {
			return campaign;
		},
		get adventure() {
			return adventure;
		},
		get armsModalNode() {
			return armsModalNode;
		},
		get awardXpNode() {
			return awardXpNode;
		},
		get awardXpRewardTotal() {
			return awardXpRewardTotal;
		},
		openArmsModal,
		handleSaveNodeArms,
		handleSaveEditedNodes,
		handleCreateNode,
		handleSaveEmptyForm,
		handleStoryItemUpdate,
		handleActivateNode,
		handleToggleNodeComplete,
		openAssignRewardXp,
		openAwardXpFromMenu,
		handleXpAwarded,
		handleAddPartNpc,
		handleRemovePartNpc
	};
}
