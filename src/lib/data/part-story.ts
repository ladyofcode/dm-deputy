import type { StoryNode, StoryItem, StoryNodeKind } from '$lib/types/schema';
import {
	STORY_NODE_SIZE,
	type ItemSize,
	type NodePosition,
	type PartItemLayout,
	type PartNodeLayout
} from '$lib/data/part-story-layout';
import {
	getCachedPartStory,
	isDatabaseCacheReady,
	activateCachedStoryNode,
	toggleCachedStoryNodeCompleted,
	updateCachedPartItemLayout,
	updateCachedPartNodeLayout,
	updateCachedPartStoryItems,
	updateCachedPartStoryNodes
} from '$lib/db/cache';
import {
	getEncounterResolutionEventIdsInDb,
	activateStoryNodeInDb,
	toggleStoryNodeCompletedInDb,
	savePartItemLayout as persistPartItemLayout,
	savePartNodeLayout as persistPartNodeLayout,
	savePartStoryItems as persistPartStoryItemsInDb,
	savePartStoryNodes as persistPartStoryNodes,
	savePartStory as persistPartStory
} from '$lib/db/client';
import { normalizeStoryItem, isPersistedStoryItem, storyItemSize } from '$lib/domain/story-item';
import {
	estimateRewardGroupSize,
	isRewardGroupId,
	isStoryItemReward,
	rewardXpFromItems
} from '$lib/domain/story-item-reward';
import {
	estimateNodeSummarySize,
	isNodeSummaryId,
	partCanvasAttachables
} from '$lib/domain/story-node-summary';

export type {
	ItemSize,
	NodePosition,
	PartItemLayout,
	PartNodeLayout
} from '$lib/data/part-story-layout';

export type StoryEdge = {
	id: string;
	fromId: string;
	toId: string;
};

function assertStoryReady(): void {
	if (!isDatabaseCacheReady()) {
		throw new Error('Database is not ready yet');
	}
}

export function getInitialStoryItems(partId: string): StoryItem[] {
	const saved = loadPartStoryItems(partId);
	if (!saved?.length) return [];

	return saved.map(normalizeStoryItem).filter(isPersistedStoryItem);
}

export function getStoryItemsForNodes(partId: string, nodeIds: string[]): StoryItem[] {
	const nodeIdSet = new Set(nodeIds);
	return getInitialStoryItems(partId).filter((item) => nodeIdSet.has(item.parent_node_id));
}

export async function savePartStoryItems(partId: string, items: StoryItem[]): Promise<void> {
	assertStoryReady();
	const normalized = items.map(normalizeStoryItem).filter(isPersistedStoryItem);
	updateCachedPartStoryItems(partId, normalized);
	await persistPartStoryItemsInDb(partId, normalized);
}

const ITEM_KIND_ORDER = {
	xp: 0,
	money: 1,
	item: 2,
	npc: 3,
	note: 4,
	map: 5
} as const;

export const ESTIMATED_ITEM_SIZE = { width: 150, height: 68 };
export const ITEM_LAYOUT_GAP = 24;
const ITEM_LAYOUT_ELLIPSE_X = 1.48;
const ITEM_LAYOUT_ELLIPSE_Y = 1.08;
const MAX_ITEMS_PER_RING = 12;
const BLOCKED_EDGE_ANGLE_MARGIN = 0.85;

export type ItemLayoutOptions = {
	parentNodeId?: string;
	nodeLayout?: PartNodeLayout;
	edges?: StoryEdge[];
};

function nodeCenterFromLayout(position: NodePosition, nodeSize: number) {
	return {
		x: position.x + nodeSize / 2,
		y: position.y + nodeSize / 2
	};
}

