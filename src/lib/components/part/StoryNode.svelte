<script lang="ts" module>
	export const STORY_NODE_SIZE = 132;

	export type StoryNodeCanvasContext = {
		registerElement: (nodeId: string, element: HTMLButtonElement) => void;
		unregisterElement: (nodeId: string) => void;
	};
</script>

<script lang="ts">
	import { getContext } from 'svelte';
	import type { StoryNode } from '$lib/types/schema';

	type Props = {
		node: StoryNode;
	};

	let { node }: Props = $props();

	const canvas = getContext<{
		registerElement: (nodeId: string, element: HTMLButtonElement) => void;
		unregisterElement: (nodeId: string) => void;
	}>('story-node-canvas');
	let element = $state<HTMLButtonElement | undefined>();

	$effect(() => {
		if (!element) return;

		canvas.registerElement(node.node_id, element);
		return () => {
			canvas.unregisterElement(node.node_id);
		};
	});
</script>

<button
	type="button"
	bind:this={element}
	data-kind={node.kind}
	aria-label={`${node.kind}: ${node.title}`}
>
	<span>{node.kind}</span>
	<strong>{node.title}</strong>
</button>

<style>
	button {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		display: grid;
		place-content: center;
		gap: var(--space-field);
		width: var(--story-node-size, 132px);
		height: var(--story-node-size, 132px);
		padding: var(--space-section);
		border: 2px solid var(--color-border-strong);
		border-radius: 50%;
		background: var(--color-surface);
		box-shadow: 0 8px 24px var(--color-shadow);
		text-align: center;
		touch-action: none;
		cursor: grab;
	}

	button:active {
		cursor: grabbing;
	}

	button[data-kind='encounter'] {
		border-color: var(--color-accent);
	}

	button[data-kind='event'] {
		border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong));
	}

	span {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	strong {
		font-family: var(--font-heading);
		font-size: 0.78rem;
		font-weight: 600;
		line-height: 1.2;
	}
</style>
