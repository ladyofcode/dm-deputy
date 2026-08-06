<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import CampaignMapThumb from '$lib/components/shared/CampaignMapThumb.svelte';
	import { getCampaignById } from '$lib/data';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { getReactiveAllCampaignMaps } from '$lib/stores/campaign-maps.svelte';
	import { database } from '$lib/stores/database.svelte';

	const maps = $derived(database.isReady ? getReactiveAllCampaignMaps() : []);

	function formatDimensions(width: number, height: number): string {
		if (!width || !height) return '—';
		return `${width}×${height}`;
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

	{#if database.isReady}
		{#if maps.length}
			<ul class="asset-grid list-plain">
				{#each maps as map (map.map_id)}
					{@const campaign = getCampaignById(map.campaign_id)}
					<li class="asset-card">
						<CampaignMapThumb mapId={map.map_id} label={map.name} class="asset-thumb" />
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

	:global(.asset-card .asset-thumb) {
		max-width: none;
	}

	:global(.asset-card .asset-thumb .map-thumb-button) {
		aspect-ratio: 4 / 3;
	}

	:global(.asset-card .asset-thumb .map-thumb) {
		height: auto;
		min-height: 0;
		aspect-ratio: 4 / 3;
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