function angularDistance(a: number, b: number): number {
	return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function blockedEdgeAngles(
	parentNodeId: string,
	parentCenter: { x: number; y: number },
	nodeLayout: PartNodeLayout,
	edges: StoryEdge[],
	nodeSize: number
): number[] {
	const angles: number[] = [];

	for (const edge of edges) {
		const neighborId =
			edge.fromId === parentNodeId ? edge.toId : edge.toId === parentNodeId ? edge.fromId : null;
		if (!neighborId) continue;

		const neighborPosition = nodeLayout[neighborId];
		if (!neighborPosition) continue;

		const neighborCenter = nodeCenterFromLayout(neighborPosition, nodeSize);
		const dx = neighborCenter.x - parentCenter.x;
		const dy = neighborCenter.y - parentCenter.y;
		const distance = Math.hypot(dx, dy);
		if (distance <= 0.01) continue;

		angles.push(Math.atan2(dy, dx));
	}

	return angles;
}

function isAngleBlocked(angle: number, blockedAngles: number[]): boolean {
	return blockedAngles.some(
		(blocked) => angularDistance(angle, blocked) < BLOCKED_EDGE_ANGLE_MARGIN
	);
}

function clearAngleFromEdges(angle: number, blockedAngles: number[]): number {
	if (!blockedAngles.length || !isAngleBlocked(angle, blockedAngles)) {
		return angle;
	}

	let bestAngle = angle;
	let bestScore = -1;

	for (let step = 0; step < 16; step++) {
		const candidate = angle + (step * Math.PI) / 8;
		const score = Math.min(...blockedAngles.map((blocked) => angularDistance(candidate, blocked)));
		if (score > bestScore) {
			bestScore = score;
			bestAngle = candidate;
		}
	}

	return bestAngle;
}

function preferredAttachableAngle(blockedAngles: number[]): number {
	const candidates = [
		0,
		Math.PI,
		Math.PI / 4,
		-Math.PI / 4,
		(3 * Math.PI) / 4,
		(-3 * Math.PI) / 4,
		-Math.PI / 2,
		Math.PI / 2
	];

	let bestAngle = -Math.PI / 2;
	let bestScore = -1;

	for (const candidate of candidates) {
		if (isAngleBlocked(candidate, blockedAngles)) continue;

		const score = blockedAngles.length
			? Math.min(...blockedAngles.map((blocked) => angularDistance(candidate, blocked)))
			: Math.PI;

		if (score > bestScore) {
			bestScore = score;
			bestAngle = candidate;
		}
	}

	return clearAngleFromEdges(bestAngle, blockedAngles);
}

function slotAngleForItem(
	indexInRing: number,
	itemsInRing: number,
	ring: number,
	blockedAngles: number[]
): number {
	if (itemsInRing === 1 && ring === 0) {
		return preferredAttachableAngle(blockedAngles);
	}

	return clearAngleFromEdges(angleForEllipticalSlot(indexInRing, itemsInRing, ring), blockedAngles);
}

function sortItemsForLayout(items: StoryItem[]) {
	return [...items].sort(
		(a, b) => ITEM_KIND_ORDER[a.kind] - ITEM_KIND_ORDER[b.kind] || a.label.localeCompare(b.label)
	);
}

function itemCenter(position: NodePosition, size: ItemSize) {
	return {
		x: position.x + size.width / 2,
		y: position.y + size.height / 2
	};
}

function itemBounds(position: NodePosition, size: ItemSize) {
	return {
		left: position.x,
		top: position.y,
		right: position.x + size.width,
		bottom: position.y + size.height
	};
}

function boxesOverlap(
	posA: NodePosition,
	sizeA: ItemSize,
	posB: NodePosition,
	sizeB: ItemSize,
	gap = ITEM_LAYOUT_GAP
) {
	const a = itemBounds(posA, sizeA);
	const b = itemBounds(posB, sizeB);

	return (
		a.left < b.right + gap &&
		a.right + gap > b.left &&
		a.top < b.bottom + gap &&
		a.bottom + gap > b.top
	);
}

export function itemsLayoutOverlaps(
	items: StoryItem[],
	layout: PartItemLayout,
	sizes: Record<string, ItemSize>,
	gap = ITEM_LAYOUT_GAP
) {
	for (let i = 0; i < items.length; i++) {
		for (let j = i + 1; j < items.length; j++) {
			const itemA = items[i];
			const itemB = items[j];
			if (!itemA || !itemB) continue;

			const sizeA = sizes[itemA.item_id] ?? ESTIMATED_ITEM_SIZE;
			const sizeB = sizes[itemB.item_id] ?? ESTIMATED_ITEM_SIZE;
			const posA = layout[itemA.item_id];
			const posB = layout[itemB.item_id];
			if (!posA || !posB) continue;

			if (boxesOverlap(posA, sizeA, posB, sizeB, gap)) {
				return true;
			}
		}
	}

	return false;
}

function fromCenter(center: { x: number; y: number }, size: ItemSize): NodePosition {
	return {
		x: center.x - size.width / 2,
		y: center.y - size.height / 2
	};
}

function maxItemSize(items: StoryItem[], sizes: Record<string, ItemSize>) {
	return items.reduce(
		(max, item) => {
			const size = sizes[item.item_id] ?? ESTIMATED_ITEM_SIZE;
			return {
				width: Math.max(max.width, size.width),
				height: Math.max(max.height, size.height)
			};
		},
		{ width: ESTIMATED_ITEM_SIZE.width, height: ESTIMATED_ITEM_SIZE.height }
	);
}

function itemsPerRing(orbit: number, itemWidth: number, itemCount: number) {
	const minAngle = 2 * Math.asin(Math.min(1, (itemWidth + ITEM_LAYOUT_GAP) / (2 * orbit)));
	const capacity = Math.floor((Math.PI * 2) / minAngle);
	return Math.max(1, Math.min(MAX_ITEMS_PER_RING, capacity, itemCount));
}

function angleForEllipticalSlot(indexInRing: number, itemsInRing: number, ring: number) {
	if (itemsInRing === 1) {
		return -Math.PI / 2 + ring * (Math.PI / 5);
	}

	const startOffset = -Math.PI / 2 + Math.PI / (2 * itemsInRing);
	const slotAngle = (Math.PI * 2 * indexInRing) / itemsInRing;
	const ringOffset = ring * (Math.PI / itemsInRing);

	return startOffset + slotAngle + ringOffset;
}

function arrangeEllipticalLayout(
	sortedItems: StoryItem[],
	sizes: Record<string, ItemSize>,
	parentCenter: { x: number; y: number },
	nodeRadius: number,
	blockedAngles: number[] = []
) {
	const largest = maxItemSize(sortedItems, sizes);
	const baseOrbit = nodeRadius + ITEM_CONNECTOR_MAX_LENGTH + largest.height / 2 + 16;
	const ringStep = largest.height + ITEM_LAYOUT_GAP + 52;
	const perRing = itemsPerRing(
		Math.max(baseOrbit * ITEM_LAYOUT_ELLIPSE_X, baseOrbit * ITEM_LAYOUT_ELLIPSE_Y),
		largest.width + 8,
		sortedItems.length
	);
	const layout: PartItemLayout = {};

	sortedItems.forEach((storyItem, index) => {
		const size = sizes[storyItem.item_id] ?? ESTIMATED_ITEM_SIZE;
		const ring = Math.floor(index / perRing);
		const indexInRing = index % perRing;
		const ringStart = ring * perRing;
		const itemsInRing = Math.min(perRing, sortedItems.length - ringStart);
		const radiusX = baseOrbit * ITEM_LAYOUT_ELLIPSE_X + ring * ringStep * 0.85;
		const radiusY = baseOrbit * ITEM_LAYOUT_ELLIPSE_Y + ring * ringStep * 0.65;
		const angle = slotAngleForItem(indexInRing, itemsInRing, ring, blockedAngles);

		layout[storyItem.item_id] = fromCenter(
			{
				x: parentCenter.x + Math.cos(angle) * radiusX,
				y: parentCenter.y + Math.sin(angle) * radiusY
			},
			size
		);
	});

	return layout;
}

function createInitialOrbitLayout(
	sortedItems: StoryItem[],
	sizes: Record<string, ItemSize>,
	parentCenter: { x: number; y: number },
	nodeRadius: number,
	blockedAngles: number[] = []
) {
	return arrangeEllipticalLayout(sortedItems, sizes, parentCenter, nodeRadius, blockedAngles);
}

function separationVector(
	posA: NodePosition,
	sizeA: ItemSize,
	posB: NodePosition,
	sizeB: ItemSize,
	gap = ITEM_LAYOUT_GAP
) {
	if (!boxesOverlap(posA, sizeA, posB, sizeB, gap)) return null;

	const centerA = itemCenter(posA, sizeA);
	const centerB = itemCenter(posB, sizeB);
	let dx = centerB.x - centerA.x;
	let dy = centerB.y - centerA.y;
	let distance = Math.hypot(dx, dy);

	if (distance < 0.01) {
		dx = 1;
		dy = 0;
		distance = 1;
	}

	const a = itemBounds(posA, sizeA);
	const b = itemBounds(posB, sizeB);
	const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left) + gap;
	const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + gap;
	const push = Math.max(overlapX, overlapY);

	return {
		x: (dx / distance) * push,
		y: (dy / distance) * push
	};
}

