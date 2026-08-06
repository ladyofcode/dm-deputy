<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { AnimatableObject, Draggable } from 'animejs';
	import StoryItem from '$lib/components/part/StoryItem.svelte';
	import StoryNodeSummary from '$lib/components/part/StoryNodeSummary.svelte';
	import StoryRewardGroup from '$lib/components/part/StoryRewardGroup.svelte';
	import StoryNode from '$lib/components/part/StoryNode.svelte';
	import { STORY_NODE_SIZE } from '$lib/data/part-story-layout';
	import {
		computeCanvasLayoutMetrics,
		computeWorldSize,
		createStoryCanvasConnectorController,
		createStoryCanvasDraggableController,
		createStoryCanvasPanController,
		setStoryNodeCanvasContext,
		type StoryCanvasLayoutDeps,
		type StoryNodeCanvasContext
	} from '$lib/components/part/part-story-canvas';
	import {
		groupRewardItemsByParent,
		isStoryItemReward
	} from '$lib/domain/story-item-reward';
	import { isNodeSummaryId, partCanvasAttachables } from '$lib/domain/story-node-summary';
	import { buildStoryEdges } from '$lib/data/part-story';
	import type { StoryItem as StoryItemData, StoryNode as StoryNodeData } from '$lib/types/schema';

	type Props = {
		partId: string;
		nodes: StoryNodeData[];
		storyItems: StoryItemData[];
		onActivateNode?: (nodeId: string) => void;
		onManageNodeArms?: (nodeId: string) => void;
		onToggleNodeComplete?: (nodeId: string) => void;
		onAssignRewardXp?: (nodeId: string) => void;
		xpAwardedNodeIds?: ReadonlySet<string>;
		onStoryItemUpdate?: (item: StoryItemData) => void | Promise<void>;
	};

	let {
		partId,
		nodes,
		storyItems,
		onActivateNode,
		onManageNodeArms,
		onToggleNodeComplete,
		onAssignRewardXp,
		xpAwardedNodeIds = new Set<string>(),
		onStoryItemUpdate
	}: Props = $props();

	const canvasAttachables = $derived(partCanvasAttachables(nodes, storyItems));
	const summaryNodes = $derived(nodes.filter((node) => node.summary.trim()));
	const looseItems = $derived(storyItems.filter((item) => !isStoryItemReward(item)));
	const rewardGroupEntries = $derived([...groupRewardItemsByParent(storyItems).entries()]);
	const completedNodeIds = $derived(
		new Set(nodes.filter((node) => node.completed_at).map((node) => node.node_id))
	);
	const edges = $derived(buildStoryEdges(nodes));
	const armedNodeIds = $derived(new Set(storyItems.map((item) => item.parent_node_id)));

	function isConnectorDimmed(parentNodeId: string) {
		return completedNodeIds.has(parentNodeId);
	}

	function isEdgeDimmed(edge: { fromId: string; toId: string }) {
		return completedNodeIds.has(edge.fromId) || completedNodeIds.has(edge.toId);
	}

	let layoutBoundsTick = $state(0);
	let viewportEl = $state<HTMLDivElement | undefined>();
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panPending = $state(false);
	let panInitialized = $state(false);
	let panPointerId = $state<number | null>(null);
	let panStart = $state<{ x: number; y: number; panX: number; panY: number } | null>(null);

	let canvasEl = $state<HTMLDivElement | undefined>();
	let connectorPaths = $state.raw<Record<string, string>>({});
	let itemConnectorPaths = $state.raw<Record<string, string>>({});

	const nodeElements = new SvelteMap<string, HTMLDivElement>();
	const nodeDraggables = new SvelteMap<string, Draggable>();
	const itemElements = new SvelteMap<string, HTMLDivElement>();
	const itemDraggables = new SvelteMap<string, Draggable>();
	const itemFollowAnims = new SvelteMap<string, AnimatableObject>();
	const itemFollowStates = new SvelteMap<string, { x: number; y: number }>();

	let mounted = false;
	let resizeObserver: ResizeObserver | undefined;

	let draggableController!: ReturnType<typeof createStoryCanvasDraggableController>;
	let connectorController!: ReturnType<typeof createStoryCanvasConnectorController>;

	const layoutDeps: StoryCanvasLayoutDeps = {
		getPartId: () => partId,
		getNodes: () => nodes,
		getStoryItems: () => storyItems,
		getCanvasAttachables: () => canvasAttachables,
		getEdges: () => edges,
		getLayoutBoundsTick: () => layoutBoundsTick,
		getItemElements: () => itemElements,
		getNodeDraggables: () => nodeDraggables,
		getItemDraggables: () => itemDraggables,
		getViewportEl: () => viewportEl,
		getNodePosition: (nodeId) => draggableController.getNodePosition(nodeId),
		getItemPosition: (itemId) => draggableController.getItemPosition(itemId)
	};

	const canvasLayoutMetrics = $derived.by(() => computeCanvasLayoutMetrics(layoutDeps));
	const contentBounds = $derived(canvasLayoutMetrics.bounds);
	const canvasMinHeight = $derived(canvasLayoutMetrics.minHeight);
	const worldSize = $derived.by(() => computeWorldSize(layoutDeps, contentBounds, canvasMinHeight));

	const panController = createStoryCanvasPanController({
		getPartId: () => partId,
		getViewportEl: () => viewportEl,
		getPanState: () => ({
			panX,
			panY,
			isPanning,
			panPending,
			panInitialized,
			panPointerId,
			panStart
		}),
		setPanState: (next) => {
			if (next.panX !== undefined) panX = next.panX;
			if (next.panY !== undefined) panY = next.panY;
			if (next.isPanning !== undefined) isPanning = next.isPanning;
			if (next.panPending !== undefined) panPending = next.panPending;
			if (next.panInitialized !== undefined) panInitialized = next.panInitialized;
			if (next.panPointerId !== undefined) panPointerId = next.panPointerId;
			if (next.panStart !== undefined) panStart = next.panStart;
		},
		getContentBounds: () => contentBounds
	});

	connectorController = createStoryCanvasConnectorController({
		...layoutDeps,
		getConnectorPaths: () => connectorPaths,
		setConnectorPaths: (paths) => {
			connectorPaths = paths;
		},
		getItemConnectorPaths: () => itemConnectorPaths,
		setItemConnectorPaths: (paths) => {
			itemConnectorPaths = paths;
		},
		getNodeDraggables: () => nodeDraggables,
		getItemDraggables: () => itemDraggables,
		snapItemFollowTo: (itemId, position) => draggableController.snapItemFollowTo(itemId, position),
		setItemPosition: (itemId, position, options) =>
			draggableController.setItemPosition(itemId, position, options),
		refreshCanvasBounds: () => {
			layoutBoundsTick += 1;
		}
	});

	draggableController = createStoryCanvasDraggableController({
		...layoutDeps,
		getCanvasEl: () => canvasEl,
		getContentBounds: () => contentBounds,
		getWorldSize: () => worldSize,
		getNodeElements: () => nodeElements,
		getItemElements: () => itemElements,
		getItemFollowAnims: () => itemFollowAnims,
		getItemFollowStates: () => itemFollowStates,
		getItemConnectorPaths: () => itemConnectorPaths,
		setItemConnectorPaths: (paths) => {
			itemConnectorPaths = paths;
		},
		getMounted: () => mounted,
		updateCanvasDuringDrag: (options) => connectorController.updateCanvasDuringDrag(options),
		syncConnectors: () => connectorController.syncConnectors(),
		renderItemConnector: (itemId) => connectorController.renderItemConnector(itemId),
		initializePan: () => panController.initializePan(),
		refreshCanvasBounds: () => {
			layoutBoundsTick += 1;
		}
	});

	const {
		endPan,
		handlePanPointerDown,
		handlePanPointerMove,
		handleLostPointerCapture
	} = panController;

	const { scheduleSetup } = draggableController;

	const canvasContext: StoryNodeCanvasContext = {
		registerElement(nodeId, element) {
			nodeElements.set(nodeId, element);
			scheduleSetup();
		},
		unregisterElement(nodeId) {
			nodeElements.delete(nodeId);
			draggableController.teardownNodeDraggable(nodeId);
		},
		registerItem(itemId, element) {
			itemElements.set(itemId, element);
			scheduleSetup();
		},
		unregisterItem(itemId) {
			draggableController.teardownItemDraggable(itemId);
			itemElements.delete(itemId);
		},
		updateStoryItem(item) {
			void onStoryItemUpdate?.(item);
		},
		requestConnectorSync() {
			layoutBoundsTick += 1;
			connectorController.syncConnectors();
		}
	};

	setStoryNodeCanvasContext(canvasContext);

	onMount(() => {
		mounted = true;

		resizeObserver = new ResizeObserver(() => {
			draggableController.refreshDraggablesOnResize();
		});

		if (canvasEl) {
			resizeObserver.observe(canvasEl);
		}
		if (viewportEl) {
			resizeObserver.observe(viewportEl);
		}

		scheduleSetup();

		return () => {
			mounted = false;
			endPan();
			resizeObserver?.disconnect();
			draggableController.teardownAllDraggables();
		};
	});

	$effect(() => {
		void partId;
		panController.resetPanInitialized();
		panController.loadPanForPart();
	});

	$effect(() => {
		const nodeSignature = nodes
			.map((node) => `${node.node_id}:${node.parent_node_ids.join('+')}:${node.summary.trim()}`)
			.join(',');
		const attachableSignature = canvasAttachables.map((item) => item.item_id).join(',');
		if (!mounted || !nodeSignature) return;

		void attachableSignature;
		draggableController.syncDraggablesWithNodes(nodes, canvasAttachables);
	});
