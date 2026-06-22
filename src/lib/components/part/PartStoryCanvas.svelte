<script lang="ts">
	import { onMount, setContext, tick } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import {
		createAnimatable,
		createDraggable,
		spring,
		type AnimatableObject,
		type Draggable
	} from 'animejs';
	import StoryItem from '$lib/components/part/StoryItem.svelte';
	import StoryRewardGroup from '$lib/components/part/StoryRewardGroup.svelte';
	import StoryNode, {
		STORY_NODE_SIZE,
		type StoryNodeCanvasContext
	} from '$lib/components/part/StoryNode.svelte';
	import {
		canvasAttachableItems,
		groupRewardItemsByParent,
		isStoryItemReward
	} from '$lib/domain/story-item-reward';
	import {
		buildStoryEdges,
		getPartStoryCanvasWidth,
		ITEM_CONNECTOR_MAX_LENGTH,
		ITEM_CONNECTOR_MIN_LENGTH,
		ITEM_CONNECTOR_STRETCH_GIVE,
		layoutSiblingItemsWithoutOverlap,
		minCanvasHeightForLayout,
		estimatedAttachableSizes,
		separateSiblingItemLayout,
		resolvePartItemLayout,
		resolvePartNodeLayout,
		savePartItemLayout,
		savePartNodeLayout,
		type NodePosition,
		type PartNodeLayout
	} from '$lib/data/part-story';
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

	type ItemConnectorState = {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
		bulge: number;
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

	const canvasAttachables = $derived(canvasAttachableItems(storyItems));
	const looseItems = $derived(storyItems.filter((item) => !isStoryItemReward(item)));
	const rewardGroupEntries = $derived([...groupRewardItemsByParent(storyItems).entries()]);
	const completedNodeIds = $derived(
		new Set(nodes.filter((node) => node.completed_at).map((node) => node.node_id))
	);

	function isConnectorDimmed(parentNodeId: string) {
		return completedNodeIds.has(parentNodeId);
	}

	function isEdgeDimmed(edge: { fromId: string; toId: string }) {
		return completedNodeIds.has(edge.fromId) || completedNodeIds.has(edge.toId);
	}

	const NODE_RADIUS = STORY_NODE_SIZE / 2;
	const NODE_RELEASE_STIFFNESS = 300;
	const NODE_RELEASE_DAMPING = 28;
	const NODE_RELEASE_MASS = 0.9;
	const ITEM_RELEASE_STIFFNESS = 180;
	const ITEM_RELEASE_DAMPING = 16;
	const ITEM_RELEASE_MASS = 1.1;
	let layoutBoundsTick = $state(0);

	function refreshCanvasBounds() {
		layoutBoundsTick += 1;
	}

	async function updateCanvasDuringDrag() {
		refreshCanvasBounds();
		await tick();
		for (const draggable of nodeDraggables.values()) {
			draggable.refresh();
		}
		for (const draggable of itemDraggables.values()) {
			draggable.refresh();
		}
		syncConnectors();
	}

	function getLiveNodeLayout() {
		return nodes.reduce<PartNodeLayout>((layout, node) => {
			const position = getNodePosition(node.node_id);
			if (position) {
				layout[node.node_id] = position;
			}
			return layout;
		}, {});
	}

	function getLiveItemLayout() {
		return canvasAttachables.reduce<PartNodeLayout>((layout, attachable) => {
			const position = getItemPosition(attachable.item_id);
			if (position) {
				layout[attachable.item_id] = position;
			}
			return layout;
		}, {});
	}

	const canvasMinHeight = $derived.by(() => {
		void layoutBoundsTick;

		if (nodes.length === 0) return 0;

		const canvasWidth = canvasEl?.clientWidth ?? getPartStoryCanvasWidth();
		const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
		const liveNodeLayout = getLiveNodeLayout();
		const nodeLayout =
			Object.keys(liveNodeLayout).length === nodes.length
				? liveNodeLayout
				: resolvePartNodeLayout(
						partId,
						nodes.map((node) => node.node_id),
						canvasWidth,
						viewportHeight,
						STORY_NODE_SIZE
					);
		const liveItemLayout = getLiveItemLayout();
		const estimatedSizes = estimatedAttachableSizes(canvasAttachables, storyItems);
		const itemLayout =
			Object.keys(liveItemLayout).length === canvasAttachables.length
				? liveItemLayout
				: resolvePartItemLayout(
						partId,
						storyItems,
						nodeLayout,
						STORY_NODE_SIZE,
						liveNodeLayout,
						edges
					);
		const itemHeights = Object.fromEntries(
			canvasAttachables.map((item) => [
				item.item_id,
				itemElements.get(item.item_id)?.offsetHeight ?? estimatedSizes[item.item_id]?.height ?? 0
			])
		);

		return minCanvasHeightForLayout(nodeLayout, STORY_NODE_SIZE, itemLayout, itemHeights);
	});
	const edges = $derived(buildStoryEdges(nodes));

	let canvasEl = $state<HTMLDivElement | undefined>();
	let connectorPaths = $state<Record<string, string>>({});
	let itemConnectorPaths = $state<Record<string, string>>({});

	const nodeElements = new SvelteMap<string, HTMLDivElement>();
	const nodeDraggables = new SvelteMap<string, Draggable>();
	const itemElements = new SvelteMap<string, HTMLDivElement>();
	const itemDraggables = new SvelteMap<string, Draggable>();
	const itemFollowAnims = new SvelteMap<string, AnimatableObject>();
	const itemFollowStates = new SvelteMap<string, { x: number; y: number }>();

	let resizeObserver: ResizeObserver | undefined;
	let setupGeneration = 0;
	let mounted = false;

	const canvasContext: StoryNodeCanvasContext = {
		registerElement(nodeId, element) {
			nodeElements.set(nodeId, element);
			scheduleSetup();
		},
		unregisterElement(nodeId) {
			nodeElements.delete(nodeId);
			teardownNodeDraggable(nodeId);
		},
		registerItem(itemId, element) {
			itemElements.set(itemId, element);
			scheduleSetup();
		},
		unregisterItem(itemId) {
			teardownItemDraggable(itemId);
			itemElements.delete(itemId);
		},
		updateStoryItem(item) {
			void onStoryItemUpdate?.(item);
		},
		requestConnectorSync() {
			syncConnectors();
		}
	};

	setContext('story-node-canvas', canvasContext);

	function nodeCenter(position: NodePosition) {
		return {
			x: position.x + NODE_RADIUS,
			y: position.y + NODE_RADIUS
		};
	}

	function getAttachmentCenterForParent(parentNodeId: string) {
		const parentPosition = getNodePosition(parentNodeId);
		if (!parentPosition) return undefined;

		return nodeCenter(parentPosition);
	}

	function getCanvasAttachable(itemId: string) {
		return canvasAttachables.find((item) => item.item_id === itemId);
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
		const draggable = nodeDraggables.get(nodeId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
	}

	function getItemPosition(itemId: string): NodePosition | undefined {
		const draggable = itemDraggables.get(itemId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
	}

	function getItemFollowState(itemId: string) {
		let state = itemFollowStates.get(itemId);
		if (!state) {
			state = { x: 0, y: 0 };
			itemFollowStates.set(itemId, state);
		}

		return state;
	}

	function buildConnectorPath(fromPosition: NodePosition, toPosition: NodePosition): string {
		const fromCenter = nodeCenter(fromPosition);
		const toCenter = nodeCenter(toPosition);
		const start = circleEdgePoint(fromCenter, NODE_RADIUS, toCenter);
		const end = circleEdgePoint(toCenter, NODE_RADIUS, fromCenter);
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distance = Math.hypot(dx, dy) || 1;
		const bulge = Math.min(distance * 0.14, 56);

		let controlX = midX;
		let controlY = midY;

		if (Math.abs(dx) >= Math.abs(dy)) {
			controlY = midY + bulge;
		} else if (dx !== 0) {
			controlX = midX + Math.sign(dx) * bulge;
		}

		return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
	}

	function buildItemConnectorPath(state: ItemConnectorState): string {
		return `M ${state.startX} ${state.startY} L ${state.endX} ${state.endY}`;
	}

	function getItemConnectorLengthAt(
		storyItem: StoryItemData,
		itemPosition: NodePosition,
		itemElement: HTMLDivElement
	) {
		const attachmentCenter = getAttachmentCenterForParent(storyItem.parent_node_id);
		if (!attachmentCenter) return undefined;

		const itemCenter = {
			x: itemPosition.x + itemElement.offsetWidth / 2,
			y: itemPosition.y + itemElement.offsetHeight / 2
		};

		const start = circleEdgePoint(attachmentCenter, NODE_RADIUS, itemCenter);

		const end = boxEdgePoint(
			{
				x: itemPosition.x,
				y: itemPosition.y,
				width: itemElement.offsetWidth,
				height: itemElement.offsetHeight
			},
			attachmentCenter
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

	function computeConstrainedItemPosition(
		storyItem: StoryItemData,
		itemElement: HTMLDivElement
	): NodePosition | undefined {
		const itemPosition = getItemPosition(storyItem.item_id);
		if (!itemPosition) return undefined;

		const initialLength = getItemConnectorLengthAt(storyItem, itemPosition, itemElement);
		if (initialLength === undefined) return undefined;

		if (initialLength >= ITEM_CONNECTOR_MIN_LENGTH && initialLength <= ITEM_CONNECTOR_MAX_LENGTH) {
			return itemPosition;
		}

		if (isWithinItemStretchBand(initialLength)) {
			return itemPosition;
		}

		let nextPosition = { ...itemPosition };

		for (let iteration = 0; iteration < 16; iteration++) {
			const length = getItemConnectorLengthAt(storyItem, nextPosition, itemElement);
			if (length === undefined) return undefined;
			if (length >= ITEM_CONNECTOR_MIN_LENGTH && length <= ITEM_CONNECTOR_MAX_LENGTH) {
				return nextPosition;
			}

			const attachmentCenter = getAttachmentCenterForParent(storyItem.parent_node_id);
			if (!attachmentCenter) return undefined;

			const itemCenter = {
				x: nextPosition.x + itemElement.offsetWidth / 2,
				y: nextPosition.y + itemElement.offsetHeight / 2
			};
			const dx = itemCenter.x - attachmentCenter.x;
			const dy = itemCenter.y - attachmentCenter.y;
			const centerDistance = Math.hypot(dx, dy) || 1;
			const unitX = dx / centerDistance;
			const unitY = dy / centerDistance;
			const targetLength =
				length > ITEM_CONNECTOR_MAX_LENGTH ? ITEM_CONNECTOR_MAX_LENGTH : ITEM_CONNECTOR_MIN_LENGTH;
			const correction = (length - targetLength) * 0.8;

			nextPosition = {
				x: nextPosition.x - unitX * correction,
				y: nextPosition.y - unitY * correction
			};
		}

		return nextPosition;
	}

	function isAnyItemDragActive() {
		for (const draggable of itemDraggables.values()) {
			if (draggable.grabbed) return true;
		}

		return false;
	}

	function snapItemFollowTo(itemId: string, position: NodePosition) {
		const draggable = itemDraggables.get(itemId);
		if (!draggable) return;

		draggable.setX(position.x, true);
		draggable.setY(position.y, true);

		const followState = getItemFollowState(itemId);
		followState.x = position.x;
		followState.y = position.y;

		const followAnim = itemFollowAnims.get(itemId);
		if (followAnim) {
			followAnim.x(position.x, 0);
			followAnim.y(position.y, 0);
		}
	}

	function isParentNodeDragging(parentNodeId: string) {
		return nodeDraggables.get(parentNodeId)?.grabbed ?? false;
	}

	function ensureItemFollowAnim(itemId: string) {
		const existing = itemFollowAnims.get(itemId);
		if (existing) return existing;

		const followState = getItemFollowState(itemId);
		const followAnim = createAnimatable(followState, {
			x: {
				ease: spring({
					stiffness: ITEM_RELEASE_STIFFNESS,
					damping: ITEM_RELEASE_DAMPING,
					mass: ITEM_RELEASE_MASS
				})
			},
			y: {
				ease: spring({
					stiffness: ITEM_RELEASE_STIFFNESS,
					damping: ITEM_RELEASE_DAMPING,
					mass: ITEM_RELEASE_MASS
				})
			},
			onUpdate: () => {
				const draggable = itemDraggables.get(itemId);
				draggable?.setX(followState.x, true);
				draggable?.setY(followState.y, true);
				renderItemConnector(itemId);
			}
		});

		itemFollowAnims.set(itemId, followAnim);
		return followAnim;
	}

	function setItemPosition(
		itemId: string,
		position: NodePosition,
		{ spring: useSpring = false } = {}
	) {
		if (!itemDraggables.has(itemId)) return;

		if (useSpring) {
			const anim = ensureItemFollowAnim(itemId);
			anim.x(position.x);
			anim.y(position.y);
		} else {
			snapItemFollowTo(itemId, position);
		}
	}

	function constrainAttachedItem(storyItem: StoryItemData) {
		const itemElement = itemElements.get(storyItem.item_id);
		const itemDraggable = itemDraggables.get(storyItem.item_id);
		if (!itemElement || !itemDraggable) return;

		const itemDragging = itemDraggable.grabbed ?? false;
		const parentDragging = isParentNodeDragging(storyItem.parent_node_id);

		if (parentDragging && !itemDragging) return;

		const currentPosition = getItemPosition(storyItem.item_id);
		const nextPosition = computeConstrainedItemPosition(storyItem, itemElement);
		if (!nextPosition || !currentPosition) return;

		const moved =
			Math.abs(nextPosition.x - currentPosition.x) > 0.5 ||
			Math.abs(nextPosition.y - currentPosition.y) > 0.5;
		if (!moved) return;

		setItemPosition(storyItem.item_id, nextPosition);
	}

	function getItemConnectorTarget(storyItem: StoryItemData) {
		const itemElement = itemElements.get(storyItem.item_id);
		const itemPosition = getItemPosition(storyItem.item_id);
		const attachmentCenter = getAttachmentCenterForParent(storyItem.parent_node_id);
		if (!itemElement || !itemPosition || !attachmentCenter) return undefined;

		const itemCenter = {
			x: itemPosition.x + itemElement.offsetWidth / 2,
			y: itemPosition.y + itemElement.offsetHeight / 2
		};

		const start = circleEdgePoint(attachmentCenter, NODE_RADIUS, itemCenter);

		const end = boxEdgePoint(
			{
				x: itemPosition.x,
				y: itemPosition.y,
				width: itemElement.offsetWidth,
				height: itemElement.offsetHeight
			},
			attachmentCenter
		);

		return {
			startX: start.x,
			startY: start.y,
			endX: end.x,
			endY: end.y,
			bulge: 0
		};
	}

	function renderItemConnector(itemId: string) {
		const storyItem = getCanvasAttachable(itemId);
		if (!storyItem) return;

		const target = getItemConnectorTarget(storyItem);
		if (!target) return;

		itemConnectorPaths = {
			...itemConnectorPaths,
			[itemId]: buildItemConnectorPath(target)
		};
	}

	function renderAllItemConnectors() {
		const nextPaths: Record<string, string> = {};

		for (const attachable of canvasAttachables) {
			const target = getItemConnectorTarget(attachable);
			if (!target) continue;

			nextPaths[attachable.item_id] = buildItemConnectorPath(target);
		}

		itemConnectorPaths = nextPaths;
	}

	function getItemSizesForParent(parentNodeId: string, items: StoryItemData[]) {
		const sizes = estimatedAttachableSizes(items, storyItems);

		for (const storyItem of items) {
			const element = itemElements.get(storyItem.item_id);
			if (!element) continue;

			sizes[storyItem.item_id] = {
				width: element.offsetWidth,
				height: element.offsetHeight
			};
		}

		return sizes;
	}

	function getPinnedItemIds() {
		const pinned = new SvelteSet<string>();

		for (const [itemId, draggable] of itemDraggables.entries()) {
			if (draggable.grabbed) {
				pinned.add(itemId);
			}
		}

		return pinned;
	}

	function getSiblingLayout(items: StoryItemData[]) {
		return items.reduce<Record<string, NodePosition>>((layout, storyItem) => {
			const position = getItemPosition(storyItem.item_id);
			if (position) {
				layout[storyItem.item_id] = position;
			}
			return layout;
		}, {});
	}

	function applyItemLayout(
		items: StoryItemData[],
		layout: Record<string, NodePosition>,
		{ animate = false, skipPinned = false }: { animate?: boolean; skipPinned?: boolean } = {}
	) {
		const pinned = skipPinned ? getPinnedItemIds() : new SvelteSet<string>();

		for (const storyItem of items) {
			if (skipPinned && pinned.has(storyItem.item_id)) continue;

			const position = layout[storyItem.item_id];
			if (!position) continue;

			setItemPosition(storyItem.item_id, position, { spring: animate });
		}
	}

	function getAttachablesForParent(parentNodeId: string) {
		return canvasAttachables.filter((item) => item.parent_node_id === parentNodeId);
	}

	function separateSiblingItemsLive(parentNodeId: string) {
		if (isParentNodeDragging(parentNodeId)) return;

		const parentPosition = getNodePosition(parentNodeId);
		if (!parentPosition) return;

		const siblings = getAttachablesForParent(parentNodeId);
		if (!siblings.length) return;

		const sizes = getItemSizesForParent(parentNodeId, siblings);
		const currentLayout = getSiblingLayout(siblings);
		const separated = separateSiblingItemLayout(
			parentPosition,
			STORY_NODE_SIZE,
			siblings,
			currentLayout,
			sizes,
			{
				pinnedItemIds: getPinnedItemIds(),
				maxIterations: 16
			}
		);

		for (const storyItem of siblings) {
			if (getPinnedItemIds().has(storyItem.item_id)) continue;

			const position = separated[storyItem.item_id];
			if (!position) continue;

			snapItemFollowTo(storyItem.item_id, position);
		}
	}

	function separateAllSiblingItems() {
		for (const node of nodes) {
			separateSiblingItemsLive(node.node_id);
		}
	}

	function settleSiblingItemsForParent(parentNodeId: string, { animate = false } = {}) {
		const parentPosition = getNodePosition(parentNodeId);
		if (!parentPosition) return;

		const siblings = getAttachablesForParent(parentNodeId);
		if (!siblings.length) return;

		const sizes = getItemSizesForParent(parentNodeId, siblings);
		const layout = layoutSiblingItemsWithoutOverlap(
			parentPosition,
			STORY_NODE_SIZE,
			siblings,
			sizes,
			{
				parentNodeId,
				nodeLayout: getLiveNodeLayout(),
				edges
			}
		);

		applyItemLayout(siblings, layout, { animate });
		renderAllItemConnectors();
		refreshCanvasBounds();
	}

	function settleAllSiblingItems({ animate = false } = {}) {
		for (const node of nodes) {
			settleSiblingItemsForParent(node.node_id, { animate });
		}
	}

	function finalizeAttachedItem(storyItem: StoryItemData, { animate = false } = {}) {
		settleSiblingItemsForParent(storyItem.parent_node_id, { animate });
	}

	function finalizeAttachedItemsForParent(parentNodeId: string, { animate = false } = {}) {
		settleSiblingItemsForParent(parentNodeId, { animate });
	}

	function constrainAttachedItems() {
		for (const attachable of canvasAttachables) {
			constrainAttachedItem(attachable);
		}
	}

	function syncConnectors({ applyConstraints = true } = {}) {
		if (applyConstraints && isAnyItemDragActive()) {
			constrainAttachedItems();
			separateAllSiblingItems();
		}

		const nextPaths: Record<string, string> = {};

		for (const edge of edges) {
			const fromPosition = getNodePosition(edge.fromId);
			const toPosition = getNodePosition(edge.toId);
			if (!fromPosition || !toPosition) continue;

			nextPaths[edge.id] = buildConnectorPath(fromPosition, toPosition);
		}

		connectorPaths = nextPaths;
		renderAllItemConnectors();
	}

	function persistLayout() {
		const nodeLayout = nodes.reduce<Record<string, NodePosition>>((result, node) => {
			const draggable = nodeDraggables.get(node.node_id);
			if (!draggable) return result;

			result[node.node_id] = { x: draggable.x, y: draggable.y };
			return result;
		}, {});

		const itemLayout = canvasAttachables.reduce<Record<string, NodePosition>>(
			(result, attachable) => {
				const draggable = itemDraggables.get(attachable.item_id);
				if (!draggable) return result;

				result[attachable.item_id] = { x: draggable.x, y: draggable.y };
				return result;
			},
			{}
		);

		savePartNodeLayout(partId, nodeLayout);
		savePartItemLayout(partId, itemLayout);
	}

	function teardownNodeDraggable(nodeId: string) {
		const draggable = nodeDraggables.get(nodeId);
		if (!draggable) return;

		draggable.revert();
		nodeDraggables.delete(nodeId);
	}

	function teardownItemDraggable(itemId: string) {
		const draggable = itemDraggables.get(itemId);
		draggable?.revert();
		itemDraggables.delete(itemId);

		const followAnim = itemFollowAnims.get(itemId);
		followAnim?.revert();
		itemFollowAnims.delete(itemId);
		itemFollowStates.delete(itemId);

		const remainingPaths = { ...itemConnectorPaths };
		delete remainingPaths[itemId];
		itemConnectorPaths = remainingPaths;
	}

	function teardownAllDraggables() {
		for (const nodeId of nodeDraggables.keys()) {
			teardownNodeDraggable(nodeId);
		}
		for (const itemId of itemDraggables.keys()) {
			teardownItemDraggable(itemId);
		}
	}

	function canSetupNodes() {
		return Boolean(
			canvasEl && nodes.length && nodes.every((node) => nodeElements.has(node.node_id))
		);
	}

	function canSetupItems() {
		if (!canvasEl || !canvasAttachables.length) return true;

		return canvasAttachables.every(
			(attachable) =>
				itemElements.has(attachable.item_id) && nodeDraggables.has(attachable.parent_node_id)
		);
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
			if (nodeDraggables.has(node.node_id)) continue;

			const element = nodeElements.get(node.node_id);
			if (!element) continue;

			const saved = layout[node.node_id];
			const draggable = createDraggable(element, {
				container: canvasEl,
				x: true,
				y: true,
				releaseStiffness: NODE_RELEASE_STIFFNESS,
				releaseDamping: NODE_RELEASE_DAMPING,
				releaseMass: NODE_RELEASE_MASS,
				maxVelocity: 18,
				velocityMultiplier: 0.65,
				onUpdate: () => {
					void updateCanvasDuringDrag();
				},
				onRelease: () => {
					finalizeAttachedItemsForParent(node.node_id, { animate: true });
					syncConnectors({ applyConstraints: false });
				},
				onSettle: () => {
					refreshCanvasBounds();
					persistLayout();
				}
			});

			if (saved) {
				draggable.setX(saved.x, true);
				draggable.setY(saved.y, true);
			}

			nodeDraggables.set(node.node_id, draggable);
		}
	}

	function setupItemDraggables() {
		if (!canvasEl || !canSetupNodes() || !canvasAttachables.length) return;

		const nodeLayout = resolvePartNodeLayout(
			partId,
			nodes.map((node) => node.node_id),
			canvasEl.clientWidth,
			canvasEl.clientHeight,
			STORY_NODE_SIZE
		);
		const itemLayout = resolvePartItemLayout(
			partId,
			storyItems,
			nodeLayout,
			STORY_NODE_SIZE,
			getLiveNodeLayout(),
			edges
		);

		for (const attachable of canvasAttachables) {
			if (itemDraggables.has(attachable.item_id)) continue;

			const element = itemElements.get(attachable.item_id);
			if (!element) continue;

			const saved = itemLayout[attachable.item_id];
			const dragHandle =
				attachable.kind === 'map' ? element.querySelector<HTMLElement>('[data-drag-handle]') : null;
			const draggable = createDraggable(element, {
				container: canvasEl,
				x: true,
				y: true,
				trigger: dragHandle ?? element,
				releaseStiffness: ITEM_RELEASE_STIFFNESS,
				releaseDamping: ITEM_RELEASE_DAMPING,
				releaseMass: ITEM_RELEASE_MASS,
				onUpdate: () => {
					void updateCanvasDuringDrag();
				},
				onSettle: () => {
					finalizeAttachedItem(attachable, { animate: true });
					refreshCanvasBounds();
					syncConnectors({ applyConstraints: false });
					persistLayout();
				}
			});

			if (saved) {
				snapItemFollowTo(attachable.item_id, saved);
			}

			itemDraggables.set(attachable.item_id, draggable);
			renderItemConnector(attachable.item_id);
		}
	}

	function setupDraggables() {
		setupNodeDraggables();
		setupItemDraggables();
		syncConnectors({ applyConstraints: false });
	}

	function scheduleSetup() {
		const generation = ++setupGeneration;

		void (async () => {
			for (let attempt = 0; attempt < 12; attempt++) {
				await tick();
				if (!mounted || generation !== setupGeneration) return;

				setupDraggables();

				if (canSetupNodes() && canSetupItems()) {
					await tick();
					await tick();
					settleAllSiblingItems();
					syncConnectors({ applyConstraints: false });
					persistLayout();
					return;
				}
			}
		})();
	}

	onMount(() => {
		mounted = true;

		resizeObserver = new ResizeObserver(() => {
			for (const draggable of nodeDraggables.values()) {
				draggable.refresh();
			}
			for (const draggable of itemDraggables.values()) {
				draggable.refresh();
			}
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
		const nodeSignature = nodes
			.map((node) => `${node.node_id}:${node.parent_node_ids.join('+')}`)
			.join(',');
		const attachableSignature = canvasAttachables.map((item) => item.item_id).join(',');
		if (!mounted || !nodeSignature) return;

		for (const nodeId of nodeDraggables.keys()) {
			if (!nodes.some((node) => node.node_id === nodeId)) {
				teardownNodeDraggable(nodeId);
			}
		}

		for (const itemId of itemDraggables.keys()) {
			if (!canvasAttachables.some((item) => item.item_id === itemId)) {
				teardownItemDraggable(itemId);
			}
		}

		void attachableSignature;
		scheduleSetup();
	});
</script>

<div
	bind:this={canvasEl}
	style={`--part-canvas-height: ${canvasMinHeight}px; --story-node-size: ${STORY_NODE_SIZE}px;`}
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
				data-kind={attachable.kind}
				data-dimmed={isConnectorDimmed(attachable.parent_node_id) ? 'true' : undefined}
				d={itemConnectorPaths[attachable.item_id] ?? ''}
			/>
		{/each}
	</svg>

	{#each nodes as node (node.node_id)}
		<StoryNode
			{node}
			hasArms={storyItems.some((item) => item.parent_node_id === node.node_id)}
			onActivate={onActivateNode}
			onManageArms={onManageNodeArms}
			onToggleComplete={onToggleNodeComplete}
		/>
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

<style>
	div {
		position: relative;
		min-height: var(--part-canvas-height, 0);
		width: 100%;
		max-width: 100%;
		overflow-x: clip;
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
