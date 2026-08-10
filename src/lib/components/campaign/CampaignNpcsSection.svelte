<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import CampaignCharacterListItem from '$lib/components/campaign/CampaignCharacterListItem.svelte';
	import CampaignLinkExistingCharacterForm from '$lib/components/campaign/CampaignLinkExistingCharacterForm.svelte';
	import NpcExtrasModal from '$lib/components/campaign/NpcExtrasModal.svelte';
	import EntitySection from '$lib/components/shared/EntitySection.svelte';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
	import AddressCardIcon from '$lib/components/icons/AddressCardIcon.svelte';
	import {
		addCampaignNpcToCampaign,
		persistCampaignNpcs,
		removeCampaignNpc
	} from '$lib/data/writes';
	import {
		cloneCharacterIdentity,
		cloneCharacterExtras,
		createEmptyNpcDraftLine,
		npcDraftLineHasStats,
		type CharacterIdentityDraft,
		type NpcDraftLine,
		type CharacterExtrasDraft
	} from '$lib/domain/npc-draft';
	import {
		getReactiveAvailableNpcsForCampaign,
		getReactiveNpcsForCampaign
	} from '$lib/stores/campaign-characters.svelte';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import { fileFingerprint, setupDraftBatchAutoSave } from '$lib/stores/autosave.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { CHARACTER_KIND_LABELS, type Character, type NpcCharacterKind } from '$lib/types/schema';

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	const npcDraft = createDraftLines(createEmptyNpcDraftLine);

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
	let statsModalPortraitThumbCropFile = $state<File | null>(null);
	let statsModalPortraitThumbCropRect = $state<
		import('$lib/domain/crop-image').NormalizedCropRect | null
	>(null);
	let statsModalPortraitImageSource = $state<string | null>(null);
	let statsModalPresentationFile = $state<File | null>(null);
	let statsModalPresentationThumbCropFile = $state<File | null>(null);
	let statsModalPresentationThumbCropRect = $state<
		import('$lib/domain/crop-image').NormalizedCropRect | null
	>(null);
	let statsModalPresentationImageSource = $state<string | null>(null);

	const npcs = $derived(getReactiveNpcsForCampaign(campaignId));
	const availableNpcs = $derived(getReactiveAvailableNpcsForCampaign(campaignId));
	const generalNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_general'));
	const foeNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_foe'));

	async function handleDraftKeydown(event: KeyboardEvent, line: NpcDraftLine, index: number) {
		if (event.key !== 'Enter') return;

		event.preventDefault();

		const isLast = index === npcDraft.lines.length - 1;
		if (isLast && line.name.trim()) {
			await npcDraftAutoSave.commitLines([line]);
			return;
		}

		await npcDraft.handleEnter(event, () => {
			const newLine = npcDraft.lines[npcDraft.lines.length - 1];
			return newLine ? draftNameInputs[newLine.id] : undefined;
		});
	}

	function draftLineHasSheet(line: NpcDraftLine): boolean {
		return (
			npcDraftLineHasStats(line.extras) ||
			Boolean(line.portraitFile) ||
			Boolean(line.portraitThumbCropFile) ||
			Boolean(line.presentationFile) ||
			Boolean(line.presentationThumbCropFile) ||
			Boolean(line.identity.race.trim()) ||
			Boolean(line.identity.creature_type.trim()) ||
			Boolean(line.identity.alignment.trim()) ||
			Boolean(line.identity.age.trim()) ||
			Boolean(line.identity.class_name.trim()) ||
			Boolean(line.identity.role_label.trim()) ||
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
		statsModalExtras = cloneCharacterExtras(line.extras);
		statsModalPortraitFile = line.portraitFile;
		statsModalPortraitThumbCropFile = line.portraitThumbCropFile;
		statsModalPortraitThumbCropRect = line.portraitThumbCropRect;
		statsModalPortraitImageSource = line.portraitImageSource;
		statsModalPresentationFile = line.presentationFile;
		statsModalPresentationThumbCropFile = line.presentationThumbCropFile;
		statsModalPresentationThumbCropRect = line.presentationThumbCropRect;
		statsModalPresentationImageSource = line.presentationImageSource;
		statsModalOpen = true;
	}

	function handleStatsSave(payload: {
		kind: NpcCharacterKind;
		name: string;
		description: string;
		identity: CharacterIdentityDraft;
		extras: CharacterExtrasDraft;
		portraitFile: File | null;
		portraitThumbCropFile: File | null;
		portraitThumbCropRect: import('$lib/domain/crop-image').NormalizedCropRect | null;
		portraitImageSource: string | null;
		presentationFile: File | null;
		presentationThumbCropFile: File | null;
		presentationThumbCropRect: import('$lib/domain/crop-image').NormalizedCropRect | null;
		presentationImageSource: string | null;
	}) {
		if (!draftLineId) return;

		npcDraft.lines = npcDraft.lines.map((line) =>
			line.id === draftLineId
				? {
						...line,
						kind: payload.kind,
						name: payload.name,
						description: payload.description,
						identity: cloneCharacterIdentity(payload.identity),
						extras: cloneCharacterExtras(payload.extras),
						portraitFile: payload.portraitFile,
						portraitThumbCropFile: payload.portraitThumbCropFile,
						portraitThumbCropRect: payload.portraitThumbCropRect,
						portraitImageSource: payload.portraitImageSource,
						presentationFile: payload.presentationFile,
						presentationThumbCropFile: payload.presentationThumbCropFile,
						presentationThumbCropRect: payload.presentationThumbCropRect,
						presentationImageSource: payload.presentationImageSource
					}
				: line
		);
		draftLineId = null;
		void npcDraftAutoSave.flush();
	}

	function savableNpcLines(lines: NpcDraftLine[]) {
		return lines.filter((line, index) => {
			if (!line.name.trim()) return false;

			const isLast = index === lines.length - 1;
			if (!isLast) return true;

			return draftLineHasSheet(line);
		});
	}

	const npcDraftAutoSave = setupDraftBatchAutoSave({
		isEnabled: () => Boolean(campaignId),
		getLines: () => npcDraft.lines,
		setLines: (lines) => {
			npcDraft.lines = lines;
		},
		createEmptyLine: npcDraft.createEmpty,
		getSavableLines: savableNpcLines,
		serializeSavableLine: (line) => ({
			id: line.id,
			kind: line.kind,
			name: line.name.trim(),
			description: line.description,
			identity: line.identity,
			extras: line.extras,
			portraitImageSource: line.portraitImageSource,
			presentationImageSource: line.presentationImageSource,
			portraitFile: fileFingerprint(line.portraitFile),
			presentationFile: fileFingerprint(line.presentationFile)
		}),
		persist: async (lines) => {
			error = null;
			await persistCampaignNpcs(campaignId, workspace.currentUserId, lines);
		},
		onError: (cause) => {
			error = formatErrorMessage(cause, 'Could not save NPCs');
		}
	});

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
			error = formatErrorMessage(cause, 'Could not remove NPC');
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
			error = formatErrorMessage(cause, 'Could not add NPC to campaign');
		} finally {
			addingExistingCharacterId = null;
		}
	}
