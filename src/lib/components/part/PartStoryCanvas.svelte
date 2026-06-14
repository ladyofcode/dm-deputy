<script lang="ts">
	import { onMount, setContext, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { createAnimatable, createDraggable, spring, type AnimatableObject, type Draggable } from 'animejs';
	import StoryItem from '$lib/components/part/StoryItem.svelte';
	import StoryNode, { STORY_NODE_SIZE, type StoryNodeCanvasContext } from '$lib/components/part/StoryNode.svelte';
	import {
		buildStoryEdges,
		defaultItemPosition,
		getDummyStoryItem,
		ITEM_CONNECTOR_MAX_LENGTH,
		ITEM_CONNECTOR_MIN_LENGTH,
		ITEM_CONNECTOR_STRETCH_GIVE,
		resolvePartNodeLayout,
		savePartNodeLayout,
		type NodePosition
	} from '$lib/data/part-story';
	import type { StoryNode as StoryNodeData } from '$lib/types/schema';

	type Props = {
		partId: string;
		nodes: StoryNodeData[];
	};

	let { partId, nodes }: Props = $props();

	const item = getDummyStoryItem();
	const NODE_RADIUS = STORY_NODE_SIZE / 2;
	const canvasHeightRatio = $derived(Math.max(2, nodes.length + 0.5));

	let canvasEl = $state<HTMLDivElement | undefined>();
	let connectorPaths = $state<Record<string, string>>({});
	let itemConnectorPath = $state('');

	const nodeElements = new SvelteMap<string, HTMLButtonElement>();
	const draggables = new SvelteMap<string, Draggable>();

	let itemElement: HTMLDivElement | undefined;
	let itemDraggable: Draggable | undefined;
	let itemFollowAnim: AnimatableObject | undefined;

	const itemConnectorState = {
		startX: 0,
		startY: 0,
		endX: 0,
		endY: 0,
		bulge: 0
	};

	const itemFollowState = { x: 0, y: 0 };

	let resizeObserver: ResizeObserver | undefined;
	let setupGeneration = 0;
	let mounted = false;

	const edges = $derived(buildStoryEdges(nodes));
	const showItem = $derived(nodes.some((node) => node.node_id === item.parent_node_id));

	const canvasContext: StoryNodeCanvasContext = {
		registerElement(nodeId, element) {
			nodeElements.set(nodeId, element);
			scheduleSetup();
		},
		unregisterElement(nodeId) {
			nodeElements.delete(nodeId);
			teardownDraggable(nodeId);
		},
		registerItem(element) {
			itemElement = element;
			scheduleSetup();
		},
		unregisterItem() {
			teardownItemDraggable();
			itemElement = undefined;
		}
	};

	setContext('story-node-canvas', canvasContext);

	function nodeCenter(position: NodePosition) {
		return {
			x: position.x + NODE_RADIUS,
			y: position.y + NODE_RADIUS
		};
	}

	function circleEdgePoint(
		center: { x: number; y: number },
		radius: number,
		toward: { x: number; y: number }
	) {
		const angle = Math.atan2(toward.y - center.y, toward.x - center.x);

		return {
			x: center.x + Math.cos(angle) * radius,
			y: center.y + Math.sin(angle) * radius
		};
	}

	function boxEdgePoint(
		bounds: { x: number; y: number; width: number; height: number },
		toward: { x: number; y: number }
	) {
		const center = {
			x: bounds.x + bounds.width / 2,
			y: bounds.y + bounds.height / 2
		};
		const dx = toward.x - center.x;
		const dy = toward.y - center.y;
		if (dx === 0 && dy === 0) return center;

		const halfWidth = bounds.width / 2;
		const halfHeight = bounds.height / 2;
		const scaleX = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;
		const scaleY = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;
		const scale = Math.min(scaleX, scaleY);

		return {
			x: center.x + dx * scale,
			y: center.y + dy * scale
		};
	}

	function getNodePosition(nodeId: string): NodePosition | undefined {
		const draggable = draggables.get(nodeId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
	}

	function getItemPosition(): NodePosition | undefined {
		if (!itemDraggable) return undefined;

		return { x: itemDraggable.x, y: itemDraggable.y };
	}

	function buildConnectorPath(fromPosition: NodePosition, toPosition: NodePosition): string {
		const start = nodeCenter(fromPosition);
		const end = nodeCenter(toPosition);
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distance = Math.hypot(dx, dy) || 1;
		const normalX = -dy / distance;
		const normalY = dx / distance;
		const bulge = Math.min(distance * 0.14, 56);

		return `M ${start.x} ${start.y} Q ${midX + normalX * bulge} ${midY + normalY * bulge} ${end.x} ${end.y}`;
	}

	function buildItemConnectorPath(state: typeof itemConnectorState): string {
		const midX = (state.startX + state.endX) / 2;
		const midY = (state.startY + state.endY) / 2;
		const dx = state.endX - state.startX;
		const dy = state.endY - state.startY;
		const distance = Math.hypot(dx, dy) || 1;
		const normalX = -dy / distance;
		const normalY = dx / distance;

		return `M ${state.startX} ${state.startY} Q ${midX + normalX * state.bulge} ${midY + normalY * state.bulge} ${state.endX} ${state.endY}`;
	}

	function getItemConnectorLengthAt(itemPosition: NodePosition) {
		const parentPosition = getNodePosition(item.parent_node_id);
		if (!parentPosition || !itemElement) return undefined;

		const parentCenter = nodeCenter(parentPosition);
		const itemCenter = {
			x: itemPosition.x + itemElement.offsetWidth / 2,
			y: itemPosition.y + itemElement.offsetHeight / 2
		};
		const start = circleEdgePoint(parentCenter, NODE_RADIUS, itemCenter);
		const end = boxEdgePoint(
			{
				x: itemPosition.x,
				y: itemPosition.y,
				width: itemElement.offsetWidth,
				height: itemElement.offsetHeight
			},
			parentCenter
		);

		return Math.hypot(end.x - start.x, end.y - start.y);
	}

	function isWithinItemStretchBand(length: number) {
		return (
			(length > ITEM_CONNECTOR_MAX_LENGTH &&
				length <= ITEM_CONNECTOR_MAX_LENGTH + ITEM_CONNECTOR_STRETCH_GIVE) ||
			(length < ITEM_CONNECTOR_MIN_LENGTH &&
				length >= ITEM_CONNECTOR_MIN_LENGTH - ITEM_CONNECTOR_STRETCH_GIVE)
		);
	}

	function computeConstrainedItemPosition(): NodePosition | undefined {
		const itemPosition = getItemPosition();
		if (!itemPosition || !itemElement) return undefined;

		const initialLength = getItemConnectorLengthAt(itemPosition);
		if (initialLength === undefined) return undefined;

		if (
			initialLength >= ITEM_CONNECTOR_MIN_LENGTH &&
			initialLength <= ITEM_CONNECTOR_MAX_LENGTH
		) {
			return itemPosition;
		}

		if (isWithinItemStretchBand(initialLength)) {
			return itemPosition;
		}

		let nextPosition = { ...itemPosition };

		for (let iteration = 0; iteration < 16; iteration++) {
			const length = getItemConnectorLengthAt(nextPosition);
			if (length === undefined) return undefined;
			if (length >= ITEM_CONNECTOR_MIN_LENGTH && length <= ITEM_CONNECTOR_MAX_LENGTH) {
				return nextPosition;
			}

			const parentPosition = getNodePosition(item.parent_node_id);
			if (!parentPosition) return undefined;

			const parentCenter = nodeCenter(parentPosition);
			const itemCenter = {
				x: nextPosition.x + itemElement.offsetWidth / 2,
				y: nextPosition.y + itemElement.offsetHeight / 2
			};
			const dx = itemCenter.x - parentCenter.x;
			const dy = itemCenter.y - parentCenter.y;
			const centerDistance = Math.hypot(dx, dy) || 1;
			const unitX = dx / centerDistance;
			const unitY = dy / centerDistance;
			const targetLength =
				length > ITEM_CONNECTOR_MAX_LENGTH
					? ITEM_CONNECTOR_MAX_LENGTH
					: ITEM_CONNECTOR_MIN_LENGTH;
			const correction = (length - targetLength) * 0.8;

			nextPosition = {
				x: nextPosition.x - unitX * correction,
				y: nextPosition.y - unitY * correction
			};
		}

		return nextPosition;
	}

	function isParentNodeDragging() {
		return draggables.get(item.parent_node_id)?.grabbed ?? false;
	}

	function snapItemFollowTo(position: NodePosition) {
		itemDraggable?.setX(position.x, true);
		itemDraggable?.setY(position.y, true);
		itemFollowState.x = position.x;
		itemFollowState.y = position.y;

		if (itemFollowAnim) {
			itemFollowAnim.x(position.x, 0);
			itemFollowAnim.y(position.y, 0);
		}
	}

	function ensureItemFollowAnim() {
		if (itemFollowAnim) return itemFollowAnim;

		itemFollowAnim = createAnimatable(itemFollowState, {
			x: { ease: spring({ stiffness: 88, damping: 17, mass: 1.2 }) },
			y: { ease: spring({ stiffness: 88, damping: 17, mass: 1.2 }) },
			onUpdate: () => {
				itemDraggable?.setX(itemFollowState.x, true);
				itemDraggable?.setY(itemFollowState.y, true);
				renderItemConnector();
			}
		});

		return itemFollowAnim;
	}

	function setItemPosition(position: NodePosition, { spring = false } = {}) {
		if (!itemDraggable) return;

		if (spring) {
			const anim = ensureItemFollowAnim();
			anim.x(position.x);
			anim.y(position.y);
		} else {
			snapItemFollowTo(position);
		}
	}

	function constrainAttachedItem() {
		if (!showItem || !itemDraggable || !itemElement) return;

		const currentPosition = getItemPosition();
		const nextPosition = computeConstrainedItemPosition();
		if (!nextPosition || !currentPosition) return;

		const parentDragging = isParentNodeDragging();
		const itemDragging = itemDraggable.grabbed ?? false;
		const useSpring = parentDragging && !itemDragging;

		const moved =
			Math.abs(nextPosition.x - currentPosition.x) > 0.5 ||
			Math.abs(nextPosition.y - currentPosition.y) > 0.5;
		if (!moved && !useSpring) return;

		setItemPosition(nextPosition, { spring: useSpring });
	}

	function getItemConnectorTarget() {
		const parentPosition = getNodePosition(item.parent_node_id);
		const itemPosition = getItemPosition();
		if (!parentPosition || !itemPosition || !itemElement) return undefined;

		const parentCenter = nodeCenter(parentPosition);
		const itemCenter = {
			x: itemPosition.x + itemElement.offsetWidth / 2,
			y: itemPosition.y + itemElement.offsetHeight / 2
		};
		const start = circleEdgePoint(parentCenter, NODE_RADIUS, itemCenter);
		const end = boxEdgePoint(
			{
				x: itemPosition.x,
				y: itemPosition.y,
				width: itemElement.offsetWidth,
				height: itemElement.offsetHeight
			},
			parentCenter
		);
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distance = Math.hypot(dx, dy) || 1;

		return {
			startX: start.x,
			startY: start.y,
			endX: end.x,
			endY: end.y,
			bulge: Math.min(distance * 0.18, 42)
		};
	}

	function renderItemConnector() {
		const target = getItemConnectorTarget();
		if (!target) return;

		itemConnectorState.startX = target.startX;
		itemConnectorState.startY = target.startY;
		itemConnectorState.endX = target.endX;
		itemConnectorState.endY = target.endY;
		itemConnectorState.bulge = target.bulge;
		itemConnectorPath = buildItemConnectorPath(itemConnectorState);
	}

	function finalizeAttachedItem() {
		if (!showItem || !itemDraggable || !itemElement) return;

		const nextPosition = computeConstrainedItemPosition();
		if (nextPosition) {
			setItemPosition(nextPosition, { spring: false });
		}

		renderItemConnector();
	}

	function syncItemConnector() {
		renderItemConnector();
	}

	function syncConnectors() {
		constrainAttachedItem();

		const nextPaths: Record<string, string> = {};

		for (const edge of edges) {
			const fromPosition = getNodePosition(edge.fromId);
			const toPosition = getNodePosition(edge.toId);
			if (!fromPosition || !toPosition) continue;

			nextPaths[edge.id] = buildConnectorPath(fromPosition, toPosition);
		}

		connectorPaths = nextPaths;
		syncItemConnector();
	}

	function persistLayout() {
		const layout = nodes.reduce<Record<string, NodePosition>>((result, node) => {
			const draggable = draggables.get(node.node_id);
			if (!draggable) return result;

			result[node.node_id] = { x: draggable.x, y: draggable.y };
			return result;
		}, {});

		savePartNodeLayout(partId, layout);
	}

	function teardownDraggable(nodeId: string) {
		const draggable = draggables.get(nodeId);
		if (!draggable) return;

		draggable.revert();
		draggables.delete(nodeId);
	}

	function teardownItemDraggable() {
		itemDraggable?.revert();
		itemDraggable = undefined;
		itemFollowAnim?.revert();
		itemFollowAnim = undefined;
		itemConnectorPath = '';
	}

	function teardownAllDraggables() {
		for (const nodeId of draggables.keys()) {
			teardownDraggable(nodeId);
		}
		teardownItemDraggable();
	}

	function canSetupNodes() {
		return Boolean(canvasEl && nodes.length && nodes.every((node) => nodeElements.has(node.node_id)));
	}

	function canSetupItem() {
		return Boolean(showItem && canvasEl && itemElement && draggables.has(item.parent_node_id));
	}

	function setupNodeDraggables() {
		if (!canvasEl || !canSetupNodes()) return;

		const layout = resolvePartNodeLayout(
			partId,
			nodes.map((node) => node.node_id),
			canvasEl.clientWidth,
			canvasEl.clientHeight,
			STORY_NODE_SIZE
		);

		for (const node of nodes) {
			if (draggables.has(node.node_id)) continue;

			const element = nodeElements.get(node.node_id);
			if (!element) continue;

			const saved = layout[node.node_id];
			const draggable = createDraggable(element, {
				container: canvasEl,
				x: true,
				y: true,
				releaseStiffness: 180,
				releaseDamping: 16,
				releaseMass: 1.1,
				onUpdate: syncConnectors,
				onSettle: () => {
					if (node.node_id === item.parent_node_id) {
						finalizeAttachedItem();
					}
					syncConnectors();
					persistLayout();
				}
			});

			if (saved) {
				draggable.setX(saved.x, true);
				draggable.setY(saved.y, true);
			}

			draggables.set(node.node_id, draggable);
		}
	}

	function setupItemDraggable() {
		if (!canSetupItem() || !canvasEl || !itemElement || itemDraggable) return;

		const parentPosition = getNodePosition(item.parent_node_id);
		if (!parentPosition) return;

		const position = defaultItemPosition(parentPosition, STORY_NODE_SIZE);

		itemDraggable = createDraggable(itemElement, {
			container: canvasEl,
			x: true,
			y: true,
			releaseStiffness: 190,
			releaseDamping: 15,
			releaseMass: 0.9,
			onUpdate: syncConnectors,
			onSettle: () => {
				finalizeAttachedItem();
				syncConnectors();
			}
		});

		snapItemFollowTo(position);
		renderItemConnector();
	}

	function setupDraggables() {
		setupNodeDraggables();
		setupItemDraggable();
		syncConnectors();
	}

	function scheduleSetup() {
		const generation = ++setupGeneration;

		void (async () => {
			for (let attempt = 0; attempt < 12; attempt++) {
				await tick();
				if (!mounted || generation !== setupGeneration) return;

				setupDraggables();

				if (canSetupNodes() && (!showItem || canSetupItem())) {
					return;
				}
			}
		})();
	}

	onMount(() => {
		mounted = true;

		resizeObserver = new ResizeObserver(() => {
			for (const draggable of draggables.values()) {
				draggable.refresh();
			}
			itemDraggable?.refresh();
			syncConnectors();
		});

		if (canvasEl) {
			resizeObserver.observe(canvasEl);
		}

		scheduleSetup();

		return () => {
			mounted = false;
			resizeObserver?.disconnect();
			teardownAllDraggables();
		};
	});

	$effect(() => {
		const signature = nodes
			.map((node) => `${node.node_id}:${node.parent_node_ids.join('+')}`)
			.join(',');
		if (!mounted || !signature) return;

		for (const nodeId of draggables.keys()) {
			if (!nodes.some((node) => node.node_id === nodeId)) {
				teardownDraggable(nodeId);
			}
		}

		scheduleSetup();
	});
</script>

<div
	bind:this={canvasEl}
	style={`--part-canvas-height: ${canvasHeightRatio * 100}dvh; --story-node-size: ${STORY_NODE_SIZE}px;`}
>
	<svg aria-hidden="true">
		{#each edges as edge (edge.id)}
			<path data-kind="main" d={connectorPaths[edge.id] ?? ''} />
		{/each}
		{#if showItem}
			<path data-kind="item" d={itemConnectorPath} />
		{/if}
	</svg>

	{#each nodes as node (node.node_id)}
		<StoryNode {node} />
	{/each}

	{#if showItem}
		<StoryItem {item} />
	{/if}
</div>

<style>
	div {
		position: relative;
		min-height: var(--part-canvas-height, 200dvh);
		width: 100%;
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

	path[data-kind='item'] {
		stroke: color-mix(in srgb, var(--color-accent) 65%, var(--color-text-muted));
		stroke-width: 2;
		opacity: 0.75;
	}
</style>
