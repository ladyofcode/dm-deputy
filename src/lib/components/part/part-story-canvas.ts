import { createContext, tick } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import {
	createAnimatable,
	createDraggable,
	spring,
	type AnimatableObject,
	type Draggable
} from 'animejs';
import { STORY_NODE_SIZE } from '$lib/data/part-story-layout';
import { centerPanForBounds, loadPartCanvasPan, savePartCanvasPan } from '$lib/data/part-canvas-pan';
import {
	estimatedAttachableSizes,
	getPartStoryCanvasWidth,
	ITEM_CONNECTOR_MAX_LENGTH,
	ITEM_CONNECTOR_MIN_LENGTH,
	ITEM_CONNECTOR_STRETCH_GIVE,
	layoutSiblingItemsWithoutOverlap,
	loadPartItemLayout,
	minCanvasHeightForLayout,
	resolvePartItemLayout,
	resolvePartNodeLayout,
	savePartStory,
	separateSiblingItemLayout,
	type NodePosition,
	type PartNodeLayout,
	type StoryEdge
} from '$lib/data/part-story';
import type { StoryItem, StoryNode } from '$lib/types/schema';

export type StoryNodeCanvasContext = {
	registerElement: (nodeId: string, element: HTMLDivElement) => void;
	unregisterElement: (nodeId: string) => void;
	registerItem: (itemId: string, element: HTMLDivElement) => void;
	unregisterItem: (itemId: string) => void;
	updateStoryItem: (item: StoryItem) => void;
	requestConnectorSync: () => void;
};

export const [getStoryNodeCanvasContext, setStoryNodeCanvasContext] =
	createContext<StoryNodeCanvasContext>();

export const WORLD_PADDING = 64;

export type ContentBounds = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
};

export type ResolvedCanvasLayouts = {
	nodeLayout: PartNodeLayout;
	itemLayout: PartNodeLayout;
	sizeEstimates: ReturnType<typeof estimatedAttachableSizes>;
};

export type CanvasLayoutMetrics = {
	bounds: ContentBounds | null;
	minHeight: number;
};

export type StoryCanvasLayoutDeps = {
	getPartId: () => string;
	getNodes: () => StoryNode[];
	getStoryItems: () => StoryItem[];
	getCanvasAttachables: () => StoryItem[];
	getEdges: () => StoryEdge[];
	getLayoutBoundsTick: () => number;
	getItemElements: () => SvelteMap<string, HTMLDivElement>;
	getNodeDraggables: () => SvelteMap<string, Draggable>;
	getItemDraggables: () => SvelteMap<string, Draggable>;
	getViewportEl: () => HTMLDivElement | undefined;
	getNodePosition: (nodeId: string) => NodePosition | undefined;
	getItemPosition: (itemId: string) => NodePosition | undefined;
};

export function viewportWidth(deps: StoryCanvasLayoutDeps) {
	return deps.getViewportEl()?.clientWidth ?? getPartStoryCanvasWidth();
}

export function viewportHeight(deps: StoryCanvasLayoutDeps) {
	return (
		deps.getViewportEl()?.clientHeight ??
		(typeof window !== 'undefined' ? window.innerHeight : 800)
	);
}

export function getLiveNodeLayout(deps: StoryCanvasLayoutDeps) {
	return deps.getNodes().reduce<PartNodeLayout>((layout, node) => {
		const position = deps.getNodePosition(node.node_id);
		if (position) {
			layout[node.node_id] = position;
		}
		return layout;
	}, {});
}

export function getLiveItemLayout(deps: StoryCanvasLayoutDeps) {
	return deps.getCanvasAttachables().reduce<PartNodeLayout>((layout, attachable) => {
		const position = deps.getItemPosition(attachable.item_id);
		if (position) {
			layout[attachable.item_id] = position;
		}
		return layout;
	}, {});
}

