<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import CampaignMapsSection from '$lib/components/campaign/CampaignMapsSection.svelte';
	import CampaignNpcsSection from '$lib/components/campaign/CampaignNpcsSection.svelte';
	import CampaignPcsSection from '$lib/components/campaign/CampaignPcsSection.svelte';
	import CampaignSettingsModal from '$lib/components/campaign/CampaignSettingsModal.svelte';
	import { fromStore } from 'svelte/store';
	import { getAdventuresForCampaign } from '$lib/data';
	import { getReactiveCampaignById } from '$lib/stores/campaign-list.svelte';
	import { dbIsReady } from '$lib/stores/database.svelte';

	const dbReady = fromStore(dbIsReady);

	const campaignId = $derived(page.params.campaignId ?? '');
	const campaign = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getReactiveCampaignById(campaignId);
	});
	const adventures = $derived.by(() => {
		if (!dbReady.current) return [];
		return getAdventuresForCampaign(campaignId);
	});
</script>

<svelte:head>
	<title>{campaign?.campaign_name ?? 'Campaign'} · DM Deputy</title>
</svelte:head>

{#if dbReady.current && !campaign}
	<section class="page-stack">
		<h1>Campaign not found</h1>
		<Button.Root href={resolve('/')}>Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack">
		<nav aria-label="Back to home">
			<Button.Root href={resolve('/')}>←</Button.Root>
		</nav>

		<header class="campaign-page-header">
			<div class="campaign-page-header-row">
				<h1>{campaign?.campaign_name ?? ''}</h1>
				{#if campaign}
					<CampaignSettingsModal
						campaignId={campaign.campaign_id}
						campaignName={campaign.campaign_name}
						description={campaign.description ?? ''}
					/>
				{/if}
			</div>
			{#if campaign?.description}
				<p class="campaign-description">{campaign.description}</p>
			{/if}
		</header>

		<section class="adventures-section" aria-labelledby="campaign-adventures-heading">
			<div class="adventures-section-header">
				<h2 id="campaign-adventures-heading">Adventures</h2>
				<Button.Root href={resolve(`/onboarding/adventure/${campaignId}`)} data-variant="ghost">
					Create adventure
				</Button.Root>
			</div>

			{#if adventures.length === 0}
				<p class="hint">No adventures yet.</p>
			{:else}
				<ul class="adventure-list list-plain">
					{#each adventures as adventure (adventure.adventure_id)}
						<li>
							<a
								class="adventure-link"
								href={resolve(`/campaigns/${campaignId}/adventures/${adventure.adventure_id}`)}
							>
								{adventure.name}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if campaign}
			<CampaignMapsSection campaignId={campaign.campaign_id} />
			<CampaignPcsSection campaignId={campaign.campaign_id} />
			<CampaignNpcsSection campaignId={campaign.campaign_id} />
		{/if}
	</section>
{/if}

<style>
	.campaign-page-header h1 {
		margin: 0;
	}

	.campaign-page-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.campaign-page-header-row h1 {
		min-width: 0;
	}

	.campaign-description {
		margin: 0.75rem 0 0;
		max-width: 42rem;
		line-height: 1.5;
	}

	.adventures-section {
		display: grid;
		gap: 0.75rem;
	}

	.adventures-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.adventures-section-header h2 {
		margin: 0;
	}

	.adventure-list {
		display: grid;
		gap: 0.5rem;
	}

	.adventure-link {
		display: block;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-decoration: none;
		color: inherit;
		font-weight: 600;
		box-shadow: 0 1px 2px var(--color-shadow);
	}

	.adventure-link:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>