function applySeparation(
	layout: PartItemLayout,
	itemA: StoryItem,
	itemB: StoryItem,
	sizeA: ItemSize,
	sizeB: ItemSize,
	separation: { x: number; y: number },
	pinnedItemIds: Set<string>
) {
	const currentA = layout[itemA.item_id];
	const currentB = layout[itemB.item_id];
	if (!currentA || !currentB) return false;

	const aPinned = pinnedItemIds.has(itemA.item_id);
	const bPinned = pinnedItemIds.has(itemB.item_id);

	if (aPinned && bPinned) return false;

	if (aPinned) {
		layout[itemB.item_id] = {
			x: currentB.x + separation.x,
			y: currentB.y + separation.y
		};
		return true;
	}

	if (bPinned) {
		layout[itemA.item_id] = {
			x: currentA.x - separation.x,
			y: currentA.y - separation.y
		};
		return true;
	}

	layout[itemA.item_id] = {
		x: currentA.x - separation.x / 2,
		y: currentA.y - separation.y / 2
	};
	layout[itemB.item_id] = {
		x: currentB.x + separation.x / 2,
		y: currentB.y + separation.y / 2
	};

	return true;
}

function pushAwayFromParentNode(
	layout: PartItemLayout,
	storyItem: StoryItem,
	size: ItemSize,
	parentCenter: { x: number; y: number },
	nodeRadius: number
) {
	const position = layout[storyItem.item_id];
	if (!position) return false;

	const center = itemCenter(position, size);
	const dx = center.x - parentCenter.x;
	const dy = center.y - parentCenter.y;
	const distance = Math.hypot(dx, dy) || 1;
	const minDistance = nodeRadius + ITEM_LAYOUT_GAP + Math.max(size.width, size.height) / 2;

	if (distance >= minDistance) return false;

	const scale = minDistance / distance;
	layout[storyItem.item_id] = fromCenter(
		{
			x: parentCenter.x + dx * scale,
			y: parentCenter.y + dy * scale
		},
		size
	);

	return true;
}

