<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Label } from 'bits-ui';
	import OcrScanButton from '$lib/components/OcrScanButton.svelte';
	import { fromStore } from 'svelte/store';
	import { getAdventuresForCampaign, getCampaignById } from '$lib/data';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { persistAdventure } from '$lib/data/writes';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import type { OnboardingAdventureDraft } from '$lib/types/convenience-schema';

	const campaignId = $derived(page.params.campaignId ?? '');

	const dbReady = fromStore(dbIsReady);

	const campaign = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getCampaignById(campaignId);
	});
	const existingAdventures = $derived.by(() => {
		if (!dbReady.current) return [];
		return getAdventuresForCampaign(campaignId);
	});

	let draft = $state<OnboardingAdventureDraft>({
		name: '',
		overview: '',
		adventure_hook: ''
	});
	let saving = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!campaignId) {
			goto(resolve('/onboarding/campaign'));
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !campaignId) return;

		saving = true;
		error = null;

		try {
			const adventure = await persistAdventure(campaignId, draft);
			goto(resolve(`/campaigns/${campaignId}/adventures/${adventure.adventure_id}`));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save adventure';
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create adventure · DM Deputy</title>
</svelte:head>

{#if dbReady.current && !campaign}
	<section class="page-stack page-stack--compact">
		<h1>Campaign not found</h1>
		<Button.Root href={resolve('/onboarding/campaign')}>Start over</Button.Root>
	</section>
{:else}
	<section class="page-stack page-stack--compact">
		<div class="campaign-header campaign-header--centered">
			<div>
				<p class="eyebrow">{campaign?.campaign_name ?? ''}</p>
				{#if existingAdventures.length === 0}
					<h1>No adventures! Create one below</h1>
				{:else}
					<h1>Create a new adventure</h1>
				{/if}
			</div>
			<OcrScanButton />
		</div>

		<form class="page-stack--compact" onsubmit={handleSubmit}>
			<div class="field">
				<Label.Root for="name">Adventure name</Label.Root>
				<input id="name" bind:value={draft.name} required placeholder="Crown in the Ashes" />
			</div>

			<div class="field">
				<Label.Root for="overview">Overview</Label.Root>
				<textarea
					id="overview"
					bind:value={draft.overview}
					rows="4"
					placeholder="What is this adventure about?"
				></textarea>
			</div>

			<div class="field">
				<Label.Root for="adventure_hook">Adventure hook</Label.Root>
				<textarea
					id="adventure_hook"
					bind:value={draft.adventure_hook}
					rows="3"
					placeholder="How do the players get pulled in?"
				></textarea>
			</div>

			{#if error}
				<p class="hint">{error}</p>
			{/if}

			<div class="actions-row form-submit">
				<Button.Root type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Create adventure'}
				</Button.Root>
				{#if existingAdventures.length > 0}
					<Button.Root href={resolveCampaignHref(campaignId)}>Cancel</Button.Root>
				{/if}
			</div>
		</form>
	</section>
{/if}