export function resolveCanvasLayouts(deps: StoryCanvasLayoutDeps): ResolvedCanvasLayouts | null {
	void deps.getLayoutBoundsTick();

	const nodes = deps.getNodes();
	if (nodes.length === 0) {
		return null;
	}

	const canvasWidth = viewportWidth(deps);
	const canvasViewportHeight = viewportHeight(deps);
	const liveNodeLayout = getLiveNodeLayout(deps);
	const nodeLayout =
		Object.keys(liveNodeLayout).length === nodes.length
			? liveNodeLayout
			: resolvePartNodeLayout(
					deps.getPartId(),
					nodes.map((node) => node.node_id),
					canvasWidth,
					canvasViewportHeight,
					STORY_NODE_SIZE
				);
	const liveItemLayout = getLiveItemLayout(deps);
	const canvasAttachables = deps.getCanvasAttachables();
	const sizeEstimates = estimatedAttachableSizes(
		canvasAttachables,
		deps.getStoryItems(),
		nodes
	);
	const itemLayout =
		Object.keys(liveItemLayout).length === canvasAttachables.length
			? liveItemLayout
			: resolvePartItemLayout(
					deps.getPartId(),
					deps.getStoryItems(),
					nodeLayout,
					STORY_NODE_SIZE,
					liveNodeLayout,
					deps.getEdges(),
					nodes
				);

	return { nodeLayout, itemLayout, sizeEstimates };
}

export function computeContentBoundsFromLayouts(
	deps: StoryCanvasLayoutDeps,
	layouts: ResolvedCanvasLayouts
): ContentBounds | null {
	const { nodeLayout, itemLayout, sizeEstimates } = layouts;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	const bump = (x: number, y: number, width: number, height: number) => {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + width);
		maxY = Math.max(maxY, y + height);
	};

	for (const node of deps.getNodes()) {
		const position = deps.getNodePosition(node.node_id) ?? nodeLayout[node.node_id];
		if (!position) continue;
		bump(position.x, position.y, STORY_NODE_SIZE, STORY_NODE_SIZE);
	}

	const itemElements = deps.getItemElements();
	for (const attachable of deps.getCanvasAttachables()) {
		const position = deps.getItemPosition(attachable.item_id) ?? itemLayout[attachable.item_id];
		if (!position) continue;

		const element = itemElements.get(attachable.item_id);
		const size = element
			? { width: element.offsetWidth, height: element.offsetHeight }
			: (sizeEstimates[attachable.item_id] ?? { width: 150, height: 68 });
		bump(position.x, position.y, size.width, size.height);
	}

	if (!Number.isFinite(minX)) return null;

	return { minX, minY, maxX, maxY };
}

export function computeCanvasLayoutMetrics(deps: StoryCanvasLayoutDeps): CanvasLayoutMetrics {
	const layouts = resolveCanvasLayouts(deps);
	if (!layouts) {
		return { bounds: null, minHeight: 0 };
	}

	const { nodeLayout, itemLayout, sizeEstimates } = layouts;
	const bounds = computeContentBoundsFromLayouts(deps, layouts);
	const itemElements = deps.getItemElements();
	const itemHeights = Object.fromEntries(
		deps.getCanvasAttachables().map((item) => [
			item.item_id,
			itemElements.get(item.item_id)?.offsetHeight ?? sizeEstimates[item.item_id]?.height ?? 0
		])
	);
	const minHeight = minCanvasHeightForLayout(
		nodeLayout,
		STORY_NODE_SIZE,
		itemLayout,
		itemHeights
	);

	return { bounds, minHeight };
}

export function computeWorldSize(
	deps: StoryCanvasLayoutDeps,
	contentBounds: ContentBounds | null,
	canvasMinHeight: number
) {
	void deps.getLayoutBoundsTick();
	const width = viewportWidth(deps);
	const height = Math.max(viewportHeight(deps), canvasMinHeight);

	if (!contentBounds) {
		return { width, height };
	}

	return {
		width: Math.max(width, contentBounds.maxX - contentBounds.minX + WORLD_PADDING * 2),
		height: Math.max(height, contentBounds.maxY - contentBounds.minY + WORLD_PADDING * 2)
	};
}

export function dragContainerBounds(
	deps: StoryCanvasLayoutDeps,
	contentBounds: ContentBounds | null,
	worldSize: { width: number; height: number }
): [number, number, number, number] {
	void deps.getLayoutBoundsTick();
	const pad = WORLD_PADDING * 6;

	if (!contentBounds) {
		const { width, height } = worldSize;
		return [-width, width * 2, height * 2, -width];
	}

	return [
		contentBounds.minY - pad,
		contentBounds.maxX + pad,
		contentBounds.maxY + pad,
		contentBounds.minX - pad
	];
}

