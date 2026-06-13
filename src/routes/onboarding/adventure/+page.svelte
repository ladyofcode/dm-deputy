<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Checkbox, Label } from 'bits-ui';
	import { workspace } from '$lib/stores/workspace.svelte';

	$effect(() => {
		if (!workspace.createdCampaignId) {
			goto(resolve('/onboarding/campaign'));
		}
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		workspace.createdAdventureId = `adv-${crypto.randomUUID()}`;
		workspace.onboardingParts = [];
		goto(
			resolve(
				`/campaigns/${workspace.createdCampaignId}/adventures/${workspace.createdAdventureId}`
			)
		);
	}
</script>

<svelte:head>
	<title>Create adventure · DM Deputy</title>
</svelte:head>

<section class="page-stack page-stack--compact">
	<p class="eyebrow">Campaign: {workspace.campaignDraft.campaign_name || 'Untitled campaign'}</p>
	<h1>Create your first adventure</h1>
	<p>Adventures sit inside a campaign and break down into ordered parts.</p>

	<form class="page-stack--compact" onsubmit={handleSubmit}>
		<div class="field">
			<Label.Root for="name">Adventure name</Label.Root>
			<input
				id="name"
				bind:value={workspace.adventureDraft.name}
				required
				placeholder="Crown in the Ashes"
			/>
		</div>

		<div class="field">
			<Label.Root for="overview">Overview</Label.Root>
			<textarea
				id="overview"
				bind:value={workspace.adventureDraft.overview}
				rows="4"
				placeholder="What is this adventure about?"
			></textarea>
		</div>

		<div class="field">
			<Label.Root for="adventure_hook">Adventure hook</Label.Root>
			<textarea
				id="adventure_hook"
				bind:value={workspace.adventureDraft.adventure_hook}
				rows="3"
				placeholder="How do the players get pulled in?"
			></textarea>
		</div>

		<div class="checkbox-field">
			<Checkbox.Root
				id="can_promote"
				checked={workspace.adventureDraft.can_promote_to_campaign}
				onCheckedChange={(checked) => {
					workspace.adventureDraft.can_promote_to_campaign = checked;
				}}
			/>
			<Label.Root for="can_promote">This adventure can be promoted to its own campaign</Label.Root>
		</div>

		<div class="actions-row">
			<Button.Root type="submit">Create adventure</Button.Root>
			<Button.Root href={resolve('/onboarding/campaign')}>Back</Button.Root>
		</div>
	</form>
</section>
