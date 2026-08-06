<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { focusDraftRowInput } from '$lib/actions/focus-draft-row';
	import CampaignCharacterListItem from '$lib/components/campaign/CampaignCharacterListItem.svelte';
	import CampaignLinkExistingCharacterForm from '$lib/components/campaign/CampaignLinkExistingCharacterForm.svelte';
	import { getCampaignMembers, getUserById } from '$lib/data';
	import { resolveCharacterHref } from '$lib/navigation/hrefs';
	import {
		addCampaignPcToCampaign,
		persistCampaignPlayers,
		removeCampaignPlayer
	} from '$lib/data/writes';
	import {
		getReactiveAvailablePcsForCampaign,
		getReactivePcsForCampaign
	} from '$lib/stores/campaign-characters.svelte';
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

	let draftLines = $state<PlayerDraftLine[]>([
		{ id: crypto.randomUUID(), player_name: '', character_name: '' }
	]);
	let saving = $state(false);
	let removingCharacterId = $state<string | null>(null);
	let addingExistingCharacterId = $state<string | null>(null);
	let selectedExistingCharacterId = $state('');
	let error = $state<string | null>(null);
	let draftPlayerNameInputs = $state<Record<string, HTMLInputElement | undefined>>({});

	const pcs = $derived(getReactivePcsForCampaign(campaignId));
	const availablePcs = $derived(getReactiveAvailablePcsForCampaign(campaignId));

	function createDraftLine(): PlayerDraftLine {
		return { id: crypto.randomUUID(), player_name: '', character_name: '' };
	}

	function addDraftLine() {
		draftLines = [...draftLines, createDraftLine()];
	}

	function removeDraftLine(lineId: string) {
		draftLines = draftLines.filter((line) => line.id !== lineId);
		if (draftLines.length === 0) {
			draftLines = [createDraftLine()];
		}
	}

	async function handleDraftKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const newLine = createDraftLine();
		draftLines = [...draftLines, newLine];
		await focusDraftRowInput(() => draftPlayerNameInputs[newLine.id]);
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

	function draftHasContent(line: PlayerDraftLine): boolean {
		return Boolean(line.player_name.trim() || line.character_name.trim());
	}

	async function saveNewPlayers(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const players = draftLines
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
			draftLines = [createDraftLine()];
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save players';
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
			error = cause instanceof Error ? cause.message : 'Could not remove player';
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
			error = cause instanceof Error ? cause.message : 'Could not link player character';
		} finally {
			addingExistingCharacterId = null;
		}
	}
</script>

<section class="pcs-section" aria-labelledby="campaign-pcs-heading">
	<h2 id="campaign-pcs-heading">Player characters</h2>

	<p class="hint">
		Click a character to open their sheet. Remove players from this campaign without deleting their
		character, or link an existing character below.
	</p>

	{#if pcs.length}
		<ul class="character-list list-plain">
			{#each pcs as pc (pc.character_id)}
				{@const playerName = playerNameForPc(pc)}
				<CampaignCharacterListItem
					href={resolveCharacterHref(campaignId, pc.character_id)}
					character={pc}
					subtitle={playerName ? `Player: ${playerName}` : null}
					removing={removingCharacterId === pc.character_id}
					removeAriaLabel={`Remove ${pc.display_name} from campaign`}
					onRemove={() => handleRemove(pc)}
				/>
			{/each}
		</ul>
	{:else}
		<p class="hint">No player characters yet.</p>
	{/if}

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

	<form class="pcs-form" onsubmit={saveNewPlayers}>
		<div class="field">
			<Label.Root>{pcs.length === 0 ? 'Add players' : 'Add more players'}</Label.Root>
			<p class="hint">
				Enter the player and character names, then press Enter in the last field to add another row.
			</p>
			<ul class="pc-draft-lines list-plain">
				{#each draftLines as line, index (line.id)}
					<li class="pc-draft-line">
						<input
							type="text"
							bind:this={draftPlayerNameInputs[line.id]}
							bind:value={line.player_name}
							placeholder="Player name"
							aria-label="Player name"
						/>
						<input
							type="text"
							bind:value={line.character_name}
							placeholder="Character name"
							aria-label="Character name"
							onkeydown={handleDraftKeydown}
						/>
						{#if draftLines.length > 1 || draftHasContent(line)}
							<Button.Root
								type="button"
								data-variant="icon"
								aria-label="Remove player row"
								onclick={() => removeDraftLine(line.id)}
							>
								−
							</Button.Root>
						{/if}
						{#if index === draftLines.length - 1}
							<Button.Root
								type="button"
								data-variant="icon"
								aria-label="Add player row"
								onclick={addDraftLine}
							>
								+
							</Button.Root>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		<div class="pcs-form-submit">
			<Button.Root type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button.Root>
		</div>
	</form>

	{#if error}
		<p class="hint error">{error}</p>
	{/if}
</section>

<style>
	.pcs-section {
		display: grid;
		gap: 0.75rem;
	}

	.pcs-section > h2 {
		margin: 0;
	}

	.character-list {
		display: grid;
		gap: 0.5rem;
	}

	.pcs-form {
		margin-top: 0.5rem;
	}

	.pc-draft-lines {
		display: grid;
		gap: 0.5rem;
	}

	.pc-draft-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.pc-draft-line input {
		flex: 1;
		min-width: 0;
	}

	.pcs-form-submit {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.pcs-form .field {
		margin-bottom: 0;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
