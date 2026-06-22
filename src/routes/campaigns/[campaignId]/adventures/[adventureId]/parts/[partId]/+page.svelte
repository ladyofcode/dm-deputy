<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Label } from 'bits-ui';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import CreateStoryNodeModal from '$lib/components/part/CreateStoryNodeModal.svelte';
	import EditStoryNodesModal from '$lib/components/part/EditStoryNodesModal.svelte';
	import AwardEncounterXpModal, { type AwardXpMode } from '$lib/components/part/AwardEncounterXpModal.svelte';
	import { rewardXpFromItems } from '$lib/domain/story-item-reward';
	import OcrScanButton from '$lib/components/OcrScanButton.svelte';
	import PartStoryCanvas from '$lib/components/part/PartStoryCanvas.svelte';
	import StoryNodeArmsModal from '$lib/components/part/StoryNodeArmsModal.svelte';
	import { STORY_NODE_SIZE } from '$lib/components/part/StoryNode.svelte';
	import { fromStore } from 'svelte/store';
	import { getCampaignById, getAdventureById, getPartById } from '$lib/data';
	import { getEncounterResolutionEventIdsInDb } from '$lib/db/client';
	import { ensurePartStoryInCache } from '$lib/db/cache';
	import { loadPartStory } from '$lib/db/client';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import {
		activateStoryNode,
		buildStoryEdges,
		defaultPositionForNewNode,
		getInitialStoryNodes,
		getInitialStoryItems,
		getPartStoryCanvasWidth,
		loadPartItemLayout,
		loadPartNodeLayout,
		normalizeStoryNode,
		resolvePartItemLayout,
		savePartItemLayout,
		savePartNodeLayout,
		savePartStoryItems,
		savePartStoryNodes,
		toggleStoryNodeCompleted
	} from '$lib/data/part-story';
	import {
		STORY_NODE_KIND_LABELS,
		type StoryItem,
		type StoryNode,
		type StoryNodeKind
	} from '$lib/types/schema';
	import { canvasAttachableItems } from '$lib/domain/story-item-reward';

	type StoryNodeLine = {
		id: string;
		title: string;
		kind: StoryNodeKind;
	};

	const STORY_CONTENT_FADE = { duration: 180 };

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');
	const partId = $derived(page.params.partId ?? '');

	const dbReady = fromStore(dbIsReady);

	const part = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getPartById(partId);
	});
	const campaign = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getCampaignById(campaignId);
	});
	const adventure = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getAdventureById(adventureId);
	});

	let storyNodes = $state<StoryNode[]>([]);
	let storyItems = $state<StoryItem[]>([]);
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
	let nodeLines = $state<StoryNodeLine[]>([
		{ id: crypto.randomUUID(), title: '', kind: 'exploration' }
	]);
	let saving = $state(false);
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

	function nodeIdsWithRewardXp(nodes: StoryNode[], items: StoryItem[]): string[] {
		return nodes
			.filter((node) => {
				const rewards = items.filter(
					(item) => item.is_reward && item.parent_node_id === node.node_id
				);
				return rewardXpFromItems(rewards) > 0;
			})
			.map((node) => node.node_id);
	}

	async function refreshXpAwardedNodes(nodes: StoryNode[], items: StoryItem[]) {
		const nodeIds = nodeIdsWithRewardXp(nodes, items);

		if (nodeIds.length === 0) {
			xpAwardedNodeIds = new Set();
			return;
		}

		const awarded = await getEncounterResolutionEventIdsInDb(nodeIds);
		xpAwardedNodeIds = new Set(awarded);
	}

	$effect(() => {
		if (!dbReady.current || !partId) {
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
			void refreshXpAwardedNodes(storyNodes, storyItems);
		});

		return () => {
			cancelled = true;
		};
	});

	function canvasDimensions() {
		const canvasWidth = getPartStoryCanvasWidth();
		const canvasHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

		return { canvasWidth, canvasHeight: canvasHeight || 1 };
	}

	function createStoryNode(
		title: string,
		kind: StoryNodeKind,
		summary = '',
		parentNodeId?: string
	): StoryNode {
		const node: StoryNode = {
			node_id: `node-${crypto.randomUUID()}`,
			kind,
			title: title.trim(),
			summary: summary.trim(),
			parent_node_ids: parentNodeId ? [parentNodeId] : []
		};

		if (kind === 'encounter') {
			node.difficulty = null;
		}

		return node;
	}

	function createChainedStoryNodes(
		lines: { title: string; kind: StoryNodeKind }[],
		initialParentId?: string
	): StoryNode[] {
		const nodes: StoryNode[] = [];
		let parentId = initialParentId;

		for (const line of lines) {
			const node = createStoryNode(line.title, line.kind, '', parentId);
			nodes.push(node);
			parentId = node.node_id;
		}

		return nodes;
	}

	async function appendNodes(nodes: StoryNode[]) {
		if (!part || nodes.length === 0) return;

		const existingLayout = loadPartNodeLayout(part.part_id) ?? {};
		const { canvasWidth, canvasHeight } = canvasDimensions();
		const nextLayout = { ...existingLayout };

		for (const node of nodes) {
			nextLayout[node.node_id] = defaultPositionForNewNode(
				nextLayout,
				canvasWidth,
				canvasHeight,
				STORY_NODE_SIZE
			);
		}

		const nextNodes = [...storyNodes, ...nodes];
		storyNodes = nextNodes;
		await savePartNodeLayout(part.part_id, nextLayout);
		await savePartStoryNodes(part.part_id, nextNodes);
	}

	async function persistStoryItems(items: StoryItem[]) {
		if (!part) return;

		const attachableIds = new Set(canvasAttachableItems(items).map((item) => item.item_id));
		const previousAttachableIds = canvasAttachableItems(storyItems)
			.map((item) => item.item_id)
			.sort()
			.join(',');
		const nextAttachableIds = [...attachableIds].sort().join(',');
		const attachablesChanged = previousAttachableIds !== nextAttachableIds;

		const itemLayout = loadPartItemLayout(part.part_id) ?? {};
		const nextItemLayout = Object.fromEntries(
			Object.entries(itemLayout).filter(([itemId]) => attachableIds.has(itemId))
		);
		const nodeLayout = loadPartNodeLayout(part.part_id) ?? {};
		const resolvedLayout = resolvePartItemLayout(
			part.part_id,
			items,
			nodeLayout,
			STORY_NODE_SIZE,
			undefined,
			buildStoryEdges(storyNodes)
		);

		if (attachablesChanged) {
			for (const itemId of attachableIds) {
				if (resolvedLayout[itemId]) {
					nextItemLayout[itemId] = resolvedLayout[itemId];
				}
			}
		} else {
			for (const itemId of attachableIds) {
				if (!nextItemLayout[itemId] && resolvedLayout[itemId]) {
					nextItemLayout[itemId] = resolvedLayout[itemId];
				}
			}
		}

		storyItems = items;
		await savePartStoryItems(part.part_id, items);
		await savePartItemLayout(part.part_id, nextItemLayout);
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

		const normalized = nodes.map(normalizeStoryNode);
		const nodeIds = new Set(normalized.map((node) => node.node_id));
		const existingLayout = loadPartNodeLayout(part.part_id) ?? {};
		const nextLayout = Object.fromEntries(
			Object.entries(existingLayout).filter(([nodeId]) => nodeIds.has(nodeId))
		);
		const nextItems = storyItems.filter((item) => nodeIds.has(item.parent_node_id));

		storyNodes = normalized;
		await savePartStoryNodes(part.part_id, normalized);
		await savePartNodeLayout(part.part_id, nextLayout);
		await persistStoryItems(nextItems);
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

	function addNodeLine() {
		nodeLines = [...nodeLines, { id: crypto.randomUUID(), title: '', kind: 'exploration' }];
	}

	async function handleNodeKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		addNodeLine();
		await tick();

		const inputs = document.querySelectorAll<HTMLInputElement>('.story-node-line input');
		inputs[inputs.length - 1]?.focus();
	}

	async function saveNewNodes(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !part) return;

		const lines = nodeLines
			.map((line) => ({ title: line.title.trim(), kind: line.kind }))
			.filter((line) => line.title.length > 0);

		if (lines.length === 0) return;

		saving = true;
		error = null;

		try {
			await appendNodes(createChainedStoryNodes(lines));
			nodeLines = [{ id: crypto.randomUUID(), title: '', kind: 'exploration' }];
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save story nodes';
		} finally {
			saving = false;
		}
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
		await refreshXpAwardedNodes(storyNodes, storyItems);
	}