export function separateSiblingItemLayout(
	parentPosition: NodePosition,
	nodeSize: number,
	items: StoryItem[],
	layout: PartItemLayout,
	sizes: Record<string, ItemSize> = {},
	{
		pinnedItemIds = new Set<string>(),
		maxIterations = 80
	}: {
		pinnedItemIds?: Set<string>;
		maxIterations?: number;
	} = {}
): PartItemLayout {
	if (!items.length) return layout;

	const nodeRadius = nodeSize / 2;
	const parentCenter = {
		x: parentPosition.x + nodeRadius,
		y: parentPosition.y + nodeRadius
	};

	const nextLayout = { ...layout };

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		let moved = false;

		for (let i = 0; i < items.length; i++) {
			const itemA = items[i];
			if (!itemA) continue;

			const sizeA = sizes[itemA.item_id] ?? ESTIMATED_ITEM_SIZE;
			if (!nextLayout[itemA.item_id]) continue;

			if (
				!pinnedItemIds.has(itemA.item_id) &&
				pushAwayFromParentNode(nextLayout, itemA, sizeA, parentCenter, nodeRadius)
			) {
				moved = true;
			}

			for (let j = i + 1; j < items.length; j++) {
				const itemB = items[j];
				if (!itemB) continue;
				const sizeB = sizes[itemB.item_id] ?? ESTIMATED_ITEM_SIZE;
				const currentA = nextLayout[itemA.item_id];
				const currentB = nextLayout[itemB.item_id];
				if (!currentA || !currentB) continue;

				const separation = separationVector(currentA, sizeA, currentB, sizeB);
				if (!separation) continue;

				if (applySeparation(nextLayout, itemA, itemB, sizeA, sizeB, separation, pinnedItemIds)) {
					moved = true;
				}
			}
		}

		if (!moved) break;
	}

	return nextLayout;
}

export function layoutSiblingItemsWithoutOverlap(
	parentPosition: NodePosition,
	nodeSize: number,
	items: StoryItem[],
	sizes: Record<string, ItemSize> = {},
	options: ItemLayoutOptions = {}
): PartItemLayout {
	if (!items.length) return {};

	const sortedItems = sortItemsForLayout(items);
	const nodeRadius = nodeSize / 2;
	const parentCenter = {
		x: parentPosition.x + nodeRadius,
		y: parentPosition.y + nodeRadius
	};

	const blockedAngles =
		options.parentNodeId && options.nodeLayout && options.edges
			? blockedEdgeAngles(
					options.parentNodeId,
					parentCenter,
					options.nodeLayout,
					options.edges,
					nodeSize
				)
			: [];

	const initialLayout = createInitialOrbitLayout(
		sortedItems,
		sizes,
		parentCenter,
		nodeRadius,
		blockedAngles
	);

	if (!itemsLayoutOverlaps(sortedItems, initialLayout, sizes)) {
		return initialLayout;
	}

	return separateSiblingItemLayout(parentPosition, nodeSize, sortedItems, initialLayout, sizes, {
		maxIterations: 32
	});
}

