<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import { fromStore } from 'svelte/store';
	import StoryMapViewer from '$lib/components/part/StoryMapViewer.svelte';
	import { getCampaignById } from '$lib/data';
	import { getCampaignMapObjectUrl } from '$lib/data/map-blob-cache';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { getReactiveAllCampaignMaps } from '$lib/stores/campaign-maps.svelte';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import type { CampaignMap } from '$lib/types/schema';

	const dbReady = fromStore(dbIsReady);
	const maps = $derived(dbReady.current ? getReactiveAllCampaignMaps() : []);

	let thumbUrls = $state<Record<string, string>>({});
	let viewerOpen = $state(false);
	let viewerUrl = $state<string | null>(null);
	let viewerTitle = $state('');
	let viewerLoading = $state(false);

	$effect(() => {
		if (!maps.length) {
			thumbUrls = {};
			return;
		}

		let cancelled = false;

		void (async () => {
			const nextUrls: Record<string, string> = {};

			for (const map of maps) {
				const url = await getCampaignMapObjectUrl(map.map_id, 'thumb');
				if (cancelled) return;
				if (url) nextUrls[map.map_id] = url;
			}

			if (!cancelled) {
				thumbUrls = nextUrls;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function formatDimensions(width: number, height: number): string {
		if (!width || !height) return '—';
		return `${width}×${height}`;
	}

	async function openViewer(map: CampaignMap) {
		if (viewerLoading) return;

		viewerLoading = true;

		try {
			const url = await getCampaignMapObjectUrl(map.map_id, 'full');
			if (!url) return;

			viewerUrl = url;
			viewerTitle = map.name;
			viewerOpen = true;
		} finally {
			viewerLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Asset library · DM Deputy</title>
</svelte:head>

<section class="page-stack library-page">
	<nav aria-label="Back to home">
		<Button.Root href={resolve('/')}>← Home</Button.Root>
	</nav>

	<header class="library-header">
		<h1>Asset library</h1>
		<p class="hint">Map images uploaded across all campaigns.</p>
	</header>

	{#if dbReady.current}
		{#if maps.length}
			<ul class="asset-grid list-plain">
				{#each maps as map (map.map_id)}
					{@const campaign = getCampaignById(map.campaign_id)}
					<li class="asset-card">
						<button
							type="button"
							class="asset-thumb"
							aria-label={`Open map ${map.name}`}
							disabled={viewerLoading}
							onclick={() => openViewer(map)}
						>
							{#if thumbUrls[map.map_id]}
								<img src={thumbUrls[map.map_id]} alt="" loading="lazy" />
							{:else}
								<span class="asset-thumb-placeholder">Loading…</span>
							{/if}
						</button>
						<div class="asset-meta">
							<h2>{map.name}</h2>
							{#if campaign}
								<p>
									<a href={resolveCampaignHref(campaign.campaign_id)}>{campaign.campaign_name}</a>
								</p>
							{/if}
							<p class="asset-dimensions">
								{formatDimensions(map.full_width, map.full_height)}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="hint">No images yet. Upload maps from a campaign page.</p>
		{/if}
	{/if}
</section>

<StoryMapViewer
	bind:open={viewerOpen}
	title={viewerTitle}
	imageUrl={viewerUrl}
	loading={viewerLoading}
/>

<style>
	.library-header h1 {
		margin: 0;
	}

	.library-header .hint {
		margin-top: 0.5rem;
	}

	.asset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 1rem;
	}

	.asset-card {
		display: grid;
		gap: 0.5rem;
		padding: 0.65rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.asset-thumb {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-border) 40%, var(--color-surface));
		cursor: zoom-in;
	}

	.asset-thumb:disabled {
		cursor: wait;
		opacity: 0.7;
	}

	.asset-thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.asset-thumb-placeholder {
		display: grid;
		place-items: center;
		height: 100%;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.asset-meta h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.asset-meta p {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
	}

	.asset-dimensions {
		color: var(--color-text-muted);
	}
</style>
