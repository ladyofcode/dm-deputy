<script lang="ts" module>
	export const STORY_NODE_SIZE = 168;

	export type StoryNodeCanvasContext = {
		registerElement: (nodeId: string, element: HTMLDivElement) => void;
		unregisterElement: (nodeId: string) => void;
		registerItem: (itemId: string, element: HTMLDivElement) => void;
		unregisterItem: (itemId: string) => void;
		updateStoryItem: (item: import('$lib/types/schema').StoryItem) => void;
		requestConnectorSync: () => void;
	};
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import { STORY_NODE_KIND_LABELS, type StoryNode } from '$lib/types/schema';

	type Props = {
		node: StoryNode;
		hasArms?: boolean;
		onActivate?: (nodeId: string) => void;
		onManageArms?: (nodeId: string) => void;
		onToggleComplete?: (nodeId: string) => void;
	};

	let {
		node,
		hasArms = false,
		onActivate,
		onManageArms,
		onToggleComplete
	}: Props = $props();

	const canvas = getContext<{
		registerElement: (nodeId: string, element: HTMLDivElement) => void;
		unregisterElement: (nodeId: string) => void;
	}>('story-node-canvas');
	let element = $state<HTMLDivElement | undefined>();
	let pointerStart = $state<{ x: number; y: number } | null>(null);

	const isCompleted = $derived(Boolean(node.completed_at));

	function handleManageArms(event: MouseEvent) {
		event.stopPropagation();
		onManageArms?.(node.node_id);
	}

	function handleToggleComplete(event: MouseEvent) {
		event.stopPropagation();
		onToggleComplete?.(node.node_id);
	}

	function handlePointerDown(event: PointerEvent) {
		pointerStart = { x: event.clientX, y: event.clientY };
	}

	function handlePointerUp(event: PointerEvent) {
		if (!pointerStart || !onActivate) {
			pointerStart = null;
			return;
		}

		const dx = event.clientX - pointerStart.x;
		const dy = event.clientY - pointerStart.y;
		pointerStart = null;

		if (dx * dx + dy * dy < 100) {
			onActivate(node.node_id);
		}
	}

	$effect(() => {
		if (!element) return;

		canvas.registerElement(node.node_id, element);
		return () => {
			canvas.unregisterElement(node.node_id);
		};
	});
</script>

<div
	bind:this={element}
	role="button"
	tabindex="0"
	data-kind={node.kind}
	data-activated={node.activated_at ? 'true' : undefined}
	data-completed={isCompleted ? 'true' : undefined}
	aria-label={`${STORY_NODE_KIND_LABELS[node.kind]}: ${node.title}${isCompleted ? ' (completed)' : ''}`}
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
>
	<span>{STORY_NODE_KIND_LABELS[node.kind]}</span>
	<strong>{node.title}</strong>
	{#if onToggleComplete}
		<button
			type="button"
			class="complete-button"
			class:is-completed={isCompleted}
			aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
			aria-pressed={isCompleted}
			onclick={handleToggleComplete}
		>
			✓
		</button>
	{/if}
	{#if onManageArms}
		<button
			type="button"
			class="arm-button"
			aria-label={hasArms ? 'Edit items' : 'Add item'}
			onclick={handleManageArms}
		>
			{hasArms ? '✎' : '+'}
		</button>
	{/if}
</div>

<style>
	div {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		display: grid;
		place-content: center;
		gap: 0.35rem;
		width: var(--story-node-size, 168px);
		height: var(--story-node-size, 168px);
		padding: 1.35rem 1.15rem;
		border: 2px solid var(--color-border-strong);
		border-radius: 50%;
		background: var(--color-surface);
		box-shadow: 0 8px 24px var(--color-shadow);
		text-align: center;
		touch-action: none;
		cursor: grab;
	}

	div:active {
		cursor: grabbing;
	}

	div[data-kind='encounter'] {
		border-color: var(--color-accent);
	}

	div[data-kind='exploration'] {
		border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong));
	}

	div[data-activated='true'] {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 35%, transparent);
	}

	div[data-completed='true'] {
		background: #3a2e23;
		border-color: #4d3b2c;
		box-shadow: 0 6px 18px color-mix(in srgb, #2c2416 22%, transparent);
	}

	div[data-completed='true'] span,
	div[data-completed='true'] strong {
		color: #bda992;
	}

	span {
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	strong {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.15;
	}

	.complete-button,
	.arm-button {
		position: absolute;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 2px 8px var(--color-shadow);
	}

	.complete-button {
		left: 0.65rem;
		bottom: 0.65rem;
	}

	.arm-button {
		right: 0.65rem;
		bottom: 0.65rem;
		font-size: 1rem;
	}

	.complete-button:hover,
	.arm-button:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.complete-button.is-completed {
		color: #c9b59a;
		border-color: #5c4838;
		background: #4a382b;
	}
</style>
