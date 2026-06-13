<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import CampaignSettingsModal from '$lib/components/CampaignSettingsModal.svelte';
	import { getAdventuresForCampaign, getMostRecentCampaignForUser, getUserById } from '$lib/data';
	import { workspace } from '$lib/stores/workspace.svelte';

	const user = $derived(getUserById(workspace.currentUserId));
	const recent = $derived(getMostRecentCampaignForUser(workspace.currentUserId));
	const adventures = $derived(recent ? getAdventuresForCampaign(recent.campaign.campaign_id) : []);

	$effect(() => {
		if (workspace.scenario === 'new-gm') {
			goto(resolve('/onboarding/campaign'));
		}
	});
</script>

<svelte:head>
	<title>Home · DM Deputy</title>
</svelte:head>

<section class="page-stack">
	{#if user}
		<p>Welcome back, {user.username}.</p>
	{/if}

	{#if recent}
		<header class="campaign-header">
			<div>
				<p class="eyebrow">Most recently played</p>
				<h1>{recent.campaign.campaign_name}</h1>
			</div>
			<CampaignSettingsModal
				campaignId={recent.campaign.campaign_id}
				campaignName={recent.campaign.campaign_name}
			/>
		</header>
		{#if recent.campaign.description}
			<p>{recent.campaign.description}</p>
		{/if}

		<div class="meta-row">
			<span>Ruleset: {recent.campaign.game_schema}</span>
			<span>
				Last played:
				{new Date(recent.membership.last_played_at ?? '').toLocaleDateString()}
			</span>
		</div>

		<section class="page-stack--compact">
			<h2>Adventures</h2>
			{#if adventures.length === 0}
				<p>No adventures in this campaign yet.</p>
			{:else}
				<ul class="list-plain">
					{#each adventures as adventure (adventure.adventure_id)}
						<li>
							<a
								class="card-link"
								href={resolve(
									`/campaigns/${recent.campaign.campaign_id}/adventures/${adventure.adventure_id}`
								)}
							>
								<strong>{adventure.name}</strong>
								{#if adventure.overview}
									<span>{adventure.overview}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<Button.Root href={resolve('/onboarding/campaign')}>Create another campaign</Button.Root>
	{:else}
		<header>
			<h1>No campaigns yet</h1>
			<p>Create your first campaign to get started.</p>
		</header>
		<Button.Root href={resolve('/onboarding/campaign')}>Create a new campaign</Button.Root>
	{/if}
</section>
