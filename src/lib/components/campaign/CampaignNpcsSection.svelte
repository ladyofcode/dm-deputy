<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { focusDraftRowInput } from '$lib/actions/focus-draft-row';
	import CampaignCharacterListItem from '$lib/components/campaign/CampaignCharacterListItem.svelte';
	import CampaignLinkExistingCharacterForm from '$lib/components/campaign/CampaignLinkExistingCharacterForm.svelte';
	import NpcExtrasModal from '$lib/components/campaign/NpcExtrasModal.svelte';
	import AddressCardIcon from '$lib/components/icons/AddressCardIcon.svelte';
	import {
		addCampaignNpcToCampaign,
		persistCampaignNpcs,
		removeCampaignNpc
	} from '$lib/data/writes';
	import {
		cloneCharacterIdentity,
		cloneNpcExtras,
		createEmptyNpcDraftLine,
		npcDraftLineHasStats,
		type CharacterIdentityDraft,
		type NpcDraftLine,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import { resolveCharacterHref } from '$lib/navigation/hrefs';
	import {
		getReactiveAvailableNpcsForCampaign,
		getReactiveNpcsForCampaign
	} from '$lib/stores/campaign-characters.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import {
		CHARACTER_KIND_LABELS,
		type Character,
		type NpcCharacterKind
	} from '$lib/types/schema';

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	let draftLines = $state<NpcDraftLine[]>([createEmptyNpcDraftLine()]);
	let saving = $state(false);
	let removingCharacterId = $state<string | null>(null);
	let addingExistingCharacterId = $state<string | null>(null);
	let selectedExistingCharacterId = $state('');
	let error = $state<string | null>(null);
	let draftNameInputs = $state<Record<string, HTMLInputElement | undefined>>({});
	let statsModalOpen = $state(false);
	let draftLineId = $state<string | null>(null);
	let statsModalKind = $state<NpcCharacterKind>('npc_general');
	let statsModalName = $state('');
	let statsModalDescription = $state('');
	let statsModalIdentity = $state(createEmptyNpcDraftLine().identity);
	let statsModalExtras = $state(createEmptyNpcDraftLine().extras);
	let statsModalPortraitFile = $state<File | null>(null);
	let statsModalPortraitImageSource = $state<string | null>(null);

	const npcs = $derived(getReactiveNpcsForCampaign(campaignId));
	const availableNpcs = $derived(getReactiveAvailableNpcsForCampaign(campaignId));
	const generalNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_general'));
	const foeNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_foe'));

	function addDraftLine() {
		draftLines = [...draftLines, createEmptyNpcDraftLine()];
	}

	function removeDraftLine(lineId: string) {
		draftLines = draftLines.filter((line) => line.id !== lineId);
		if (draftLines.length === 0) {
			draftLines = [createEmptyNpcDraftLine()];
		}
	}

	async function handleDraftKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const newLine = createEmptyNpcDraftLine();
		draftLines = [...draftLines, newLine];
		await focusDraftRowInput(() => draftNameInputs[newLine.id]);
	}

	function draftLineHasSheet(line: NpcDraftLine): boolean {
		return (
			npcDraftLineHasStats(line.extras) ||
			Boolean(line.portraitFile) ||
			Boolean(line.identity.race.trim()) ||
			Boolean(line.identity.creature_type.trim()) ||
			Boolean(line.identity.alignment.trim()) ||
			Boolean(line.identity.age.trim()) ||
			Boolean(line.identity.class_name.trim()) ||
			Boolean(line.identity.presentation.trim()) ||
			line.extras.level !== 1
		);
	}

	function openDraftStatsModal(line: NpcDraftLine) {
		draftLineId = line.id;
		statsModalKind = line.kind;
		statsModalName = line.name;
		statsModalDescription = line.description;
		statsModalIdentity = cloneCharacterIdentity(line.identity);
		statsModalExtras = cloneNpcExtras(line.extras);
		statsModalPortraitFile = line.portraitFile;
		statsModalPortraitImageSource = line.portraitImageSource;
		statsModalOpen = true;
	}

	function handleStatsSave(payload: {
		kind: NpcCharacterKind;
		name: string;
		description: string;
		identity: CharacterIdentityDraft;
		extras: NpcExtrasDraft;
		portraitFile: File | null;
		portraitImageSource: string | null;
	}) {
		if (!draftLineId) return;

		draftLines = draftLines.map((line) =>
			line.id === draftLineId
				? {
						...line,
						kind: payload.kind,
						name: payload.name,
						description: payload.description,
						identity: cloneCharacterIdentity(payload.identity),
						extras: cloneNpcExtras(payload.extras),
						portraitFile: payload.portraitFile,
						portraitImageSource: payload.portraitImageSource
					}
				: line
		);
		draftLineId = null;
	}

	async function saveNewNpcs(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const lines = draftLines.filter((line) => line.name.trim());
		if (lines.length === 0) return;

		saving = true;
		error = null;

		try {
			await persistCampaignNpcs(campaignId, workspace.currentUserId, lines);
			draftLines = [createEmptyNpcDraftLine()];
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save NPCs';
		} finally {
			saving = false;
		}
	}

	async function handleRemove(npc: Character) {
		if (removingCharacterId) return;

		const confirmed = confirm(
			`Remove ${CHARACTER_KIND_LABELS[npc.kind]} “${npc.display_name}” from this campaign?`
		);
		if (!confirmed) return;

		removingCharacterId = npc.character_id;
		error = null;

		try {
			await removeCampaignNpc(campaignId, npc.character_id);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not remove NPC';
		} finally {
			removingCharacterId = null;
		}
	}

	async function handleAddExistingNpc(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedExistingCharacterId || addingExistingCharacterId) return;

		addingExistingCharacterId = selectedExistingCharacterId;
		error = null;

		try {
			await addCampaignNpcToCampaign(campaignId, selectedExistingCharacterId);
			selectedExistingCharacterId = '';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not add NPC to campaign';
		} finally {
			addingExistingCharacterId = null;
		}
	}
