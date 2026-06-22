<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { tick } from 'svelte';
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
	import type { Character } from '$lib/types/schema';

	type PlayerDraftLine = {
		id: string;
		name: string;
	};

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	let draftLines = $state<PlayerDraftLine[]>([{ id: crypto.randomUUID(), name: '' }]);
	let saving = $state(false);
	let removingCharacterId = $state<string | null>(null);
	let addingExistingCharacterId = $state<string | null>(null);
	let selectedExistingCharacterId = $state('');
	let error = $state<string | null>(null);

	const pcs = $derived(getReactivePcsForCampaign(campaignId));
	const availablePcs = $derived(getReactiveAvailablePcsForCampaign(campaignId));

	function addDraftLine() {
		draftLines = [...draftLines, { id: crypto.randomUUID(), name: '' }];
	}

	function removeDraftLine(lineId: string) {
		draftLines = draftLines.filter((line) => line.id !== lineId);
		if (draftLines.length === 0) {
			draftLines = [{ id: crypto.randomUUID(), name: '' }];
		}
	}

	async function handleDraftKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		addDraftLine();
		await tick();

		const inputs = document.querySelectorAll<HTMLInputElement>('.pc-draft-line input[type="text"]');
		inputs[inputs.length - 1]?.focus();
	}

	function pcSummary(pc: Character): string | null {
		const parts: string[] = [];

		if (pc.level !== 1) parts.push(`Level ${pc.level}`);
		if (pc.hp_max > 0) parts.push(`HP ${pc.hp_current}/${pc.hp_max}`);
		if (pc.experience > 0) parts.push(`${pc.experience} XP`);
		if (pc.reputation) parts.push(pc.reputation);

		return parts.length ? parts.join(' · ') : null;
	}

	async function saveNewPlayers(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const names = draftLines.map((line) => line.name.trim()).filter(Boolean);
		if (names.length === 0) return;

		saving = true;
		error = null;

		try {
			await persistCampaignPlayers(campaignId, workspace.currentUserId, names);
			draftLines = [{ id: crypto.randomUUID(), name: '' }];
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
		Click a player to open their sheet. Remove players from this campaign without deleting their
		character, or link an existing character below.
	</p>

	{#if pcs.length}
		<ul class="pc-list list-plain">
			{#each pcs as pc (pc.character_id)}
				<li class="pc-list-item">
					<a class="pc-main" href={resolveCharacterHref(campaignId, pc.character_id)}>
						<span class="pc-name">{pc.display_name}</span>
						{#if pcSummary(pc)}
							<p class="pc-summary">{pcSummary(pc)}</p>
						{/if}
					</a>
					<Button.Root
						type="button"
						data-variant="ghost"
						disabled={removingCharacterId === pc.character_id}
						onclick={() => handleRemove(pc)}
						aria-label={`Remove ${pc.display_name} from campaign`}
					>
						{removingCharacterId === pc.character_id ? 'Removing…' : 'Remove'}
					</Button.Root>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="hint">No player characters yet.</p>
	{/if}

	{#if availablePcs.length}
		<form class="existing-pcs-form" onsubmit={handleAddExistingPc}>
			<div class="field">
				<Label.Root for="existing_pc_select">Link existing character</Label.Root>
				<p class="hint">
					Characters removed from a campaign stay in your library and can be linked again.
				</p>
				<div class="existing-pc-row">
					<select
						id="existing_pc_select"
						bind:value={selectedExistingCharacterId}
						aria-label="Existing player character"
					>
						<option value="">Choose a character…</option>
						{#each availablePcs as pc (pc.character_id)}
							<option value={pc.character_id}>{pc.display_name}</option>
						{/each}
					</select>
					<Button.Root
						type="submit"
						disabled={!selectedExistingCharacterId || Boolean(addingExistingCharacterId)}
					>
						{addingExistingCharacterId ? 'Linking…' : 'Link'}
					</Button.Root>
				</div>
			</div>
		</form>
	{/if}

	<form class="pcs-form" onsubmit={saveNewPlayers}>
		<div class="field">
			<Label.Root>{pcs.length === 0 ? 'Add players' : 'Add more players'}</Label.Root>
			<p class="hint">Enter a name, then press Enter to add another row.</p>
			<ul class="pc-draft-lines list-plain">
				{#each draftLines as line, index (line.id)}
					<li class="pc-draft-line">
						<input
							type="text"
							bind:value={line.name}
							placeholder="Player name"
							aria-label="Player name"
							onkeydown={handleDraftKeydown}
						/>
						{#if draftLines.length > 1 || line.name.trim()}
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
								onclick={() => addDraftLine}
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

	.pc-list {
		display: grid;
		gap: 0.5rem;
	}

	.pc-list-item {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.pc-main {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
		padding: 0;
		text-decoration: none;
		color: inherit;
	}

	.pc-main:hover .pc-name {
		color: var(--color-accent);
	}

	.pc-name {
		font-weight: 600;
	}

	.pc-summary {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
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

	.existing-pcs-form .field {
		margin-bottom: 0;
	}

	.existing-pc-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.existing-pc-row select {
		flex: 1;
		min-width: 0;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
