<script lang="ts">
	import { getContext } from 'svelte';
	import StoryMapViewer from '$lib/components/part/StoryMapViewer.svelte';
	import { getCampaignMapObjectUrl } from '$lib/data/map-blob-cache';
	import { getReactiveCampaignMapById } from '$lib/stores/campaign-maps.svelte';
	import { formatStoryItemCatalogStats } from '$lib/domain/story-item-catalog';
	import { STORY_ITEM_KIND_LABELS, type StoryItem } from '$lib/types/schema';
	import TreasureIcon from '$lib/components/icons/TreasureIcon.svelte';
	import type { StoryNodeCanvasContext } from '$lib/components/part/StoryNode.svelte';

	type Props = {
		item: StoryItem;
		dimmed?: boolean;
	};

	let { item, dimmed = false }: Props = $props();

	const canvas = getContext<StoryNodeCanvasContext>('story-node-canvas');
	let element = $state<HTMLDivElement | undefined>();
	let thumbUrl = $state<string | null>(null);
	let viewerOpen = $state(false);
	let viewerUrl = $state<string | null>(null);
	let viewerLoading = $state(false);

	const catalogStats = $derived(item.kind === 'item' ? formatStoryItemCatalogStats(item) : []);

	const campaignMap = $derived(
		item.kind === 'map' && item.map_id ? getReactiveCampaignMapById(item.map_id) : undefined
	);

	const displayLabel = $derived(
		item.kind === 'note'
			? item.note_text?.trim() || item.label
			: item.kind === 'map'
				? campaignMap?.name || item.label
				: item.label
	);

	$effect(() => {
		if (!element) return;

		canvas.registerItem(item.item_id, element);
		return () => {
			canvas.unregisterItem(item.item_id);
		};
	});

	$effect(() => {
		if (item.kind !== 'map' || !item.map_id) {
			thumbUrl = null;
			return;
		}

		let cancelled = false;

		void getCampaignMapObjectUrl(item.map_id, 'thumb').then((url) => {
			if (!cancelled) {
				thumbUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	async function openViewer() {
		if (item.kind !== 'map' || !item.map_id || viewerLoading) return;

		viewerLoading = true;

		try {
			const url = await getCampaignMapObjectUrl(item.map_id, 'full');
			if (!url) return;

			viewerUrl = url;
			viewerOpen = true;
		} finally {
			viewerLoading = false;
		}
	}
</script>

<div
	bind:this={element}
	data-kind={item.kind}
	data-treasure={item.is_treasure ? 'true' : undefined}
	data-has-stats={catalogStats.length ? 'true' : undefined}
	data-dimmed={dimmed ? 'true' : undefined}
>
	{#if item.kind === 'map'}
		<span class="drag-handle" data-drag-handle aria-hidden="true">⠿</span>
		<button
			type="button"
			class="map-thumb-button"
			aria-label={`Open map ${displayLabel}`}
			onclick={openViewer}
		>
			{#if thumbUrl}
				<img class="map-thumb" src={thumbUrl} alt="" />
			{:else}
				<span class="map-thumb map-thumb-missing">No preview</span>
			{/if}
		</button>
		<p class="label map-label">{displayLabel}</p>
	{:else}
		{#if item.is_treasure}
			<span class="treasure-badge" aria-label="Treasure">
				<TreasureIcon size={16} />
			</span>
		{/if}

		<span>{STORY_ITEM_KIND_LABELS[item.kind]}</span>
		<p class="label" class:note-text={item.kind === 'note'}>{displayLabel}</p>
		{#if catalogStats.length}
			<ul class="stats">
				{#each catalogStats as stat (stat)}
					<li>{stat}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<StoryMapViewer
	bind:open={viewerOpen}
	title={displayLabel}
	imageUrl={viewerUrl}
	loading={viewerLoading}
/>

<style>
	div {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		display: grid;
		gap: 0.25rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: 0 4px 16px var(--color-shadow);
		touch-action: none;
		cursor: grab;
		max-width: 14.5rem;
	}

	div[data-kind='map'] {
		padding: 0.45rem 0.55rem 0.55rem;
		width: 9.5rem;
		max-width: 9.5rem;
		cursor: default;
	}

	div[data-has-stats='true'] {
		max-width: 17rem;
	}

	div:active {
		cursor: grabbing;
	}

	div[data-kind='map']:active {
		cursor: default;
	}

	div[data-dimmed='true'] {
		background: #3a2e23;
		border-color: #4d3b2c;
		box-shadow: 0 4px 12px color-mix(in srgb, #2c2416 20%, transparent);
	}

	div[data-dimmed='true'] span,
	div[data-dimmed='true'] .label,
	div[data-dimmed='true'] .stats li {
		color: #bda992;
	}

	div[data-treasure='true'] {
		padding-top: 0.7rem;
		padding-right: 1.85rem;
		box-shadow: 0 0 0 1px color-mix(in srgb, #b8860b 35%, transparent);
	}

	.drag-handle {
		position: absolute;
		top: 0.3rem;
		right: 0.35rem;
		font-size: 0.95rem;
		line-height: 1;
		color: var(--color-text-muted);
		cursor: grab;
		user-select: none;
	}

	.map-thumb-button {
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-text-muted) 8%, transparent);
		overflow: hidden;
		cursor: zoom-in;
	}

	.map-thumb {
		display: block;
		width: 100%;
		height: 5.5rem;
		object-fit: cover;
	}

	.map-thumb-missing {
		display: grid;
		place-items: center;
		height: 5.5rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.map-label {
		font-size: 0.95rem;
	}

	.treasure-badge {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		display: inline-flex;
		color: #b8860b;
		pointer-events: none;
		line-height: 0;
	}

	span {
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.label {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		line-height: 1.25;
		white-space: pre-wrap;
	}

	.label.note-text {
		font-weight: 400;
	}

	.stats {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.15rem;
	}

	.stats li {
		font-size: 0.875rem;
		line-height: 1.3;
		color: var(--color-text-muted);
	}
</style>