export function persistLayout(deps: StoryCanvasLayoutDeps) {
	const nodeDraggables = deps.getNodeDraggables();
	const itemDraggables = deps.getItemDraggables();

	const nodeLayout = deps.getNodes().reduce<Record<string, NodePosition>>((result, node) => {
		const draggable = nodeDraggables.get(node.node_id);
		if (!draggable) return result;

		result[node.node_id] = { x: draggable.x, y: draggable.y };
		return result;
	}, {});

	const itemLayout = deps.getCanvasAttachables().reduce<Record<string, NodePosition>>(
		(result, attachable) => {
			const draggable = itemDraggables.get(attachable.item_id);
			if (!draggable) return result;

			result[attachable.item_id] = { x: draggable.x, y: draggable.y };
			return result;
		},
		{}
	);

	void savePartStory(deps.getPartId(), { nodeLayout, itemLayout });
}

const PAN_DRAG_THRESHOLD_SQ = 36;

export type PanState = {
	panX: number;
	panY: number;
	isPanning: boolean;
	panPending: boolean;
	panInitialized: boolean;
	panPointerId: number | null;
	panStart: { x: number; y: number; panX: number; panY: number } | null;
};

export type StoryCanvasPanDeps = {
	getPartId: () => string;
	getViewportEl: () => HTMLDivElement | undefined;
	getPanState: () => PanState;
	setPanState: (next: Partial<PanState>) => void;
	getContentBounds: () => ContentBounds | null;
};

export function createStoryCanvasPanController(deps: StoryCanvasPanDeps) {
	function persistPan() {
		const { panX, panY } = deps.getPanState();
		savePartCanvasPan(deps.getPartId(), { x: panX, y: panY });
	}

	function clearPanWindowListeners() {
		if (typeof window === 'undefined') return;
		window.removeEventListener('pointerup', handleWindowPointerEnd);
		window.removeEventListener('pointercancel', handleWindowPointerEnd);
	}

	function endPan() {
		const state = deps.getPanState();
		if (!state.isPanning && !state.panPending) return;

		const capturedId = state.panPointerId;
		deps.setPanState({
			isPanning: false,
			panPending: false,
			panPointerId: null,
			panStart: null
		});

		const viewportEl = deps.getViewportEl();
		if (capturedId !== null && viewportEl?.hasPointerCapture(capturedId)) {
			try {
				viewportEl.releasePointerCapture(capturedId);
			} catch {}
		}

		clearPanWindowListeners();
		document.body.style.removeProperty('cursor');
		persistPan();
	}

	function handleWindowPointerEnd() {
		endPan();
	}

	function isPanExcludedTarget(target: EventTarget | null) {
		return Boolean(
			target instanceof Element &&
				target.closest('[data-story-draggable], button, input, textarea, select, a, label')
		);
	}

	function handlePanPointerDown(event: PointerEvent) {
		if (event.button !== 0 || isPanExcludedTarget(event.target)) return;

		const state = deps.getPanState();
		deps.setPanState({
			panPending: true,
			panPointerId: event.pointerId,
			panStart: { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY }
		});

		try {
			deps.getViewportEl()?.setPointerCapture(event.pointerId);
		} catch {}

		window.addEventListener('pointerup', handleWindowPointerEnd);
		window.addEventListener('pointercancel', handleWindowPointerEnd);
		event.preventDefault();
	}

	function handlePanPointerMove(event: PointerEvent) {
		const state = deps.getPanState();
		if ((!state.panPending && !state.isPanning) || !state.panStart || event.pointerId !== state.panPointerId) {
			return;
		}

		const dx = event.clientX - state.panStart.x;
		const dy = event.clientY - state.panStart.y;

		if (!state.isPanning && dx * dx + dy * dy < PAN_DRAG_THRESHOLD_SQ) return;

		if (!state.isPanning) {
			document.body.style.cursor = 'grabbing';
		}

		deps.setPanState({
			isPanning: true,
			panX: state.panStart.panX + dx,
			panY: state.panStart.panY + dy
		});
		event.preventDefault();
	}

	function handleLostPointerCapture() {
		endPan();
	}

	function centerContentInViewport() {
		const bounds = deps.getContentBounds();
		const viewportEl = deps.getViewportEl();
		if (!bounds || !viewportEl) return;

		const nextPan = centerPanForBounds(viewportEl.clientWidth, viewportEl.clientHeight, bounds);
		deps.setPanState({ panX: nextPan.x, panY: nextPan.y });
		persistPan();
	}

	function initializePan() {
		const state = deps.getPanState();
		if (state.panInitialized || !deps.getViewportEl()) return;

		const saved = loadPartCanvasPan(deps.getPartId());
		if (saved) {
			deps.setPanState({ panX: saved.x, panY: saved.y, panInitialized: true });
		} else {
			centerContentInViewport();
			deps.setPanState({ panInitialized: true });
		}
	}

	function loadPanForPart() {
		const saved = loadPartCanvasPan(deps.getPartId());
		if (saved) {
			deps.setPanState({ panX: saved.x, panY: saved.y, panInitialized: true });
		} else {
			deps.setPanState({ panInitialized: false });
		}
	}

	function resetPanInitialized() {
		deps.setPanState({ panInitialized: false });
	}

	return {
		endPan,
		handlePanPointerDown,
		handlePanPointerMove,
		handleLostPointerCapture,
		initializePan,
		loadPanForPart,
		resetPanInitialized,
		persistPan
	};
}

