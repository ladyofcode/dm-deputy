<script lang="ts">
	import { getContext } from 'svelte';
	import type { StoryItem } from '$lib/types/schema';
	import type { StoryNodeCanvasContext } from '$lib/components/part/StoryNode.svelte';

	type Props = {
		item: StoryItem;
	};

	let { item }: Props = $props();

	const canvas = getContext<StoryNodeCanvasContext>('story-node-canvas');
	let element = $state<HTMLDivElement | undefined>();

	$effect(() => {
		if (!element) return;

		canvas.registerItem(element);
		return () => {
			canvas.unregisterItem();
		};
	});
</script>

<div bind:this={element}>
	<p>{item.label}</p>
</div>

<style>
	div {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		padding: var(--space-section);
		border: 1px solid color-mix(in srgb, var(--color-accent) 70%, var(--color-border-strong));
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: 0 4px 16px var(--color-shadow);
		touch-action: none;
		cursor: grab;
	}

	div:active {
		cursor: grabbing;
	}

	p {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 600;
		white-space: nowrap;
	}
</style>