export function normalizeSiblingItemLayout(
	parentPosition: NodePosition,
	nodeSize: number,
	items: StoryItem[],
	_layout: PartItemLayout,
	sizes: Record<string, ItemSize> = {},
	options: ItemLayoutOptions = {}
): PartItemLayout {
	return layoutSiblingItemsWithoutOverlap(parentPosition, nodeSize, items, sizes, options);
}

export function spreadItemsAroundParent(
	parentPosition: NodePosition,
	nodeSize: number,
	items: StoryItem[],
	sizes: Record<string, ItemSize> = {},
	options: ItemLayoutOptions = {}
): PartItemLayout {
	return layoutSiblingItemsWithoutOverlap(parentPosition, nodeSize, items, sizes, options);
}

export function estimatedAttachableSizes(
	attachables: StoryItem[],
	allItems: StoryItem[],
	nodes: StoryNode[] = []
): Record<string, ItemSize> {
	const nodesById = new Map(nodes.map((node) => [node.node_id, node]));

	return Object.fromEntries(
		attachables.map((item) => {
			if (isNodeSummaryId(item.item_id)) {
				const node = nodesById.get(item.parent_node_id);
				return [item.item_id, estimateNodeSummarySize(node?.summary ?? '')];
			}

			if (isRewardGroupId(item.item_id)) {
				const rewards = allItems.filter(
					(candidate) =>
						candidate.parent_node_id === item.parent_node_id && isStoryItemReward(candidate)
				);
				return [item.item_id, estimateRewardGroupSize(rewards)];
			}

			return [item.item_id, storyItemSize(item)];
		})
	);
}

function filterStackedSavedItemLayout(
	saved: PartItemLayout | null,
	attachables: StoryItem[]
): PartItemLayout | null {
	if (!saved) return null;

	const attachableIds = new Set(attachables.map((item) => item.item_id));
	const filtered = Object.fromEntries(
		Object.entries(saved).filter(([itemId]) => attachableIds.has(itemId))
	);

	return Object.keys(filtered).length > 0 ? filtered : null;
}

export const ITEM_CONNECTOR_MIN_LENGTH = 72;
export const ITEM_CONNECTOR_MAX_LENGTH = 100;
export const ITEM_CONNECTOR_STRETCH_GIVE = 32;

export function loadPartStoryNodes(partId: string): StoryNode[] | null {
	assertStoryReady();
	return getCachedPartStory(partId)?.nodes ?? null;
}

export async function savePartStoryNodes(partId: string, nodes: StoryNode[]): Promise<void> {
	assertStoryReady();
	updateCachedPartStoryNodes(partId, nodes);
	await persistPartStoryNodes(partId, nodes);
}

export async function activateStoryNode(partId: string, nodeId: string): Promise<string> {
	assertStoryReady();
	const activatedAt = await activateStoryNodeInDb(partId, nodeId);
	activateCachedStoryNode(partId, nodeId, activatedAt);
	return activatedAt;
}

export async function toggleStoryNodeCompleted(
	partId: string,
	nodeId: string
): Promise<string | null> {
	assertStoryReady();
	const completedAt = await toggleStoryNodeCompletedInDb(partId, nodeId);
	toggleCachedStoryNodeCompleted(partId, nodeId, completedAt);
	return completedAt;
}

export function normalizeStoryNodeKind(kind: string): StoryNodeKind {
	return kind === 'encounter' ? 'encounter' : 'exploration';
}

export function normalizeStoryNode(node: StoryNode): StoryNode {
	const normalized: StoryNode = {
		...node,
		kind: normalizeStoryNodeKind(node.kind),
		parent_node_ids: [...(node.parent_node_ids ?? [])],
		activated_at: node.activated_at ?? null,
		completed_at: node.completed_at ?? null
	};

	if (normalized.kind === 'encounter') {
		normalized.difficulty = normalized.difficulty ?? null;
	} else {
		delete normalized.difficulty;
	}

	return normalized;
}

export function getInitialStoryNodes(partId: string): StoryNode[] {
	const saved = loadPartStoryNodes(partId);
	if (!saved?.length) return [];

	return saved.map(normalizeStoryNode);
}