const NODE_RADIUS = STORY_NODE_SIZE / 2;

type ItemConnectorState = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	bulge: number;
};

export type StoryCanvasConnectorDeps = StoryCanvasLayoutDeps & {
	getEdges: () => StoryEdge[];
	getConnectorPaths: () => Record<string, string>;
	setConnectorPaths: (paths: Record<string, string>) => void;
	getItemConnectorPaths: () => Record<string, string>;
	setItemConnectorPaths: (paths: Record<string, string>) => void;
	getNodeDraggables: () => SvelteMap<string, Draggable>;
	getItemDraggables: () => SvelteMap<string, Draggable>;
	getItemElements: () => SvelteMap<string, HTMLDivElement>;
	getNodePosition: (nodeId: string) => NodePosition | undefined;
	getItemPosition: (itemId: string) => NodePosition | undefined;
	snapItemFollowTo: (itemId: string, position: NodePosition) => void;
	setItemPosition: (
		itemId: string,
		position: NodePosition,
		options?: { spring?: boolean }
	) => void;
	refreshCanvasBounds: () => void;
};

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

export function createStoryCanvasConnectorController(deps: StoryCanvasConnectorDeps) {
	function getAttachmentCenterForParent(parentNodeId: string) {
		const parentPosition = deps.getNodePosition(parentNodeId);
		if (!parentPosition) return undefined;

		return nodeCenter(parentPosition);
	}

	function getCanvasAttachable(itemId: string) {
		return deps.getCanvasAttachables().find((item) => item.item_id === itemId);
	}

	function getItemConnectorLengthAt(
		storyItem: StoryItem,
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
		storyItem: StoryItem,
		itemElement: HTMLDivElement
	): NodePosition | undefined {
		const itemPosition = deps.getItemPosition(storyItem.item_id);
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

	function isParentNodeDragging(parentNodeId: string) {
		return deps.getNodeDraggables().get(parentNodeId)?.grabbed ?? false;
	}

	function constrainAttachedItem(storyItem: StoryItem) {
		const itemElements = deps.getItemElements();
		const itemDraggables = deps.getItemDraggables();
		const itemElement = itemElements.get(storyItem.item_id);
		const itemDraggable = itemDraggables.get(storyItem.item_id);
		if (!itemElement || !itemDraggable) return;

		const itemDragging = itemDraggable.grabbed ?? false;
		const parentDragging = isParentNodeDragging(storyItem.parent_node_id);

		if (parentDragging && !itemDragging) return;

		const currentPosition = deps.getItemPosition(storyItem.item_id);
		const nextPosition = computeConstrainedItemPosition(storyItem, itemElement);
		if (!nextPosition || !currentPosition) return;

		const moved =
			Math.abs(nextPosition.x - currentPosition.x) > 0.5 ||
			Math.abs(nextPosition.y - currentPosition.y) > 0.5;
		if (!moved) return;

		deps.setItemPosition(storyItem.item_id, nextPosition);
	}

	function getItemConnectorTarget(storyItem: StoryItem) {
		const itemElements = deps.getItemElements();
		const itemElement = itemElements.get(storyItem.item_id);
		const itemPosition = deps.getItemPosition(storyItem.item_id);
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

	function updateItemConnector(itemId: string) {
		const storyItem = getCanvasAttachable(itemId);
		if (!storyItem) return;

		const target = getItemConnectorTarget(storyItem);
		if (!target) return;

		deps.setItemConnectorPaths({
			...deps.getItemConnectorPaths(),
			[itemId]: buildItemConnectorPath(target)
		});
	}

	function renderItemConnector(itemId: string) {
		updateItemConnector(itemId);
	}

	function renderAllItemConnectors() {
		const nextPaths: Record<string, string> = {};

		for (const attachable of deps.getCanvasAttachables()) {
			const target = getItemConnectorTarget(attachable);
			if (!target) continue;

			nextPaths[attachable.item_id] = buildItemConnectorPath(target);
		}

		deps.setItemConnectorPaths(nextPaths);
	}

	function getItemSizesForParent(parentNodeId: string, items: StoryItem[]) {
		const sizes = estimatedAttachableSizes(items, deps.getStoryItems());
		const itemElements = deps.getItemElements();

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

		for (const [itemId, draggable] of deps.getItemDraggables().entries()) {
			if (draggable.grabbed) {
				pinned.add(itemId);
			}
		}

		return pinned;
	}

	function getSiblingLayout(items: StoryItem[]) {
		return items.reduce<Record<string, NodePosition>>((layout, storyItem) => {
			const position = deps.getItemPosition(storyItem.item_id);
			if (position) {
				layout[storyItem.item_id] = position;
			}
			return layout;
		}, {});
	}

	function applyItemLayout(
		items: StoryItem[],
		layout: Record<string, NodePosition>,
		{ animate = false, skipPinned = false }: { animate?: boolean; skipPinned?: boolean } = {}
	) {
		const pinned = skipPinned ? getPinnedItemIds() : new SvelteSet<string>();

		for (const storyItem of items) {
			if (skipPinned && pinned.has(storyItem.item_id)) continue;

			const position = layout[storyItem.item_id];
			if (!position) continue;

			deps.setItemPosition(storyItem.item_id, position, { spring: animate });
		}
	}

	function getAttachablesForParent(parentNodeId: string) {
		return deps.getCanvasAttachables().filter((item) => item.parent_node_id === parentNodeId);
	}

	function separateSiblingItemsLive(parentNodeId: string) {
		if (isParentNodeDragging(parentNodeId)) return;

		const parentPosition = deps.getNodePosition(parentNodeId);
		if (!parentPosition) return;

		const siblings = getAttachablesForParent(parentNodeId);
		if (!siblings.length) return;

		const pinned = getPinnedItemIds();
		const sizes = getItemSizesForParent(parentNodeId, siblings);
		const currentLayout = getSiblingLayout(siblings);
		const separated = separateSiblingItemLayout(
			parentPosition,
			STORY_NODE_SIZE,
			siblings,
			currentLayout,
			sizes,
			{
				pinnedItemIds: pinned,
				maxIterations: 16
			}
		);

		for (const storyItem of siblings) {
			if (pinned.has(storyItem.item_id)) continue;

			const position = separated[storyItem.item_id];
			if (!position) continue;

			deps.snapItemFollowTo(storyItem.item_id, position);
		}
	}

	function settleSiblingItemsForParent(parentNodeId: string, { animate = false } = {}) {
		const parentPosition = deps.getNodePosition(parentNodeId);
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
				nodeLayout: getLiveNodeLayout(deps),
				edges: deps.getEdges()
			}
		);

		applyItemLayout(siblings, layout, { animate });
		renderAllItemConnectors();
		deps.refreshCanvasBounds();
	}

	function syncConnectors() {
		const nextPaths: Record<string, string> = {};

		for (const edge of deps.getEdges()) {
			const fromPosition = deps.getNodePosition(edge.fromId);
			const toPosition = deps.getNodePosition(edge.toId);
			if (!fromPosition || !toPosition) continue;

			nextPaths[edge.id] = buildConnectorPath(fromPosition, toPosition);
		}

		deps.setConnectorPaths(nextPaths);
		renderAllItemConnectors();
	}

	function syncConnectorsForNode(nodeId: string) {
		const nextNodePaths = { ...deps.getConnectorPaths() };

		for (const edge of deps.getEdges()) {
			if (edge.fromId !== nodeId && edge.toId !== nodeId) continue;

			const fromPosition = deps.getNodePosition(edge.fromId);
			const toPosition = deps.getNodePosition(edge.toId);
			if (!fromPosition || !toPosition) continue;

			nextNodePaths[edge.id] = buildConnectorPath(fromPosition, toPosition);
		}

		deps.setConnectorPaths(nextNodePaths);

		const nextItemPaths = { ...deps.getItemConnectorPaths() };

		for (const attachable of deps.getCanvasAttachables()) {
			if (attachable.parent_node_id !== nodeId) continue;

			const target = getItemConnectorTarget(attachable);
			if (!target) continue;

			nextItemPaths[attachable.item_id] = buildItemConnectorPath(target);
		}

		deps.setItemConnectorPaths(nextItemPaths);
	}

	function updateCanvasDuringDrag(options?: { nodeId?: string; itemId?: string }) {
		if (options?.nodeId) {
			syncConnectorsForNode(options.nodeId);
			separateSiblingItemsLive(options.nodeId);
			return;
		}

		if (options?.itemId) {
			updateItemConnector(options.itemId);
			return;
		}

		syncConnectors();
		renderAllItemConnectors();
	}

	return {
		renderItemConnector,
		renderAllItemConnectors,
		syncConnectors,
		syncConnectorsForNode,
		updateCanvasDuringDrag
	};
}

