<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import CampaignCharacterListItem from '$lib/components/campaign/CampaignCharacterListItem.svelte';
	import CampaignLinkExistingCharacterForm from '$lib/components/campaign/CampaignLinkExistingCharacterForm.svelte';
	import EntitySection from '$lib/components/shared/EntitySection.svelte';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
	import { getCampaignMembers, getUserById } from '$lib/data';
	import {
		addCampaignPcToCampaign,
		persistCampaignPlayers,
		removeCampaignPlayer
	} from '$lib/data/writes';
	import {
		getReactiveAvailablePcsForCampaign,
		getReactivePcsForCampaign
	} from '$lib/stores/campaign-characters.svelte';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { CampaignPlayerDraft } from '$lib/types/convenience-schema';
	import type { Character } from '$lib/types/schema';

	type PlayerDraftLine = CampaignPlayerDraft & {
		id: string;
	};

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	const playerDraft = createDraftLines<PlayerDraftLine>(() => ({
		id: crypto.randomUUID(),
		player_name: '',
		character_name: ''
	}));

	let saving = $state(false);
	let removingCharacterId = $state<string | null>(null);
	let addingExistingCharacterId = $state<string | null>(null);
	let selectedExistingCharacterId = $state('');
	let error = $state<string | null>(null);
	let draftPlayerNameInputs = $state<Record<string, HTMLInputElement | undefined>>({});

	const pcs = $derived(getReactivePcsForCampaign(campaignId));
	const availablePcs = $derived(getReactiveAvailablePcsForCampaign(campaignId));

	function draftHasContent(line: PlayerDraftLine): boolean {
		return Boolean(line.player_name.trim() || line.character_name.trim());
	}

	async function handleDraftKeydown(event: KeyboardEvent) {
		await playerDraft.handleEnter(event, () => {
			const newLine = playerDraft.lines[playerDraft.lines.length - 1];
			return newLine ? draftPlayerNameInputs[newLine.id] : undefined;
		});
	}

	function playerNameForPc(pc: Character): string | null {
		const member = getCampaignMembers().find(
			(entry) =>
				entry.campaign_id === campaignId &&
				entry.character_id === pc.character_id &&
				entry.role === 'player'
		);
		if (!member) return null;

		return getUserById(member.user_id)?.username ?? null;
	}

	async function saveNewPlayers(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const players = playerDraft.lines
			.map((line) => ({
				player_name: line.player_name.trim(),
				character_name: line.character_name.trim()
			}))
			.filter((line) => line.player_name && line.character_name);
		if (players.length === 0) return;

		saving = true;
		error = null;

		try {
			await persistCampaignPlayers(campaignId, workspace.currentUserId, players);
			playerDraft.reset();
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save players');
		} finally {
			saving = false;
		}
	}

	async function handleRemove(pc: Character) {
		if (removingCharacterId) return;

		const confirmed = confirm(`Remove ${pc.display_name} from this campaign?`);
		if (!confirmed) return;

		removingCharacterId = pc.character_id;
		error = null;

		try {
			await removeCampaignPlayer(campaignId, pc.character_id);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not remove player');
		} finally {
			removingCharacterId = null;
		}
	}

	async function handleAddExistingPc(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedExistingCharacterId || addingExistingCharacterId) return;

		addingExistingCharacterId = selectedExistingCharacterId;
		error = null;

		try {
			await addCampaignPcToCampaign(campaignId, selectedExistingCharacterId);
			selectedExistingCharacterId = '';
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not link player character');
		} finally {
			addingExistingCharacterId = null;
		}
	}
</script>

<EntitySection
	headingId="campaign-pcs-heading"
	title="Player characters"
	hint="Click a character to open their sheet. Remove players from this campaign without deleting their character, or link an existing character below."
	emptyMessage="No player characters yet."
	showEmpty={pcs.length === 0}
	{error}
>
	{#snippet list()}
		{#if pcs.length}
			<ul class="character-list list-plain">
				{#each pcs as pc (pc.character_id)}
					{@const playerName = playerNameForPc(pc)}
					<CampaignCharacterListItem
						characterId={pc.character_id}
						character={pc}
						subtitle={playerName ? `Player: ${playerName}` : null}
						removing={removingCharacterId === pc.character_id}
						removeAriaLabel={`Remove ${pc.display_name} from campaign`}
						onRemove={() => handleRemove(pc)}
					/>
				{/each}
			</ul>
		{/if}
	{/snippet}
	{#snippet between()}
		{#if availablePcs.length}
			<CampaignLinkExistingCharacterForm
				id="existing_pc_select"
				label="Link existing character"
				hint="Characters removed from a campaign stay in your library and can be linked again."
				selectAriaLabel="Existing player character"
				placeholder="Choose a character…"
				selectedId={selectedExistingCharacterId}
				submitting={Boolean(addingExistingCharacterId)}
				submitBusyLabel="Linking…"
				submitIdleLabel="Link"
				onsubmit={handleAddExistingPc}
				onSelectedIdChange={(value) => {
					selectedExistingCharacterId = value;
				}}
			>
				{#snippet options()}
					{#each availablePcs as pc (pc.character_id)}
						<option value={pc.character_id}>{pc.display_name}</option>
					{/each}
				{/snippet}
			</CampaignLinkExistingCharacterForm>
		{/if}
	{/snippet}
	{#snippet addForm()}
		<form class="pcs-form" onsubmit={saveNewPlayers}>
			<div class="field">
				<Label.Root>{pcs.length === 0 ? 'Add players' : 'Add more players'}</Label.Root>
				<p class="hint">
					Enter the player and character names, then press Enter in the last field to add another
					row.
				</p>
				<DraftLinesForm
					lines={playerDraft.lines}
					listClass="pc-draft-lines list-plain"
					lineClass="pc-draft-line"
					onRemove={playerDraft.remove}
					onAdd={playerDraft.add}
					showRemove={(line) =>
						playerDraft.lines.length > 1 || draftHasContent(line as PlayerDraftLine)}
				>
					{#snippet row({ line })}
						{@const draftLine = line as PlayerDraftLine}
						<input
							type="text"
							bind:this={draftPlayerNameInputs[draftLine.id]}
							bind:value={draftLine.player_name}
							placeholder="Player name"
							aria-label="Player name"
						/>
						<input
							type="text"
							bind:value={draftLine.character_name}
							placeholder="Character name"
							aria-label="Character name"
							onkeydown={handleDraftKeydown}
						/>
					{/snippet}
				</DraftLinesForm>
			</div>

			<div class="pcs-form-submit">
				<Button.Root type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button.Root>
			</div>
		</form>
	{/snippet}
</EntitySection>

<style>
	.character-list {
		display: grid;
		gap: 0.5rem;
	}

	.pcs-form {
		margin-top: 0.5rem;
	}

	.pcs-form-submit {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.pcs-form .field {
		margin-bottom: 0;
	}
</style>
