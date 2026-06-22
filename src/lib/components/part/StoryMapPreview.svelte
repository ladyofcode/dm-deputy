<script lang="ts">
	import StoryMapViewer from '$lib/components/part/StoryMapViewer.svelte';
	import { getCampaignMapObjectUrl } from '$lib/data/map-blob-cache';
	import { getReactiveCampaignMapById } from '$lib/stores/campaign-maps.svelte';

	type Props = {
		mapId: string;
		label?: string;
	};

	let { mapId, label = '' }: Props = $props();

	let thumbUrl = $state<string | null>(null);
	let viewerOpen = $state(false);
	let viewerUrl = $state<string | null>(null);
	let viewerLoading = $state(false);

	const campaignMap = $derived(getReactiveCampaignMapById(mapId));
	const displayLabel = $derived(label.trim() || campaignMap?.name || 'Map');

	$effect(() => {
		if (!mapId) {
			thumbUrl = null;
			return;
		}

		let cancelled = false;

		void getCampaignMapObjectUrl(mapId, 'thumb').then((url) => {
			if (!cancelled) {
				thumbUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	async function openViewer() {
		if (!mapId || viewerLoading) return;

		viewerLoading = true;

		try {
			const url = await getCampaignMapObjectUrl(mapId, 'full');
			if (!url) return;

			viewerUrl = url;
			viewerOpen = true;
		} finally {
			viewerLoading = false;
		}
	}
</script>

<figure class="map-preview">
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
	{#if displayLabel}
		<figcaption>{displayLabel}</figcaption>
	{/if}
</figure>

<StoryMapViewer
	bind:open={viewerOpen}
	title={displayLabel}
	imageUrl={viewerUrl}
	loading={viewerLoading}
/>

<style>
	.map-preview {
		margin: 0;
		display: grid;
		gap: 0.35rem;
		max-width: 12rem;
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

	figcaption {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		line-height: 1.35;
	}
</style>