const NODE_RELEASE_STIFFNESS = 300;
const NODE_RELEASE_DAMPING = 28;
const NODE_RELEASE_MASS = 0.9;
const ITEM_RELEASE_STIFFNESS = 180;
const ITEM_RELEASE_DAMPING = 16;
const ITEM_RELEASE_MASS = 1.1;

export type StoryCanvasDraggableDeps = StoryCanvasLayoutDeps & {
	getCanvasEl: () => HTMLDivElement | undefined;
	getEdges: () => StoryEdge[];
	getContentBounds: () => ContentBounds | null;
	getWorldSize: () => { width: number; height: number };
	getNodeElements: () => SvelteMap<string, HTMLDivElement>;
	getItemElements: () => SvelteMap<string, HTMLDivElement>;
	getNodeDraggables: () => SvelteMap<string, Draggable>;
	getItemDraggables: () => SvelteMap<string, Draggable>;
	getItemFollowAnims: () => SvelteMap<string, AnimatableObject>;
	getItemFollowStates: () => SvelteMap<string, { x: number; y: number }>;
	getItemConnectorPaths: () => Record<string, string>;
	setItemConnectorPaths: (paths: Record<string, string>) => void;
	getMounted: () => boolean;
	updateCanvasDuringDrag: (options?: { nodeId?: string; itemId?: string }) => void;
	syncConnectors: () => void;
	renderItemConnector: (itemId: string) => void;
	initializePan: () => void;
	refreshCanvasBounds: () => void;
};

