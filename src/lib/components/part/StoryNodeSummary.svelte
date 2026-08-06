<script lang="ts">
	import { getStoryNodeCanvasContext } from '$lib/components/part/part-story-canvas';
	import { nodeSummaryId } from '$lib/domain/story-node-summary';
	import type { StoryNode } from '$lib/types/schema';

	type Props = {
		node: StoryNode;
		dimmed?: boolean;
	};

	let { node, dimmed = false }: Props = $props();

	const canvas = getStoryNodeCanvasContext();
	let element = $state<HTMLDivElement | undefined>();
	let summaryTextEl = $state<HTMLParagraphElement | undefined>();
	let expanded = $state(false);
	let overflows = $state(false);

	const summaryText = $derived(node.summary.trim());

	function toggleExpanded(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
		canvas.requestConnectorSync();
	}

	function measureOverflow() {
		if (!summaryTextEl || expanded || !summaryText) {
			overflows = false;
			return;
		}

		overflows = summaryTextEl.scrollHeight - summaryTextEl.clientHeight > 1;
	}

	$effect(() => {
		void summaryText;
		void expanded;
		queueMicrotask(measureOverflow);
	});

	$effect(() => {
		if (!element) return;

		canvas.registerItem(nodeSummaryId(node.node_id), element);
		return () => {
			canvas.unregisterItem(nodeSummaryId(node.node_id));
		};
	});
</script>

<div
	bind:this={element}
	class="story-node-summary"
	data-story-draggable
	data-kind={node.kind}
	data-dimmed={dimmed ? 'true' : undefined}
>
	<p bind:this={summaryTextEl} class="summary-text" class:is-clamped={!expanded}>
		{summaryText}
	</p>
	{#if overflows || expanded}
		<button type="button" class="summary-toggle" onclick={toggleExpanded}>
			{expanded ? 'See less' : 'See more'}
		</button>
	{/if}
</div>

<style>
	.story-node-summary {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		width: min(16rem, calc(100vw - 2rem));
		padding: 0.55rem 0.7rem;
		border: 2px solid var(--color-accent);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: 0 4px 16px var(--color-shadow);
		touch-action: none;
		cursor: grab;
	}

	.story-node-summary:active {
		cursor: grabbing;
	}

	.story-node-summary[data-kind='exploration'] {
		border-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-border-strong));
	}

	.story-node-summary[data-dimmed='true'] {
		background: #3a2e23;
		border-color: #6b5340;
		box-shadow: 0 4px 12px color-mix(in srgb, #2c2416 20%, transparent);
	}

	.summary-text {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--color-text);
		white-space: pre-wrap;
	}

	.summary-text.is-clamped {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}

	.story-node-summary[data-dimmed='true'] .summary-text {
		color: #bda992;
	}

	.summary-toggle {
		margin-top: 0.35rem;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-accent);
		cursor: pointer;
	}

	.summary-toggle:hover {
		text-decoration: underline;
	}

	.story-node-summary[data-dimmed='true'] .summary-toggle {
		color: #c9b59a;
	}
</style>