export function buildStoryEdges(nodes: StoryNode[]): StoryEdge[] {
	return nodes.flatMap((node) =>
		(node.parent_node_ids ?? []).map((fromId) => ({
			id: `${fromId}->${node.node_id}`,
			fromId,
			toId: node.node_id
		}))
	);
}

export function loadPartNodeLayout(partId: string): PartNodeLayout | null {
	assertStoryReady();
	return getCachedPartStory(partId)?.nodeLayout ?? null;
}

export function loadPartStoryItems(partId: string): StoryItem[] | null {
	assertStoryReady();
	return getCachedPartStory(partId)?.items ?? null;
}

export async function savePartStory(
	partId: string,
	snapshot: {
		nodes?: StoryNode[];
		items?: StoryItem[];
		nodeLayout?: PartNodeLayout | null;
		itemLayout?: PartItemLayout | null;
	}
): Promise<void> {
	assertStoryReady();

	if (snapshot.nodes) {
		updateCachedPartStoryNodes(partId, snapshot.nodes);
	}

	if (snapshot.items) {
		updateCachedPartStoryItems(partId, snapshot.items);
	}

	if (snapshot.nodeLayout) {
		updateCachedPartNodeLayout(partId, snapshot.nodeLayout);
	}

	if (snapshot.itemLayout) {
		updateCachedPartItemLayout(partId, snapshot.itemLayout);
	}

	await persistPartStory({
		partId,
		nodes: snapshot.nodes,
		items: snapshot.items,
		nodeLayout: snapshot.nodeLayout ?? undefined,
		itemLayout: snapshot.itemLayout ?? undefined
	});
}

export async function savePartNodeLayout(partId: string, layout: PartNodeLayout): Promise<void> {
	assertStoryReady();
	updateCachedPartNodeLayout(partId, layout);
	await persistPartNodeLayout(partId, layout);
}

export function loadPartItemLayout(partId: string): PartItemLayout | null {
	assertStoryReady();
	return getCachedPartStory(partId)?.itemLayout ?? null;
}

export async function savePartItemLayout(partId: string, layout: PartItemLayout): Promise<void> {
	assertStoryReady();
	updateCachedPartItemLayout(partId, layout);
	await persistPartItemLayout(partId, layout);
}

export const STORY_NODE_LAYOUT_TOP_OFFSET = 24;
export const STORY_NODE_VERTICAL_GAP_MULTIPLIER = 3.5;

export function getPartStoryCanvasWidth(): number {
	if (typeof window === 'undefined') return 0;

	return window.innerWidth;
}

function storyNodeVerticalGap(nodeSize: number): number {
	return nodeSize * STORY_NODE_VERTICAL_GAP_MULTIPLIER;
}

export function fitNodeLayoutToCanvas(
	layout: PartNodeLayout,
	canvasWidth: number,
	nodeSize: number
): PartNodeLayout {
	if (canvasWidth <= 0) return layout;

	const centeredX = Math.max(0, centerX(canvasWidth, nodeSize));
	const maxX = Math.max(0, canvasWidth - nodeSize);

	return Object.fromEntries(
		Object.entries(layout).map(([nodeId, position]) => {
			const x = position.x < 0 || position.x > maxX ? centeredX : position.x;
			return [nodeId, { ...position, x }];
		})
	);
}

export function minCanvasHeightForLayout(
	layout: PartNodeLayout,
	nodeSize: number,
	itemLayout: PartItemLayout = {},
	itemHeights: Record<string, number> = {}
): number {
	const bottomPadding = 48;
	const positions = Object.values(layout);
	let maxBottom = positions.length
		? Math.max(...positions.map((position) => position.y + nodeSize + bottomPadding))
		: STORY_NODE_LAYOUT_TOP_OFFSET + nodeSize + bottomPadding;

	for (const [itemId, position] of Object.entries(itemLayout)) {
		const itemHeight = itemHeights[itemId] ?? 0;
		if (itemHeight <= 0) continue;
		maxBottom = Math.max(maxBottom, position.y + itemHeight + bottomPadding);
	}

	return Math.max(maxBottom, STORY_NODE_LAYOUT_TOP_OFFSET + nodeSize + bottomPadding);
}