export function createStoryCanvasDraggableController(deps: StoryCanvasDraggableDeps) {
	let setupGeneration = 0;

	function getNodePosition(nodeId: string): NodePosition | undefined {
		const draggable = deps.getNodeDraggables().get(nodeId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
	}

	function getItemPosition(itemId: string): NodePosition | undefined {
		const draggable = deps.getItemDraggables().get(itemId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
	}

	function getItemFollowState(itemId: string) {
		const itemFollowStates = deps.getItemFollowStates();
		let state = itemFollowStates.get(itemId);
		if (!state) {
			state = { x: 0, y: 0 };
			itemFollowStates.set(itemId, state);
		}

		return state;
	}

	function snapItemFollowTo(itemId: string, position: NodePosition) {
		const itemDraggables = deps.getItemDraggables();
		const draggable = itemDraggables.get(itemId);
		if (!draggable) return;

		draggable.setX(position.x, true);
		draggable.setY(position.y, true);

		const followState = getItemFollowState(itemId);
		followState.x = position.x;
		followState.y = position.y;

		const followAnim = deps.getItemFollowAnims().get(itemId);
		if (followAnim) {
			followAnim.x?.(position.x, 0);
			followAnim.y?.(position.y, 0);
		}
	}

	function ensureItemFollowAnim(itemId: string) {
		const itemFollowAnims = deps.getItemFollowAnims();
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
				const draggable = deps.getItemDraggables().get(itemId);
				draggable?.setX(followState.x, true);
				draggable?.setY(followState.y, true);
				deps.renderItemConnector(itemId);
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
		if (!deps.getItemDraggables().has(itemId)) return;

		if (useSpring) {
			const anim = ensureItemFollowAnim(itemId);
			anim.x?.(position.x);
			anim.y?.(position.y);
		} else {
			snapItemFollowTo(itemId, position);
		}
	}

	function teardownNodeDraggable(nodeId: string) {
		const nodeDraggables = deps.getNodeDraggables();
		const draggable = nodeDraggables.get(nodeId);
		if (!draggable) return;

		draggable.revert();
		nodeDraggables.delete(nodeId);
	}

	function teardownItemDraggable(itemId: string) {
		const itemDraggables = deps.getItemDraggables();
		const draggable = itemDraggables.get(itemId);
		draggable?.revert();
		itemDraggables.delete(itemId);

		const itemFollowAnims = deps.getItemFollowAnims();
		const followAnim = itemFollowAnims.get(itemId);
		followAnim?.revert();
		itemFollowAnims.delete(itemId);
		deps.getItemFollowStates().delete(itemId);

		const remainingPaths = { ...deps.getItemConnectorPaths() };
		delete remainingPaths[itemId];
		deps.setItemConnectorPaths(remainingPaths);
	}

	function teardownAllDraggables() {
		for (const nodeId of deps.getNodeDraggables().keys()) {
			teardownNodeDraggable(nodeId);
		}
		for (const itemId of deps.getItemDraggables().keys()) {
			teardownItemDraggable(itemId);
		}
	}

	function canSetupNodes() {
		const canvasEl = deps.getCanvasEl();
		const nodes = deps.getNodes();
		const nodeElements = deps.getNodeElements();

		return Boolean(canvasEl && nodes.length && nodes.every((node) => nodeElements.has(node.node_id)));
	}

	function canSetupItems() {
		const canvasEl = deps.getCanvasEl();
		const canvasAttachables = deps.getCanvasAttachables();
		if (!canvasEl || !canvasAttachables.length) return true;

		const itemElements = deps.getItemElements();
		const nodeDraggables = deps.getNodeDraggables();

		return canvasAttachables.every(
			(attachable) =>
				itemElements.has(attachable.item_id) && nodeDraggables.has(attachable.parent_node_id)
		);
	}

	function getDragContainerBounds(): [number, number, number, number] {
		return dragContainerBounds(deps, deps.getContentBounds(), deps.getWorldSize());
	}

	function setupNodeDraggables() {
		const canvasEl = deps.getCanvasEl();
		if (!canvasEl || !canSetupNodes()) return;

		const nodes = deps.getNodes();
		const nodeElements = deps.getNodeElements();
		const nodeDraggables = deps.getNodeDraggables();

		const layout = resolvePartNodeLayout(
			deps.getPartId(),
			nodes.map((node) => node.node_id),
			viewportWidth(deps),
			viewportHeight(deps),
			STORY_NODE_SIZE
		);

		for (const node of nodes) {
			if (nodeDraggables.has(node.node_id)) continue;

			const element = nodeElements.get(node.node_id);
			if (!element) continue;

			const saved = layout[node.node_id];
			const draggable = createDraggable(element, {
				container: getDragContainerBounds,
				x: true,
				y: true,
				releaseStiffness: NODE_RELEASE_STIFFNESS,
				releaseDamping: NODE_RELEASE_DAMPING,
				releaseMass: NODE_RELEASE_MASS,
				maxVelocity: 18,
				velocityMultiplier: 0.65,
				onUpdate: () => {
					deps.updateCanvasDuringDrag({ nodeId: node.node_id });
				},
				onRelease: () => {
					deps.syncConnectors();
				},
				onSettle: () => {
					deps.refreshCanvasBounds();
					persistLayout(deps);
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
		const canvasEl = deps.getCanvasEl();
		const canvasAttachables = deps.getCanvasAttachables();
		if (!canvasEl || !canSetupNodes() || !canvasAttachables.length) return;

		const nodes = deps.getNodes();
		const itemElements = deps.getItemElements();
		const itemDraggables = deps.getItemDraggables();

		const nodeLayout = resolvePartNodeLayout(
			deps.getPartId(),
			nodes.map((node) => node.node_id),
			viewportWidth(deps),
			viewportHeight(deps),
			STORY_NODE_SIZE
		);
		const persistedLayout = loadPartItemLayout(deps.getPartId()) ?? {};
		const resolvedLayout = resolvePartItemLayout(
			deps.getPartId(),
			deps.getStoryItems(),
			nodeLayout,
			STORY_NODE_SIZE,
			getLiveNodeLayout(deps),
			deps.getEdges(),
			nodes
		);
		const itemLayout = { ...resolvedLayout, ...persistedLayout };

		for (const attachable of canvasAttachables) {
			if (itemDraggables.has(attachable.item_id)) continue;

			const element = itemElements.get(attachable.item_id);
			if (!element) continue;

			const saved = itemLayout[attachable.item_id];
			const dragHandle =
				attachable.kind === 'map' ? element.querySelector<HTMLElement>('[data-drag-handle]') : null;
			const draggable = createDraggable(element, {
				container: getDragContainerBounds,
				x: true,
				y: true,
				trigger: dragHandle ?? element,
				releaseStiffness: ITEM_RELEASE_STIFFNESS,
				releaseDamping: ITEM_RELEASE_DAMPING,
				releaseMass: ITEM_RELEASE_MASS,
				onUpdate: () => {
					deps.updateCanvasDuringDrag({ itemId: attachable.item_id });
				},
				onSettle: () => {
					deps.refreshCanvasBounds();
					deps.syncConnectors();
					persistLayout(deps);
				}
			});

			itemDraggables.set(attachable.item_id, draggable);

			if (saved) {
				draggable.setX(saved.x, true);
				draggable.setY(saved.y, true);
				const followState = getItemFollowState(attachable.item_id);
				followState.x = saved.x;
				followState.y = saved.y;
			}

			deps.renderItemConnector(attachable.item_id);
		}
	}

	function setupDraggables() {
		setupNodeDraggables();
		setupItemDraggables();
		deps.syncConnectors();
	}

	function scheduleSetup() {
		const generation = ++setupGeneration;

		void (async () => {
			for (let attempt = 0; attempt < 12; attempt++) {
				await tick();
				if (!deps.getMounted() || generation !== setupGeneration) return;

				setupDraggables();

				if (canSetupNodes() && canSetupItems()) {
					await tick();
					await tick();
					deps.syncConnectors();
					deps.initializePan();
					return;
				}
			}
		})();
	}

	function refreshDraggablesOnResize() {
		for (const draggable of deps.getNodeDraggables().values()) {
			draggable.refresh();
		}
		for (const draggable of deps.getItemDraggables().values()) {
			draggable.refresh();
		}
		deps.syncConnectors();
	}

	function syncDraggablesWithNodes(nodes: StoryNode[], canvasAttachables: StoryItem[]) {
		for (const nodeId of deps.getNodeDraggables().keys()) {
			if (!nodes.some((node) => node.node_id === nodeId)) {
				teardownNodeDraggable(nodeId);
			}
		}

		for (const itemId of deps.getItemDraggables().keys()) {
			if (!canvasAttachables.some((item) => item.item_id === itemId)) {
				teardownItemDraggable(itemId);
			}
		}

		scheduleSetup();
	}

	return {
		getNodePosition,
		getItemPosition,
		snapItemFollowTo,
		setItemPosition,
		teardownNodeDraggable,
		teardownItemDraggable,
		teardownAllDraggables,
		scheduleSetup,
		refreshDraggablesOnResize,
		syncDraggablesWithNodes
	};
}