</script>

<section class="npcs-section" aria-labelledby="campaign-npcs-heading">
	<h2 id="campaign-npcs-heading">NPCs</h2>

	<p class="hint">
		Click an NPC to open their sheet. Remove them from this campaign without deleting their record,
		or add existing NPCs from your library below.
	</p>

	{#if npcs.length}
		{#if generalNpcs.length}
			<h3 class="npc-group-heading">NPCs</h3>
			<ul class="character-list list-plain">
				{#each generalNpcs as npc (npc.character_id)}
					<CampaignCharacterListItem
						href={resolveCharacterHref(campaignId, npc.character_id)}
						character={npc}
						defaultLevel={1}
						removing={removingCharacterId === npc.character_id}
						removeAriaLabel={`Remove ${npc.display_name} from campaign`}
						onRemove={() => handleRemove(npc)}
					/>
				{/each}
			</ul>
		{/if}

		{#if foeNpcs.length}
			<h3 class="npc-group-heading">Foes</h3>
			<ul class="character-list list-plain">
				{#each foeNpcs as npc (npc.character_id)}
					<CampaignCharacterListItem
						href={resolveCharacterHref(campaignId, npc.character_id)}
						character={npc}
						defaultLevel={1}
						removing={removingCharacterId === npc.character_id}
						removeAriaLabel={`Remove ${npc.display_name} from campaign`}
						onRemove={() => handleRemove(npc)}
					/>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="hint">No NPCs yet.</p>
	{/if}

	{#if availableNpcs.length}
		<CampaignLinkExistingCharacterForm
			id="existing_npc_select"
			label="Add existing NPC"
			hint="NPCs removed from a campaign stay in your library and can be added again."
			selectAriaLabel="Existing NPC"
			placeholder="Choose an NPC…"
			selectedId={selectedExistingCharacterId}
			submitting={addingExistingCharacterId !== null}
			submitBusyLabel="Adding…"
			submitIdleLabel="Add to campaign"
			onsubmit={handleAddExistingNpc}
			onSelectedIdChange={(value) => {
				selectedExistingCharacterId = value;
			}}
		>
			{#snippet options()}
				{#each availableNpcs as npc (npc.character_id)}
					<option value={npc.character_id}>
						{npc.display_name} ({CHARACTER_KIND_LABELS[npc.kind]})
					</option>
				{/each}
			{/snippet}
		</CampaignLinkExistingCharacterForm>
	{/if}

	<form class="npcs-form" onsubmit={saveNewNpcs}>
		<div class="field">
			<Label.Root>{npcs.length === 0 ? 'Create NPCs' : 'Create more NPCs'}</Label.Root>
			<p class="hint">
				Choose type, enter a name, then press Enter to add another row. Use the card icon for stats
				and gear before saving.
			</p>
			<ul class="npc-draft-lines list-plain">
				{#each draftLines as line, index (line.id)}
					<li class="npc-draft-line">
						<select bind:value={line.kind} aria-label="NPC type">
							<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
							<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
						</select>
						<input
							type="text"
							bind:this={draftNameInputs[line.id]}
							bind:value={line.name}
							placeholder="Name"
							aria-label="NPC name"
							onkeydown={handleDraftKeydown}
						/>
						<Button.Root
							type="button"
							data-variant="icon"
							class={draftLineHasSheet(line) ? 'has-sheet' : undefined}
							aria-label={`Open sheet for ${line.name || 'NPC'}`}
							onclick={() => openDraftStatsModal(line)}
						>
							<AddressCardIcon size={20} />
						</Button.Root>
						{#if draftLines.length > 1 || Boolean(line.name.trim())}
							<Button.Root
								type="button"
								data-variant="icon"
								aria-label="Remove NPC row"
								onclick={() => removeDraftLine(line.id)}
							>
								−
							</Button.Root>
						{/if}
						{#if index === draftLines.length - 1}
							<Button.Root
								type="button"
								data-variant="icon"
								aria-label="Add NPC row"
								onclick={addDraftLine}
							>
								+
							</Button.Root>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if error}
			<p class="hint error">{error}</p>
		{/if}

		<div class="npcs-form-submit">
			<Button.Root type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</Button.Root>
		</div>
	</form>
</section>

<NpcExtrasModal
	bind:open={statsModalOpen}
	kind={statsModalKind}
	name={statsModalName}
	description={statsModalDescription}
	identity={statsModalIdentity}
	extras={statsModalExtras}
	portraitFile={statsModalPortraitFile}
	portraitImageSource={statsModalPortraitImageSource}
	onSave={handleStatsSave}
/>

<style>
	.npcs-section {
		display: grid;
		gap: 0.75rem;
	}

	.npcs-section > h2 {
		margin: 0;
	}

	.npc-group-heading {
		margin: 0.25rem 0 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.character-list {
		display: grid;
		gap: 0.5rem;
	}

	.npcs-form {
		margin-top: 0.5rem;
	}

	.npc-draft-lines {
		display: grid;
		gap: 0.5rem;
	}

	.npc-draft-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.npc-draft-line select {
		flex: 0 0 9rem;
		min-width: 0;
	}

	.npc-draft-line input {
		flex: 1;
		min-width: 0;
	}

	.npc-draft-line :global([data-button-root].has-sheet) {
		color: var(--color-accent);
	}

	.npcs-form-submit {
		display: flex;
		justify-content: flex-start;
		margin-top: 0.5rem;
	}

	.npcs-form .field {
		margin-bottom: 0;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