</script>

<svelte:head>
	<title>{part?.title ?? 'Part'} · DM Deputy</title>
</svelte:head>

{#if dbReady.current && !part}
	<section class="page-stack">
		<h1>Part not found</h1>
		<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}>
			Back to adventure
		</Button.Root>
	</section>
{:else}
	<div class="part-page">
		<header>
			<h1>{part?.title ?? ''}</h1>
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

			<CreateStoryNodeModal bind:open={showCreateModal} onCreate={handleCreateNode} />
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
			<section
				class="story-nodes-empty"
				aria-label="Add story nodes"
				in:fade={STORY_CONTENT_FADE}
			>
				<div class="story-nodes-empty-panel">
					<h2>No story nodes! Add below</h2>
					<p class="hint">Enter each node title and type. Press Enter to add another.</p>

					<form class="story-nodes-form" onsubmit={saveNewNodes}>
						<div class="field">
							<Label.Root>Story nodes</Label.Root>
							<ul class="story-node-lines list-plain">
								{#each nodeLines as line, index (line.id)}
									<li class="story-node-line">
										<input
											bind:value={line.title}
											placeholder="Node title"
											aria-label="Story node title"
											onkeydown={handleNodeKeydown}
										/>
										<select bind:value={line.kind} aria-label="Story node type">
											<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
											<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
										</select>
										{#if index === nodeLines.length - 1}
											<Button.Root
												type="button"
												data-variant="icon"
												onclick={addNodeLine}
												aria-label="Add story node line"
											>
												+
											</Button.Root>
										{/if}
									</li>
								{/each}
							</ul>
						</div>

						<div class="story-nodes-form-submit">
							{#if error}
								<p class="hint">{error}</p>
							{/if}
							<Button.Root type="submit" disabled={saving}>
								{saving ? 'Saving…' : 'Save'}
							</Button.Root>
						</div>
					</form>
				</div>
			</section>
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
		width: 100%;
		overflow-x: clip;
	}

	.story-canvas-shell {
		width: 100%;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 3;
		padding: 0.75rem 4.5rem 0.75rem 1.5rem;
		text-align: center;
		background: color-mix(in srgb, var(--color-bg) 90%, transparent);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
	}

	h1 {
		margin: 0;
		font-size: clamp(1.2rem, 3.8vw, 1.65rem);
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

	.story-nodes-empty {
		position: fixed;
		inset: 0;
		z-index: 5;
		display: grid;
		place-items: center;
		padding: var(--space-page);
		pointer-events: none;
	}

	.story-nodes-empty-panel {
		width: min(100%, 32rem);
		padding: var(--space-page);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-panel, 0.75rem);
		background: var(--color-surface);
		box-shadow: 0 12px 40px var(--color-shadow);
		pointer-events: auto;
		overflow: hidden;
	}

	.story-nodes-form {
		display: grid;
		gap: var(--space-section);
		min-width: 0;
	}

	.story-nodes-empty-panel :global(.field) {
		margin-bottom: 0;
		min-width: 0;
	}

	.story-nodes-empty-panel h2 {
		margin: 0 0 var(--space-field);
		font-size: 1.1rem;
	}

	.story-nodes-form-submit {
		margin-top: var(--space-section);
	}
</style>