export function createDefaultNodeLayout(
	nodeIds: string[],
	canvasWidth: number,
	_canvasHeight: number,
	nodeSize: number
): PartNodeLayout {
	const centerX = canvasWidth / 2 - nodeSize / 2;
	const gap = storyNodeVerticalGap(nodeSize);

	return nodeIds.reduce<PartNodeLayout>((layout, nodeId, index) => {
		layout[nodeId] = {
			x: centerX,
			y: STORY_NODE_LAYOUT_TOP_OFFSET + index * gap
		};
		return layout;
	}, {});
}

export function defaultPositionForNewNode(
	existingLayout: PartNodeLayout,
	canvasWidth: number,
	_canvasHeight: number,
	nodeSize: number
): NodePosition {
	const centerX = canvasWidth / 2 - nodeSize / 2;
	const gap = storyNodeVerticalGap(nodeSize);
	const lowestY = Object.values(existingLayout).reduce(
		(max, position) => Math.max(max, position.y),
		STORY_NODE_LAYOUT_TOP_OFFSET - gap
	);

	return {
		x: centerX,
		y: lowestY + gap
	};
}

export function resolvePartNodeLayout(
	partId: string,
	nodeIds: string[],
	canvasWidth: number,
	canvasHeight: number,
	nodeSize: number
): PartNodeLayout {
	const saved = loadPartNodeLayout(partId);
	const defaults = createDefaultNodeLayout(nodeIds, canvasWidth, canvasHeight, nodeSize);

	const layout = nodeIds.reduce<PartNodeLayout>((nextLayout, nodeId) => {
		nextLayout[nodeId] = saved?.[nodeId] ??
			defaults[nodeId] ?? {
				x: Math.max(0, centerX(canvasWidth, nodeSize)),
				y: STORY_NODE_LAYOUT_TOP_OFFSET
			};
		return nextLayout;
	}, {});

	return fitNodeLayoutToCanvas(layout, canvasWidth, nodeSize);
}

function layoutParentAttachables(
	parentNodeId: string,
	parentPosition: NodePosition,
	nodeSize: number,
	parentItems: StoryItem[],
	saved: PartItemLayout | null,
	allItems: StoryItem[],
	nodeLayout: PartNodeLayout,
	edges: StoryEdge[],
	nodes: StoryNode[] = []
): PartItemLayout {
	const sizes = estimatedAttachableSizes(parentItems, allItems, nodes);
	const savedLayout: PartItemLayout = {};
	const layoutOptions: ItemLayoutOptions = { parentNodeId, nodeLayout, edges };

	for (const item of parentItems) {
		const position = saved?.[item.item_id];
		if (position) {
			savedLayout[item.item_id] = position;
		}
	}

	const unsavedItems = parentItems.filter((item) => !savedLayout[item.item_id]);

	if (unsavedItems.length === 0) {
		return savedLayout;
	}

	if (unsavedItems.length === parentItems.length) {
		return layoutSiblingItemsWithoutOverlap(
			parentPosition,
			nodeSize,
			parentItems,
			sizes,
			layoutOptions
		);
	}

	const layout = { ...savedLayout };
	const spreadHint = layoutSiblingItemsWithoutOverlap(
		parentPosition,
		nodeSize,
		parentItems,
		sizes,
		layoutOptions
	);

	for (const item of unsavedItems) {
		layout[item.item_id] = spreadHint[item.item_id] ?? { x: 0, y: 0 };
	}

	return separateSiblingItemLayout(parentPosition, nodeSize, parentItems, layout, sizes, {
		pinnedItemIds: new Set(Object.keys(savedLayout)),
		maxIterations: 48
	});
}

export function resolvePartItemLayout(
	partId: string,
	items: StoryItem[],
	nodeLayout: PartNodeLayout,
	nodeSize: number,
	liveNodeLayout?: PartNodeLayout,
	edges: StoryEdge[] = [],
	nodes: StoryNode[] = []
): PartItemLayout {
	const attachables = partCanvasAttachables(nodes, items);
	const saved = filterStackedSavedItemLayout(loadPartItemLayout(partId), attachables);
	const resolvedNodeLayout = liveNodeLayout ?? nodeLayout;
	const itemsByParent = attachables.reduce<Record<string, StoryItem[]>>((groups, item) => {
		const group = groups[item.parent_node_id] ?? [];
		group.push(item);
		groups[item.parent_node_id] = group;
		return groups;
	}, {});

	const layoutByParent = Object.entries(itemsByParent).reduce<PartItemLayout>(
		(layout, [parentNodeId, parentItems]) => {
			const parentPosition = resolvedNodeLayout[parentNodeId];
			if (!parentPosition || !parentItems.length) return layout;

			return {
				...layout,
				...layoutParentAttachables(
					parentNodeId,
					parentPosition,
					nodeSize,
					parentItems,
					saved,
					items,
					resolvedNodeLayout,
					edges,
					nodes
				)
			};
		},
		{}
	);

	return attachables.reduce<PartItemLayout>((layout, item) => {
		layout[item.item_id] = layoutByParent[item.item_id] ?? saved?.[item.item_id] ?? { x: 0, y: 0 };

		return layout;
	}, {});
}

