<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import MediaThumb from '$lib/components/shared/MediaThumb.svelte';
	import { getCampaignListForUser } from '$lib/data';
	import { getCampaignDisplayName } from '$lib/domain/display-names';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { getReactiveAllCampaignMaps } from '$lib/stores/campaign-maps.svelte';
	import { database } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { formatMediaDimensions } from '$lib/domain/media-library';
	import type { CampaignMap } from '$lib/types/schema';
	import { SvelteMap } from 'svelte/reactivity';

	const maps = $derived(database.isReady ? getReactiveAllCampaignMaps() : []);

	const campaignSections = $derived.by(() => {
		if (!database.isReady) return [];

		const mapsByCampaign = new SvelteMap<string, CampaignMap[]>();

		for (const map of maps) {
			const existing = mapsByCampaign.get(map.campaign_id) ?? [];
			existing.push(map);
			mapsByCampaign.set(map.campaign_id, existing);
		}

		const campaigns = getCampaignListForUser(workspace.currentUserId).filter((entry) =>
			mapsByCampaign.has(entry.campaign.campaign_id)
		);

		return campaigns
			.map((entry) => ({
				campaign: entry.campaign,
				maps: (mapsByCampaign.get(entry.campaign.campaign_id) ?? []).sort((left, right) =>
					left.name.localeCompare(right.name)
				)
			}))
			.sort((left, right) =>
				getCampaignDisplayName(left.campaign).localeCompare(getCampaignDisplayName(right.campaign))
			);
	});
</script>

<svelte:head>
	<title>Asset library · DM Deputy</title>
</svelte:head>

<header class="library-header">
	<h1>Asset library</h1>
	<p class="library-intro">Campaign maps and other playable pieces, grouped by campaign.</p>
</header>

{#if database.isReady}
	{#if campaignSections.length}
		<div class="campaign-sections">
			{#each campaignSections as section (section.campaign.campaign_id)}
				<section class="campaign-section" aria-labelledby="campaign-{section.campaign.campaign_id}">
					<h2 id="campaign-{section.campaign.campaign_id}" class="campaign-heading">
						<a href={resolveCampaignHref(section.campaign.campaign_id)}>
							{getCampaignDisplayName(section.campaign)}
						</a>
					</h2>
					<ul class="asset-grid list-plain">
						{#each section.maps as map (map.map_id)}
							<li class="asset-card">
								<MediaThumb variant="map" mapId={map.map_id} label={map.name} class="asset-thumb" />
								<div class="asset-meta">
									<h3>{map.name}</h3>
									<p class="asset-dimensions">
										{formatMediaDimensions(map.full_width, map.full_height) ?? '—'}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{:else}
		<EmptyState message="No maps yet. Upload maps from a campaign page." />
	{/if}
{/if}

<style>
	.library-header h1 {
		margin: 0;
	}

	.library-intro {
		margin: 0.35rem 0 0;
		color: var(--color-text-muted);
		max-width: 42rem;
	}

	.campaign-sections {
		display: grid;
		gap: 2rem;
	}

	.campaign-heading {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.campaign-heading a {
		color: inherit;
		text-decoration: none;
	}

	.campaign-heading a:hover,
	.campaign-heading a:focus-visible {
		color: var(--color-accent);
		outline: none;
		text-decoration: underline;
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

	:global(.asset-card .asset-thumb .media-thumb-button) {
		aspect-ratio: 4 / 3;
	}

	:global(.asset-card .asset-thumb .media-thumb-image) {
		height: auto;
		min-height: 0;
		aspect-ratio: 4 / 3;
	}

	.asset-meta h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.asset-dimensions {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
