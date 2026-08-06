<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import CreateStoryNodeModal from '$lib/components/part/CreateStoryNodeModal.svelte';
	import EditStoryNodesModal from '$lib/components/part/EditStoryNodesModal.svelte';
	import AwardEncounterXpModal, { type AwardXpMode } from '$lib/components/part/AwardEncounterXpModal.svelte';
	import { rewardXpFromItems } from '$lib/domain/story-item-reward';
	import OcrScanButton from '$lib/components/OcrScanButton.svelte';
	import PartSettingsModal from '$lib/components/part/PartSettingsModal.svelte';
	import PartStoryCanvas from '$lib/components/part/PartStoryCanvas.svelte';
	import StoryNodeArmsModal from '$lib/components/part/StoryNodeArmsModal.svelte';
	import StoryNodesEmptyForm from '$lib/components/part/StoryNodesEmptyForm.svelte';
	import { getCampaignById, getAdventureById, getPartById } from '$lib/data';
	import { ensurePartStoryInCache } from '$lib/db/cache';
	import { loadPartStory } from '$lib/db/client';
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
	import { database } from '$lib/stores/database.svelte';
	import { type StoryItem, type StoryNode, type StoryNodeKind } from '$lib/types/schema';

	const STORY_CONTENT_FADE = { duration: 180 };

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');
	const partId = $derived(page.params.partId ?? '');

	const part = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getPartById(partId);
	});
	const campaign = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getCampaignById(campaignId);
	});
	const adventure = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getAdventureById(adventureId);
	});

	let storyNodes = $state.raw<StoryNode[]>([]);
	let storyItems = $state.raw<StoryItem[]>([]);
	let storyLoaded = $state(false);
	const hasStoryNodes = $derived(storyNodes.length > 0);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showArmsModal = $state(false);
	let showAwardXpModal = $state(false);
	let armsModalNodeId = $state<string | null>(null);
	let awardXpNodeId = $state<string | null>(null);
	let awardXpMode = $state<AwardXpMode>('menu');
	let xpAwardedNodeIds = $state<Set<string>>(new Set());
	let error = $state<string | null>(null);

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
		if (!database.isReady || !partId) {
			storyLoaded = false;
			return;
		}

		let cancelled = false;
		storyLoaded = false;
		storyNodes = [];
		storyItems = [];

		void ensurePartStoryInCache(partId, loadPartStory).then(() => {
			if (cancelled) return;

			storyNodes = getInitialStoryNodes(partId);
			storyItems = getInitialStoryItems(partId);
			storyLoaded = true;
			void refreshXpAwardedNodeIds(storyNodes, storyItems).then((ids) => {
				if (!cancelled) xpAwardedNodeIds = ids;
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
			error = cause instanceof Error ? cause.message : 'Could not save connector arms';
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
			error = cause instanceof Error ? cause.message : 'Could not save story nodes';
			throw cause;
		}
	}

	async function handleCreateNode(node: StoryNode) {
		error = null;

		try {
			await appendNodes([node]);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save story node';
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
		xpAwardedNodeIds = await refreshXpAwardedNodeIds(storyNodes, storyItems);
	}
</script>

<svelte:head>
	<title>{part?.title ?? 'Part'} · DM Deputy</title>
</svelte:head>

{#if database.isReady && !part}
	<section class="page-stack">
		<h1>Part not found</h1>
		<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}>
			Back to adventure
		</Button.Root>
	</section>
{:else}
	<div class="part-page">
		<header>
			<div class="part-header-row">
				<h1>{part?.title ?? ''}</h1>
				{#if part && adventure}
					<PartSettingsModal
						{campaignId}
						{adventureId}
						partId={part.part_id}
						partTitle={part.title}
						adventureName={adventure.name}
					/>
				{/if}
			</div>
		</header>

		<nav aria-label="Back to adventure">
			<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}
				>←</Button.Root
			>
		</nav>

		{#if storyLoaded && hasStoryNodes}
			<nav
				aria-label="Story node actions"
				class="part-actions"
				in:fade={STORY_CONTENT_FADE}
			>
				<Button.Root
					type="button"
					data-variant="icon"
					aria-label="Edit story nodes"
					onclick={() => (showEditModal = true)}
				>
					✎
				</Button.Root>
				<Button.Root
					type="button"
					data-action="add"
					aria-label="Add story node"
					onclick={() => (showCreateModal = true)}
				>
					+
				</Button.Root>
				<Button.Root
					type="button"
					data-variant="icon"
					aria-label="Award XP"
					onclick={openAwardXpFromMenu}
				>
					XP
				</Button.Root>
				<OcrScanButton />
			</nav>

			<CreateStoryNodeModal bind:open={showCreateModal} nodes={storyNodes} onCreate={handleCreateNode} />
			<EditStoryNodesModal
				bind:open={showEditModal}
				nodes={storyNodes}
				onSave={handleSaveEditedNodes}
			/>

			<div class="story-canvas-shell" in:fade={STORY_CONTENT_FADE}>
				<PartStoryCanvas
					{partId}
					nodes={storyNodes}
					{storyItems}
					onActivateNode={handleActivateNode}
					onManageNodeArms={openArmsModal}
					onToggleNodeComplete={handleToggleNodeComplete}
					onAssignRewardXp={openAssignRewardXp}
					xpAwardedNodeIds={xpAwardedNodeIds}
					onStoryItemUpdate={handleStoryItemUpdate}
				/>
			</div>
		{:else if storyLoaded}
			<div in:fade={STORY_CONTENT_FADE}>
				<StoryNodesEmptyForm onSave={handleSaveEmptyForm} />
			</div>
		{/if}

		{#if campaign}
			<StoryNodeArmsModal
				bind:open={showArmsModal}
				nodeId={armsModalNodeId}
				nodeTitle={armsModalNode?.title ?? ''}
				campaignId={campaign.campaign_id}
				existingItems={storyItems}
				onSave={handleSaveNodeArms}
			/>
			<AwardEncounterXpModal
				bind:open={showAwardXpModal}
				mode={awardXpMode}
				node={awardXpNode}
				rewardXpTotal={awardXpRewardTotal}
				awardedNodeIds={xpAwardedNodeIds}
				campaignId={campaign.campaign_id}
				gameSchema={campaign.game_schema}
				adventureId={adventureId}
				partId={partId}
				adventureName={adventure?.name}
				partName={part?.title}
				onAwarded={handleXpAwarded}
			/>
		{/if}
	</div>
{/if}

<style>
	.part-page {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: calc(100dvh - 4.25rem);
		min-height: 0;
		overflow: hidden;
	}

	header {
		flex-shrink: 0;
	}

	.story-canvas-shell {
		flex: 1;
		min-height: 0;
		width: 100%;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 3;
		padding: 0.75rem 4.5rem 0.75rem 1.5rem;
		background: color-mix(in srgb, var(--color-bg) 90%, transparent);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
	}

	.part-header-row {
		display: grid;
		grid-template-columns: 2.5rem 1fr 2.5rem;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		margin: 0;
		grid-column: 2;
		text-align: center;
		font-size: clamp(1.2rem, 3.8vw, 1.65rem);
	}

	.part-header-row :global([data-button-root]) {
		grid-column: 3;
		justify-self: end;
	}

	nav {
		position: fixed;
		top: 5.25rem;
		z-index: 4;
	}

	nav:first-of-type {
		left: var(--space-page);
	}

	.part-actions {
		right: var(--space-page);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	nav :global([data-button-root]) {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border-radius: 999px;
		box-shadow: 0 4px 14px var(--color-shadow);
	}

	.part-actions :global([data-button-root][data-action='add']) {
		font-size: 1.35rem;
		line-height: 1;
	}

	.part-actions :global([data-button-root][data-variant='icon'] svg) {
		display: block;
	}
</style>