function centerX(canvasWidth: number, nodeSize: number): number {
	return canvasWidth / 2 - nodeSize / 2;
}

export function canvasDimensions() {
	const canvasWidth = getPartStoryCanvasWidth();
	const canvasHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

	return { canvasWidth, canvasHeight: canvasHeight || 1 };
}

export function createStoryNode(
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

export function createChainedStoryNodes(
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

export function nodeIdsWithRewardXp(nodes: StoryNode[], items: StoryItem[]): string[] {
	return nodes
		.filter((node) => {
			const rewards = items.filter(
				(item) => item.is_reward && item.parent_node_id === node.node_id
			);
			return rewardXpFromItems(rewards) > 0;
		})
		.map((node) => node.node_id);
}

export async function refreshXpAwardedNodeIds(
	nodes: StoryNode[],
	items: StoryItem[]
): Promise<Set<string>> {
	const nodeIds = nodeIdsWithRewardXp(nodes, items);

	if (nodeIds.length === 0) {
		return new Set();
	}

	const awarded = await getEncounterResolutionEventIdsInDb(nodeIds);
	return new Set(awarded);
}

export async function appendNodesToPart(
	partId: string,
	existingNodes: StoryNode[],
	newNodes: StoryNode[]
): Promise<StoryNode[]> {
	if (newNodes.length === 0) return existingNodes;

	const existingLayout = loadPartNodeLayout(partId) ?? {};
	const { canvasWidth, canvasHeight } = canvasDimensions();
	const nextLayout = { ...existingLayout };

	for (const node of newNodes) {
		nextLayout[node.node_id] = defaultPositionForNewNode(
			nextLayout,
			canvasWidth,
			canvasHeight,
			STORY_NODE_SIZE
		);
	}

	const nextNodes = [...existingNodes, ...newNodes];
	await savePartStory(partId, { nodes: nextNodes, nodeLayout: nextLayout });
	return nextNodes;
}

export async function persistPartStoryItems(
	partId: string,
	storyNodes: StoryNode[],
	storyItems: StoryItem[],
	items: StoryItem[]
): Promise<StoryItem[]> {
	const attachableIds = new Set(partCanvasAttachables(storyNodes, items).map((item) => item.item_id));
	const previousAttachableIds = partCanvasAttachables(storyNodes, storyItems)
		.map((item) => item.item_id)
		.sort()
		.join(',');
	const nextAttachableIds = [...attachableIds].sort().join(',');
	const attachablesChanged = previousAttachableIds !== nextAttachableIds;

	const itemLayout = loadPartItemLayout(partId) ?? {};
	const nextItemLayout = Object.fromEntries(
		Object.entries(itemLayout).filter(([itemId]) => attachableIds.has(itemId))
	);
	const nodeLayout = loadPartNodeLayout(partId) ?? {};
	const resolvedLayout = resolvePartItemLayout(
		partId,
		items,
		nodeLayout,
		STORY_NODE_SIZE,
		undefined,
		buildStoryEdges(storyNodes),
		storyNodes
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

	await savePartStory(partId, { items, itemLayout: nextItemLayout });
	return items;
}

export async function replacePartStoryNodes(
	partId: string,
	nodes: StoryNode[],
	storyItems: StoryItem[]
): Promise<{ nodes: StoryNode[]; items: StoryItem[] }> {
	const normalized = nodes.map(normalizeStoryNode);
	const nodeIds = new Set(normalized.map((node) => node.node_id));
	const existingLayout = loadPartNodeLayout(partId) ?? {};
	const nextLayout: PartNodeLayout = Object.fromEntries(
		Object.entries(existingLayout).filter(([nodeId]) => nodeIds.has(nodeId))
	);
	const nextItems = storyItems.filter((item) => nodeIds.has(item.parent_node_id));

	await savePartStory(partId, {
		nodes: normalized,
		nodeLayout: nextLayout
	});

	const items = await persistPartStoryItems(partId, normalized, storyItems, nextItems);
	return { nodes: normalized, items };
}
