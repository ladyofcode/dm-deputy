<script lang="ts">
	import { getContext } from 'svelte';
	import { formatStoryItemCatalogStats } from '$lib/domain/story-item-catalog';
	import { rewardGroupId } from '$lib/domain/story-item-reward';
	import RewardIcon from '$lib/components/icons/RewardIcon.svelte';
	import TreasureIcon from '$lib/components/icons/TreasureIcon.svelte';
	import { STORY_ITEM_KIND_LABELS, type StoryItem } from '$lib/types/schema';
	import type { StoryNodeCanvasContext } from '$lib/components/part/StoryNode.svelte';

	type Props = {
		parentNodeId: string;
		items: StoryItem[];
		dimmed?: boolean;
		xpAwarded?: boolean;
		onAssignRewardXp?: (nodeId: string) => void;
	};

	let {
		parentNodeId,
		items,
		dimmed = false,
		xpAwarded = false,
		onAssignRewardXp
	}: Props = $props();

	const canvas = getContext<StoryNodeCanvasContext>('story-node-canvas');
	let element = $state<HTMLDivElement | undefined>();

	function handleAssignXp(event: MouseEvent) {
		event.stopPropagation();
		onAssignRewardXp?.(parentNodeId);
	}

	$effect(() => {
		if (!element) return;

		canvas.registerItem(rewardGroupId(parentNodeId), element);
		return () => {
			canvas.unregisterItem(rewardGroupId(parentNodeId));
		};
	});
</script>

<div bind:this={element} class="reward-group" data-dimmed={dimmed ? 'true' : undefined}>
	<div class="reward-group-header">
		<RewardIcon size={15} />
		<span>Reward</span>
	</div>

	<ul class="reward-group-items">
		{#each items as item (item.item_id)}
			<li>
				<div class="reward-line">
					<div class="reward-kind-row">
						<span class="reward-kind">{STORY_ITEM_KIND_LABELS[item.kind]}</span>
						{#if item.kind === 'xp' && (item.xp_amount ?? 0) > 0 && onAssignRewardXp}
							<button
								type="button"
								class="assign-xp-link"
								disabled={xpAwarded}
								onclick={handleAssignXp}
							>
								{xpAwarded ? 'Assigned' : 'Assign'}
							</button>
						{/if}
					</div>
					{#if item.is_treasure}
						<span class="treasure-badge" aria-label="Treasure">
							<TreasureIcon size={14} />
						</span>
					{/if}
				</div>
				<p class="reward-label">{item.label}</p>
				{#if item.kind === 'item'}
					{@const stats = formatStoryItemCatalogStats(item)}
					{#if stats.length}
						<p class="reward-stats">{stats.join(' · ')}</p>
					{/if}
				{:else if item.kind === 'note' && item.note_text}
					<p class="reward-note">{item.note_text}</p>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.reward-group {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		display: grid;
		gap: 0.35rem;
		min-width: 11rem;
		max-width: 22rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-accent) 55%, var(--color-border-strong));
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: 0 4px 16px var(--color-shadow);
		touch-action: none;
		cursor: grab;
	}

	.reward-group:active {
		cursor: grabbing;
	}

	.reward-group[data-dimmed='true'] {
		background: #3a2e23;
		border-color: #4d3b2c;
		box-shadow: 0 4px 12px color-mix(in srgb, #2c2416 20%, transparent);
	}

	.reward-group[data-dimmed='true'] .reward-group-header,
	.reward-group[data-dimmed='true'] .reward-kind,
	.reward-group[data-dimmed='true'] .reward-label,
	.reward-group[data-dimmed='true'] .reward-stats,
	.reward-group[data-dimmed='true'] .reward-note,
	.reward-group[data-dimmed='true'] .assign-xp-link {
		color: #bda992;
	}

	.reward-group-header {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-accent);
	}

	.reward-group-header span {
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		line-height: 1;
	}

	.reward-group-items {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.55rem;
	}

	.reward-group-items li + li {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
		padding-top: 0.55rem;
	}

	.reward-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.35rem;
	}

	.reward-kind-row {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}

	.reward-kind {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.assign-xp-link {
		padding: 0;
		border: none;
		background: none;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--color-accent);
		cursor: pointer;
	}

	.assign-xp-link:hover:not(:disabled) {
		color: var(--color-accent-hover, var(--color-accent));
		text-decoration: underline;
	}

	.assign-xp-link:disabled {
		opacity: 0.65;
		cursor: default;
	}

	.treasure-badge {
		display: inline-flex;
		color: #b8860b;
		line-height: 0;
	}

	.reward-label {
		margin: 0.1rem 0 0;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.25;
	}

	.reward-stats {
		margin: 0.15rem 0 0;
		font-size: 0.8125rem;
		line-height: 1.35;
		color: var(--color-text-muted);
	}

	.reward-note {
		margin: 0.15rem 0 0;
		font-size: 0.875rem;
		line-height: 1.35;
		white-space: pre-wrap;
		color: var(--color-text-muted);
	}
</style>
