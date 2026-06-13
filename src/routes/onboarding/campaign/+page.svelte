<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import { workspace } from '$lib/stores/workspace.svelte';

	const isNewGm = $derived(workspace.scenario === 'new-gm');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		workspace.createdCampaignId = `cmp-${crypto.randomUUID()}`;
		goto(resolve('/onboarding/adventure'));
	}
</script>

<svelte:head>
	<title>Create campaign · DM Deputy</title>
</svelte:head>

<section class="page-stack page-stack--compact">
	{#if isNewGm}
		<p class="eyebrow">New game master</p>
		<h1>Create a new campaign</h1>
		<p>Tell us about the world your players will explore.</p>
	{:else}
		<h1>Create a new campaign</h1>
	{/if}

	<form class="page-stack--compact" onsubmit={handleSubmit}>
		<div class="field">
			<Label.Root for="campaign_name">Campaign name</Label.Root>
			<input
				id="campaign_name"
				bind:value={workspace.campaignDraft.campaign_name}
				required
				placeholder="The Shattered Crown"
			/>
		</div>

		<div class="field">
			<Label.Root for="description">Description</Label.Root>
			<textarea
				id="description"
				bind:value={workspace.campaignDraft.description}
				rows="4"
				placeholder="Optional overview for your table"
			></textarea>
		</div>

		<div class="field">
			<Label.Root for="game_schema">Ruleset</Label.Root>
			<input
				id="game_schema"
				bind:value={workspace.campaignDraft.game_schema}
				placeholder="dnd5e"
			/>
		</div>

		<div class="actions-row">
			<Button.Root type="submit">Continue to adventure</Button.Root>
			<Button.Root href={resolve('/')}>Cancel</Button.Root>
		</div>
	</form>
</section>
