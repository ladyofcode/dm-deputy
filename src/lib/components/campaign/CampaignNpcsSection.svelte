<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { tick } from 'svelte';
	import NpcExtrasModal from '$lib/components/campaign/NpcExtrasModal.svelte';
	import AddressCardIcon from '$lib/components/icons/AddressCardIcon.svelte';
	import {
		addCampaignNpcToCampaign,
		persistCampaignNpcs,
		removeCampaignNpc
	} from '$lib/data/writes';
	import {
		cloneNpcExtras,
		createEmptyNpcDraftLine,
		npcDraftLineHasStats,
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
	let statsModalOpen = $state(false);
	let draftLineId = $state<string | null>(null);
	let statsModalKind = $state<NpcCharacterKind>('npc_general');
	let statsModalName = $state('');
	let statsModalDescription = $state('');
	let statsModalExtras = $state(createEmptyNpcDraftLine().extras);

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
		addDraftLine();
		await tick();

		const inputs = document.querySelectorAll<HTMLInputElement>(
			'.npc-draft-line input[type="text"]'
		);
		inputs[inputs.length - 1]?.focus();
	}

	function openDraftStatsModal(line: NpcDraftLine) {
		draftLineId = line.id;
		statsModalKind = line.kind;
		statsModalName = line.name;
		statsModalDescription = line.description;
		statsModalExtras = cloneNpcExtras(line.extras);
		statsModalOpen = true;
	}

	function handleStatsSave(payload: {
		kind: NpcCharacterKind;
		name: string;
		description: string;
		extras: NpcExtrasDraft;
	}) {
		if (!draftLineId) return;

		draftLines = draftLines.map((line) =>
			line.id === draftLineId
				? {
						...line,
						kind: payload.kind,
						name: payload.name,
						description: payload.description,
						extras: cloneNpcExtras(payload.extras)
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

	function npcSummary(npc: Character): string | null {
		const parts: string[] = [];

		if (npc.level !== 1) parts.push(`Level ${npc.level}`);
		if (npc.hp_max > 0) parts.push(`HP ${npc.hp_current}/${npc.hp_max}`);
		if (npc.experience > 0) parts.push(`${npc.experience} XP`);
		if (npc.reputation) parts.push(npc.reputation);

		return parts.length ? parts.join(' · ') : null;
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
			<ul class="npc-list list-plain">
				{#each generalNpcs as npc (npc.character_id)}
					<li class="npc-list-item">
						<a class="npc-main" href={resolveCharacterHref(campaignId, npc.character_id)}>
							<span class="npc-name">{npc.display_name}</span>
							{#if npcSummary(npc)}
								<p class="npc-summary">{npcSummary(npc)}</p>
							{/if}
						</a>
						<Button.Root
							type="button"
							data-variant="ghost"
							disabled={removingCharacterId === npc.character_id}
							onclick={() => handleRemove(npc)}
							aria-label={`Remove ${npc.display_name} from campaign`}
						>
							{removingCharacterId === npc.character_id ? 'Removing…' : 'Remove'}
						</Button.Root>
					</li>
				{/each}
			</ul>
		{/if}

		{#if foeNpcs.length}
			<h3 class="npc-group-heading">Foes</h3>
			<ul class="npc-list list-plain">
				{#each foeNpcs as npc (npc.character_id)}
					<li class="npc-list-item">
						<a class="npc-main" href={resolveCharacterHref(campaignId, npc.character_id)}>
							<span class="npc-name">{npc.display_name}</span>
							{#if npcSummary(npc)}
								<p class="npc-summary">{npcSummary(npc)}</p>
							{/if}
						</a>
						<Button.Root
							type="button"
							data-variant="ghost"
							disabled={removingCharacterId === npc.character_id}
							onclick={() => handleRemove(npc)}
							aria-label={`Remove ${npc.display_name} from campaign`}
						>
							{removingCharacterId === npc.character_id ? 'Removing…' : 'Remove'}
						</Button.Root>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="hint">No NPCs yet.</p>
	{/if}

	{#if availableNpcs.length}
		<form class="existing-npcs-form" onsubmit={handleAddExistingNpc}>
			<div class="field">
				<Label.Root for="existing_npc_select">Add existing NPC</Label.Root>
				<p class="hint">
					NPCs removed from a campaign stay in your library and can be added again.
				</p>
				<div class="existing-npc-row">
					<select
						id="existing_npc_select"
						bind:value={selectedExistingCharacterId}
						aria-label="Existing NPC"
					>
						<option value="">Choose an NPC…</option>
						{#each availableNpcs as npc (npc.character_id)}
							<option value={npc.character_id}>
								{npc.display_name} ({CHARACTER_KIND_LABELS[npc.kind]})
							</option>
						{/each}
					</select>
					<Button.Root
						type="submit"
						disabled={!selectedExistingCharacterId || addingExistingCharacterId !== null}
					>
						{addingExistingCharacterId ? 'Adding…' : 'Add to campaign'}
					</Button.Root>
				</div>
			</div>
		</form>
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
							bind:value={line.name}
							placeholder="Name"
							aria-label="NPC name"
							onkeydown={handleDraftKeydown}
						/>
						<Button.Root
							type="button"
							data-variant="icon"
							class={npcDraftLineHasStats(line.extras) ? 'has-sheet' : undefined}
							aria-label={`Open sheet for ${line.name || 'NPC'}`}
							onclick={() => openDraftStatsModal(line)}
						>
							<AddressCardIcon size={20} />
						</Button.Root>
						{#if draftLines.length > 1 || line.name.trim()}
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
	extras={statsModalExtras}
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

	.npc-list {
		display: grid;
		gap: 0.5rem;
	}

	.npc-list-item {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.npc-main {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
		padding: 0;
		text-decoration: none;
		color: inherit;
	}

	.npc-main:hover .npc-name {
		color: var(--color-accent);
	}

	.npc-name {
		font-weight: 600;
	}

	.npc-summary {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.npcs-form {
		margin-top: 0.5rem;
	}

	.existing-npcs-form .field {
		margin-bottom: 0;
	}

	.existing-npc-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.existing-npc-row select {
		flex: 1;
		min-width: 0;
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
