<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Label } from 'bits-ui';
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
	import { setupDraftBatchAutoSave } from '$lib/stores/autosave.svelte';
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

	async function handleDraftKeydown(event: KeyboardEvent, line: PlayerDraftLine, index: number) {
		if (event.key !== 'Enter') return;

		event.preventDefault();

		const isLast = index === playerDraft.lines.length - 1;
		if (isLast && line.player_name.trim() && line.character_name.trim()) {
			await playerDraftAutoSave.commitLines([line]);
			return;
		}

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

	function completePlayerLines(lines: PlayerDraftLine[]) {
		return lines.filter((line) => line.player_name.trim() && line.character_name.trim());
	}

	const playerDraftAutoSave = setupDraftBatchAutoSave({
		isEnabled: () => Boolean(campaignId),
		getLines: () => playerDraft.lines,
		setLines: (lines) => {
			playerDraft.lines = lines;
		},
		createEmptyLine: playerDraft.createEmpty,
		getSavableLines: completePlayerLines,
		serializeSavableLine: (line) => ({
			player_name: line.player_name.trim(),
			character_name: line.character_name.trim()
		}),
		persist: async (lines) => {
			error = null;
			await persistCampaignPlayers(
				campaignId,
				workspace.currentUserId,
				lines.map((line) => ({
					player_name: line.player_name.trim(),
					character_name: line.character_name.trim()
				}))
			);
		},
		onError: (cause) => {
			error = formatErrorMessage(cause, 'Could not save players');
		}
	});

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
						{campaignId}
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
		<div class="pcs-form">
			<div class="field">
				<Label.Root>{pcs.length === 0 ? 'Add players' : 'Add more players'}</Label.Root>
				<DraftLinesForm
					lines={playerDraft.lines}
					listClass="pc-draft-lines list-plain"
					lineClass="pc-draft-line"
					onRemove={playerDraft.remove}
					onAdd={playerDraft.add}
					showRemove={(line) =>
						playerDraft.lines.length > 1 || draftHasContent(line as PlayerDraftLine)}
				>
					{#snippet row({ line, index })}
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
							onkeydown={(event) => handleDraftKeydown(event, draftLine, index)}
						/>
					{/snippet}
				</DraftLinesForm>
			</div>
		</div>
	{/snippet}
</EntitySection>

<style>
	.character-list {
		display: grid;
		gap: 0.5rem;
	}

	.pcs-form {
		margin-top: 0.5rem;
		overflow-anchor: auto;
	}

	.pcs-form .field {
		margin-bottom: 0;
	}
</style>
