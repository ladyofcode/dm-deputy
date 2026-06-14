<script lang="ts">
	import { onMount, setContext, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { createDraggable, type Draggable } from 'animejs';
	import StoryNode, { STORY_NODE_SIZE, type StoryNodeCanvasContext } from '$lib/components/part/StoryNode.svelte';
	import {
		buildStoryEdges,
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

	const NODE_RADIUS = STORY_NODE_SIZE / 2;
	const canvasHeightRatio = $derived(Math.max(2, nodes.length + 0.5));

	let canvasEl = $state<HTMLDivElement | undefined>();
	let connectorPaths = $state<Record<string, string>>({});

	const nodeElements = new SvelteMap<string, HTMLButtonElement>();
	const draggables = new SvelteMap<string, Draggable>();

	let resizeObserver: ResizeObserver | undefined;
	let setupQueued = false;
	let mounted = false;

	const edges = $derived(buildStoryEdges(nodes));

	const canvasContext: StoryNodeCanvasContext = {
		registerElement(nodeId, element) {
			nodeElements.set(nodeId, element);
			queueDraggableSetup();
		},
		unregisterElement(nodeId) {
			nodeElements.delete(nodeId);
			teardownDraggable(nodeId);
		}
	};

	setContext('story-node-canvas', canvasContext);

	function nodeCenter(position: NodePosition) {
		return {
			x: position.x + NODE_RADIUS,
			y: position.y + NODE_RADIUS
		};
	}

	function getNodePosition(nodeId: string): NodePosition | undefined {
		const draggable = draggables.get(nodeId);
		if (!draggable) return undefined;

		return { x: draggable.x, y: draggable.y };
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

	function syncConnectors() {
		const nextPaths: Record<string, string> = {};

		for (const edge of edges) {
			const fromPosition = getNodePosition(edge.fromId);
			const toPosition = getNodePosition(edge.toId);
			if (!fromPosition || !toPosition) continue;

			nextPaths[edge.id] = buildConnectorPath(fromPosition, toPosition);
		}

		connectorPaths = nextPaths;
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

	function teardownAllDraggables() {
		for (const nodeId of draggables.keys()) {
			teardownDraggable(nodeId);
		}
	}

	function canSetupDraggables() {
		return Boolean(canvasEl && nodes.length && nodes.every((node) => nodeElements.has(node.node_id)));
	}

	function setupDraggables() {
		if (!canvasEl || !canSetupDraggables()) return;

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

		syncConnectors();
	}

	function queueDraggableSetup() {
		if (setupQueued) return;

		setupQueued = true;
		void (async () => {
			await tick();
			setupQueued = false;
			if (!mounted || !canSetupDraggables()) return;
			setupDraggables();
		})();
	}

	onMount(() => {
		mounted = true;

		resizeObserver = new ResizeObserver(() => {
			for (const draggable of draggables.values()) {
				draggable.refresh();
			}
			syncConnectors();
		});

		if (canvasEl) {
			resizeObserver.observe(canvasEl);
		}

		queueDraggableSetup();

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

		if (canSetupDraggables()) {
			setupDraggables();
		} else {
			queueDraggableSetup();
		}

		syncConnectors();
	});
</script>

<div
	bind:this={canvasEl}
	style={`--part-canvas-height: ${canvasHeightRatio * 100}dvh; --story-node-size: ${STORY_NODE_SIZE}px;`}
>
	<svg aria-hidden="true">
		{#each edges as edge (edge.id)}
			<path d={connectorPaths[edge.id] ?? ''} />
		{/each}
	</svg>

	{#each nodes as node (node.node_id)}
		<StoryNode {node} />
	{/each}
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
		stroke: var(--color-accent);
		stroke-width: 3.5;
		stroke-linecap: round;
		opacity: 0.8;
	}
</style>
