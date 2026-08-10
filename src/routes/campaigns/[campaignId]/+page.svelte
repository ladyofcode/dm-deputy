<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import CampaignMapsSection from '$lib/components/campaign/CampaignMapsSection.svelte';
	import CampaignNpcsSection from '$lib/components/campaign/CampaignNpcsSection.svelte';
	import CampaignPcsSection from '$lib/components/campaign/CampaignPcsSection.svelte';
	import CampaignSettingsModal from '$lib/components/campaign/CampaignSettingsModal.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { getAdventuresForCampaign } from '$lib/data';
	import { resolveSessionZeroHref } from '$lib/navigation/hrefs';
	import { getReactiveCampaignById } from '$lib/stores/campaign-list.svelte';
	import { database } from '$lib/stores/database.svelte';

	const campaignId = $derived(page.params.campaignId ?? '');
	const campaign = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getReactiveCampaignById(campaignId);
	});
	const adventures = $derived.by(() => {
		if (!database.isReady) return [];
		return getAdventuresForCampaign(campaignId);
	});
</script>

<svelte:head>
	<title>{campaign?.campaign_name ?? 'Campaign'} · DM Deputy</title>
</svelte:head>

{#if database.isReady && !campaign}
	<section class="page-stack campaign-page">
		<h1>Campaign not found</h1>
		<Button.Root href={resolve('/')} data-variant="plain">Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack campaign-page">
		<nav aria-label="Back to home">
			<Button.Root href={resolve('/')} data-variant="plain">←</Button.Root>
		</nav>

		<header class="campaign-page-header">
			<div class="campaign-page-header-row">
				<h1>{campaign?.campaign_name ?? ''}</h1>
				{#if campaign}
					<CampaignSettingsModal
						campaignId={campaign.campaign_id}
						campaignName={campaign.campaign_name}
						nickname={campaign.nickname ?? ''}
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
				<Button.Root
					href={resolve(`/onboarding/adventure/${campaignId}`)}
					data-variant="icon"
					aria-label="Create adventure"
				>
					<AddIcon />
				</Button.Root>
			</div>

			<ul class="adventure-list list-plain">
				<li>
					<a class="card-link card-link-block" href={resolveSessionZeroHref(campaignId)}
						>Session 0</a
					>
				</li>
				{#each adventures as adventure (adventure.adventure_id)}
					<li>
						<a
							class="card-link card-link-block"
							href={resolve(`/campaigns/${campaignId}/adventures/${adventure.adventure_id}`)}
						>
							{adventure.name}
						</a>
					</li>
				{/each}
			</ul>
			{#if adventures.length === 0}
				<EmptyState message="No adventures yet." />
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
	.campaign-page {
		gap: 2.5rem;
	}

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

	.campaign-page :global([data-button-root][data-variant='icon']) {
		background: transparent;
		box-shadow: none;
		border-color: var(--color-border);
		color: var(--color-text-muted);
	}

	.campaign-page :global([data-button-root][data-variant='icon']:hover:not(:disabled)) {
		background: transparent;
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>
