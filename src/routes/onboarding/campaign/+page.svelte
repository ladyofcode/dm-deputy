<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
	import { getCampaigns } from '$lib/data';
	import { persistCampaign } from '$lib/data/writes';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import { database } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { CampaignPlayerDraft, OnboardingCampaignDraft } from '$lib/types/convenience-schema';

	type PlayerLine = CampaignPlayerDraft & {
		id: string;
	};

	const hasExistingCampaigns = $derived(database.isReady ? getCampaigns().length > 0 : false);

	let campaignName = $state('');
	let description = $state('');
	let gameSchema = $state('dnd5e');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let playerNameInputs = $state<Record<string, HTMLInputElement | undefined>>({});

	const playerDraft = createDraftLines<PlayerLine>(() => ({
		id: crypto.randomUUID(),
		player_name: '',
		character_name: ''
	}));

	async function handlePlayerKeydown(event: KeyboardEvent) {
		await playerDraft.handleEnter(event, () => {
			const newLine = playerDraft.lines[playerDraft.lines.length - 1];
			return newLine ? playerNameInputs[newLine.id] : undefined;
		});
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
			players: playerDraft.lines.map((line) => ({
				player_name: line.player_name,
				character_name: line.character_name
			}))
		};

		try {
			const { campaign } = await persistCampaign(workspace.currentUserId, draft);
			goto(resolve(`/onboarding/adventure/${campaign.campaign_id}`));
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save campaign');
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
				Add each player and their character. A user account and character sheet is created for each
				row.
			</p>
			<DraftLinesForm
				lines={playerDraft.lines}
				listClass="player-lines list-plain"
				lineClass="player-line"
				onRemove={playerDraft.remove}
				onAdd={playerDraft.add}
				showRemove={() => false}
			>
				{#snippet row({ line })}
					{@const playerLine = line as PlayerLine}
					<input
						bind:this={playerNameInputs[playerLine.id]}
						bind:value={playerLine.player_name}
						placeholder="Player name"
						aria-label="Player name"
					/>
					<input
						bind:value={playerLine.character_name}
						placeholder="Character name"
						aria-label="Character name"
						onkeydown={handlePlayerKeydown}
					/>
				{/snippet}
			</DraftLinesForm>
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