</script>

<EntitySection
	headingId="campaign-npcs-heading"
	title="NPCs"
	emptyMessage="No NPCs yet."
	showEmpty={npcs.length === 0}
	{error}
>
	{#snippet list()}
		{#if npcs.length}
			{#if generalNpcs.length}
				<h3 class="npc-group-heading">NPCs</h3>
				<ul class="character-list list-plain">
					{#each generalNpcs as npc (npc.character_id)}
						<CampaignCharacterListItem
							characterId={npc.character_id}
							character={npc}
							{campaignId}
							listVariant="npc"
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
							characterId={npc.character_id}
							character={npc}
							{campaignId}
							listVariant="npc"
							defaultLevel={1}
							removing={removingCharacterId === npc.character_id}
							removeAriaLabel={`Remove ${npc.display_name} from campaign`}
							onRemove={() => handleRemove(npc)}
						/>
					{/each}
				</ul>
			{/if}
		{/if}
	{/snippet}
	{#snippet between()}
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
	{/snippet}
	{#snippet addForm()}
		<div class="npcs-form">
			<div class="field">
				<Label.Root>{npcs.length === 0 ? 'Create NPCs' : 'Create more NPCs'}</Label.Root>
				<div class="npc-draft-form">
					<DraftLinesForm
					lines={npcDraft.lines}
					listClass="npc-draft-lines list-plain"
					lineClass="npc-draft-line"
					removeAriaLabel="Remove NPC row"
					onRemove={npcDraft.remove}
					onAdd={npcDraft.add}
					showRemove={(line) =>
						npcDraft.lines.length > 1 || Boolean((line as NpcDraftLine).name.trim())}
				>
					{#snippet row({ line, index })}
						{@const draftLine = line as NpcDraftLine}
						<select bind:value={draftLine.kind} aria-label="NPC type">
							<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
							<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
						</select>
						<input
							type="text"
							bind:this={draftNameInputs[draftLine.id]}
							bind:value={draftLine.name}
							placeholder="Name"
							aria-label="NPC name"
							onkeydown={(event) => handleDraftKeydown(event, draftLine, index)}
						/>
					{/snippet}
					{#snippet actions({ line })}
						{@const draftLine = line as NpcDraftLine}
						<Button.Root
							type="button"
							data-variant="icon"
							class={draftLineHasSheet(draftLine) ? 'has-sheet' : undefined}
							aria-label={`Open sheet for ${draftLine.name || 'NPC'}`}
							onclick={() => openDraftStatsModal(draftLine)}
						>
							<AddressCardIcon size={20} />
						</Button.Root>
					{/snippet}
					</DraftLinesForm>
				</div>
			</div>
		</div>
	{/snippet}
</EntitySection>

<NpcExtrasModal
	bind:open={statsModalOpen}
	kind={statsModalKind}
	name={statsModalName}
	description={statsModalDescription}
	identity={statsModalIdentity}
	extras={statsModalExtras}
	portraitFile={statsModalPortraitFile}
	portraitThumbCropFile={statsModalPortraitThumbCropFile}
	portraitThumbCropRect={statsModalPortraitThumbCropRect}
	portraitImageSource={statsModalPortraitImageSource}
	presentationFile={statsModalPresentationFile}
	presentationThumbCropFile={statsModalPresentationThumbCropFile}
	presentationThumbCropRect={statsModalPresentationThumbCropRect}
	presentationImageSource={statsModalPresentationImageSource}
	onSave={handleStatsSave}
/>

<style>
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
		overflow-anchor: auto;
	}

	.npc-draft-form :global(.npc-draft-lines) {
		display: grid;
		gap: 0.5rem;
	}

	.npc-draft-form :global(.npc-draft-line) {
		align-items: stretch;
	}

	.npc-draft-form :global(.npc-draft-line select) {
		flex: 0 0 9rem;
		min-width: 0;
	}

	.npc-draft-form :global(.npc-draft-line input) {
		flex: 1;
		min-width: 0;
	}

	.npc-draft-form :global(.npc-draft-line [data-button-root].has-sheet) {
		color: var(--color-accent);
	}

	.npcs-form .field {
		margin-bottom: 0;
	}
</style>
