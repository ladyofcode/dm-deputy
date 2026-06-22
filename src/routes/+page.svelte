<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import { fromStore } from 'svelte/store';
	import { getCampaigns } from '$lib/data';
	import { getReactiveCampaignListForUser } from '$lib/stores/campaign-list.svelte';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';

	const dbReady = fromStore(dbIsReady);

	const campaigns = $derived(
		dbReady.current ? getReactiveCampaignListForUser(workspace.currentUserId) : []
	);

	function formatActivityDate(iso: string): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>Home · DM Deputy</title>
</svelte:head>

<section class="page-stack home-page">
	{#if dbReady.current}
		{#if campaigns.length > 0}
			<header class="home-header">
				<Button.Root href={resolve('/onboarding/campaign')} data-variant="ghost"
					>Create campaign</Button.Root
				>
			</header>

			<ul class="campaign-list list-plain">
				{#each campaigns as entry (entry.campaign.campaign_id)}
					<li class="campaign-item">
						<a class="campaign-link" href={resolveCampaignHref(entry.campaign.campaign_id)}>
							<div class="campaign-main">
								<h2>{entry.campaign.campaign_name}</h2>
								{#if entry.campaign.description}
									<p>{entry.campaign.description}</p>
								{/if}
							</div>
							<span class="campaign-activity">
								{entry.activity.label}: {formatActivityDate(entry.activity.at)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p>No campaigns yet. Create one to get started.</p>
			{#if getCampaigns().length > 0}
				<p class="hint">
					There are campaigns in the local database, but none are linked to the current user ({workspace.currentUserId}).
				</p>
			{/if}
			<Button.Root href={resolve('/onboarding/campaign')}>Create campaign</Button.Root>
		{/if}
	{/if}
</section>