</script>

<div
	class="canvas-viewport"
	class:is-panning={isPanning}
	role="application"
	aria-label="Story canvas. Drag empty space to pan the view."
	bind:this={viewportEl}
	onpointerdown={handlePanPointerDown}
	onpointermove={handlePanPointerMove}
	onpointerup={endPan}
	onpointercancel={endPan}
	onlostpointercapture={handleLostPointerCapture}
>
	<div
		class="canvas-world"
		bind:this={canvasEl}
		style:transform="translate({panX}px, {panY}px)"
		style:width="{worldSize.width}px"
		style:min-height="{worldSize.height}px"
		style:--story-node-size="{STORY_NODE_SIZE}px"
	>
		<svg aria-hidden="true">
			{#each edges as edge (edge.id)}
				<path
					data-kind="main"
					data-dimmed={isEdgeDimmed(edge) ? 'true' : undefined}
					d={connectorPaths[edge.id] ?? ''}
				/>
			{/each}
			{#each canvasAttachables as attachable (attachable.item_id)}
				<path
					data-kind={isNodeSummaryId(attachable.item_id) ? 'summary' : attachable.kind}
					data-dimmed={isConnectorDimmed(attachable.parent_node_id) ? 'true' : undefined}
					d={itemConnectorPaths[attachable.item_id] ?? ''}
				/>
			{/each}
		</svg>

		{#each nodes as node (node.node_id)}
			<StoryNode
				{node}
				hasArms={armedNodeIds.has(node.node_id)}
				onActivate={onActivateNode}
				onManageArms={onManageNodeArms}
				onToggleComplete={onToggleNodeComplete}
			/>
		{/each}

		{#each summaryNodes as node (node.node_id)}
			<StoryNodeSummary {node} dimmed={completedNodeIds.has(node.node_id)} />
		{/each}

		{#each rewardGroupEntries as [parentNodeId, items] (parentNodeId)}
			<StoryRewardGroup
				{parentNodeId}
				{items}
				xpAwarded={xpAwardedNodeIds.has(parentNodeId)}
				onAssignRewardXp={onAssignRewardXp}
				dimmed={completedNodeIds.has(parentNodeId)}
			/>
		{/each}

		{#each looseItems as storyItem (storyItem.item_id)}
			<StoryItem item={storyItem} dimmed={completedNodeIds.has(storyItem.parent_node_id)} />
		{/each}
	</div>
</div>

<style>
	.canvas-viewport {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		cursor: grab;
		background:
			radial-gradient(circle at top, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent 55%),
			var(--color-bg);
	}

	.canvas-viewport.is-panning {
		cursor: grabbing;
	}

	.canvas-world {
		position: relative;
		overflow: visible;
		touch-action: none;
		will-change: transform;
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
		z-index: 1;
	}

	path {
		fill: none;
		stroke-linecap: round;
	}

	path[data-kind='main'] {
		stroke: var(--color-accent);
		stroke-width: 3.5;
		opacity: 0.8;
	}

	path[data-kind='main'][data-dimmed='true'] {
		stroke: #6f5644;
		opacity: 0.75;
	}

	path:not([data-kind='main']) {
		stroke: color-mix(in srgb, var(--color-accent) 70%, var(--color-text-muted));
		stroke-width: 2;
		opacity: 0.8;
	}

	path[data-dimmed='true'] {
		stroke: #6f5644;
		opacity: 0.75;
	}
</style>
