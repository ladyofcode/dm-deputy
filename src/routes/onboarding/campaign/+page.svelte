<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import { tick } from 'svelte';
	import { fromStore } from 'svelte/store';
	import { getCampaigns } from '$lib/data';
	import { persistCampaign } from '$lib/data/writes';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { OnboardingCampaignDraft } from '$lib/types/convenience-schema';

	type PlayerLine = {
		id: string;
		name: string;
	};

	const dbReady = fromStore(dbIsReady);
	const hasExistingCampaigns = $derived(dbReady.current ? getCampaigns().length > 0 : false);

	let campaignName = $state('');
	let description = $state('');
	let gameSchema = $state('dnd5e');
	let playerLines = $state<PlayerLine[]>([{ id: crypto.randomUUID(), name: '' }]);
	let saving = $state(false);
	let error = $state<string | null>(null);

	function addPlayerLine() {
		playerLines = [...playerLines, { id: crypto.randomUUID(), name: '' }];
	}

	async function handlePlayerKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		addPlayerLine();
		await tick();

		const inputs = document.querySelectorAll<HTMLInputElement>('.player-line input');
		inputs[inputs.length - 1]?.focus();
	}

	async function handleCreateCampaign(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		saving = true;
		error = null;

		const draft: OnboardingCampaignDraft = {
			campaign_name: campaignName,
			description,
			game_schema: gameSchema,
			player_names: playerLines.map((line) => line.name)
		};

		try {
			const { campaign } = await persistCampaign(workspace.currentUserId, draft);
			goto(resolve(`/onboarding/adventure/${campaign.campaign_id}`));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save campaign';
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Create campaign · DM Deputy</title>
</svelte:head>

<section class="page-stack page-stack--compact">
	<h1>{hasExistingCampaigns ? 'Create a new campaign' : 'Create campaign'}</h1>
	<p>Tell us about the world your players will explore.</p>

	<form class="page-stack--compact" onsubmit={handleCreateCampaign}>
		<div class="field">
			<Label.Root for="campaign_name">Campaign name</Label.Root>
			<input
				id="campaign_name"
				bind:value={campaignName}
				required
				placeholder="The most fun campaign ever"
			/>
		</div>

		<div class="field">
			<Label.Root for="description">Description</Label.Root>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				placeholder="The most fun description of the most fun campaign ever"
			></textarea>
		</div>

		<div class="field">
			<Label.Root for="game_schema">Game</Label.Root>
			<select id="game_schema" bind:value={gameSchema}>
				<option value="dnd5e">D&amp;D 5th Edition</option>
			</select>
		</div>

		<div class="field">
			<Label.Root>Players</Label.Root>
			<p class="hint">
				Add each player by name. A user and character slot is created for each one.
			</p>
			<ul class="player-lines list-plain">
				{#each playerLines as line, index (line.id)}
					<li class="player-line">
						<input
							bind:value={line.name}
							placeholder="Player name"
							aria-label="Player name"
							onkeydown={handlePlayerKeydown}
						/>
						{#if index === playerLines.length - 1}
							<Button.Root
								type="button"
								data-variant="icon"
								onclick={addPlayerLine}
								aria-label="Add player"
							>
								+
							</Button.Root>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if error}
			<p class="hint">{error}</p>
		{/if}

		<div class="actions-row form-submit">
			<Button.Root type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Create campaign'}
			</Button.Root>
			{#if hasExistingCampaigns}
				<Button.Root href={resolve('/')}>Cancel</Button.Root>
			{/if}
		</div>
	</form>
</section>
