<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Label } from 'bits-ui';
	import AdventurePartsList from '$lib/components/adventure/AdventurePartsList.svelte';
	import AdventureSettingsModal from '$lib/components/adventure/AdventureSettingsModal.svelte';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
	import OcrScanButton from '$lib/components/part/OcrScanButton.svelte';
	import { getAdventureById, getCampaignById, getPartsForAdventure } from '$lib/data';
	import {
		persistAdventureParts,
		syncAdventurePartOrderWithDatabase,
		touchCampaign
	} from '$lib/data/writes';
	import { assignPartOrder } from '$lib/domain/part-reorder';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import { createPartReorder } from '$lib/stores/part-reorder.svelte';
	import { database } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { Part } from '$lib/types/schema';

	type PartLine = {
		id: string;
		title: string;
	};

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');

	const campaign = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getCampaignById(campaignId);
	});
	const adventure = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getAdventureById(adventureId);
	});

	let saving = $state(false);
	let sessionDurationDrafts = $state<Record<string, string>>({});
	let partTitleInputs = $state<Record<string, HTMLInputElement | undefined>>({});

	const partReorder = createPartReorder(async (next) => {
		await commitParts(next);
	});

	const partDraft = createDraftLines<PartLine>(() => ({ id: crypto.randomUUID(), title: '' }));

	$effect(() => {
		if (!database.isReady || !adventureId) return;

		let cancelled = false;

		void (async () => {
			const initialParts = getPartsForAdventure(adventureId);
			partReorder.setDisplayParts(initialParts);
			sessionDurationDrafts = Object.fromEntries(
				initialParts.map((part) => [part.part_id, part.session_duration ?? ''])
			);

			await syncAdventurePartOrderWithDatabase(adventureId);
			if (cancelled) return;

			const syncedParts = getPartsForAdventure(adventureId);
			partReorder.setDisplayParts(syncedParts);
			sessionDurationDrafts = Object.fromEntries(
				syncedParts.map((part) => [part.part_id, part.session_duration ?? ''])
			);
		})();

		return () => {
			cancelled = true;
		};
	});

	async function commitParts(next: Part[]) {
		saving = true;

		try {
			const normalized = next.map((part) => ({
				...part,
				session_duration: part.session_duration?.trim() || null
			}));
			await persistAdventureParts(adventureId, normalized);
			await touchCampaign(workspace.currentUserId, campaignId);
			partReorder.commitDisplayParts(normalized);
			for (const part of normalized) {
				sessionDurationDrafts[part.part_id] = part.session_duration ?? '';
			}
		} finally {
			saving = false;
		}
	}

	async function savePartSessionDuration(partId: string) {
		const draft = sessionDurationDrafts[partId] ?? '';
		const normalized = draft.trim() || null;
		const part = partReorder.displayParts.find((entry) => entry.part_id === partId);
		if (!part || (part.session_duration ?? null) === normalized) return;

		const next = partReorder.displayParts.map((entry) =>
			entry.part_id === partId ? { ...entry, session_duration: normalized } : entry
		);
		await commitParts(next);
	}

	async function handlePartKeydown(event: KeyboardEvent, lineId: string) {
		await partDraft.handleEnter(event, () => {
			const newLine = partDraft.lines[partDraft.lines.length - 1];
			return newLine ? partTitleInputs[newLine.id] : undefined;
		});
		void lineId;
	}

	async function saveNewParts(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const titles = partDraft.lines.map((line) => line.title.trim()).filter(Boolean);
		if (titles.length === 0) return;

		const newParts: Part[] = titles.map((title, index) => ({
			part_id: `part-${crypto.randomUUID()}`,
			adventure_id: adventureId,
			title,
			summary: null,
			session_duration: null,
			sort_order: partReorder.displayParts.length + index + 1
		}));

		await commitParts(assignPartOrder([...partReorder.displayParts, ...newParts]));
		partDraft.reset();
	}
</script>

<svelte:head>
	<title>{adventure?.name ?? 'Adventure'} · DM Deputy</title>
</svelte:head>

<svelte:window
	onpointermove={partReorder.handleWindowPointerMove}
	onpointerup={partReorder.handleWindowPointerUp}
	onpointercancel={partReorder.handleWindowPointerUp}
/>

{#if database.isReady && (!campaign || !adventure)}
	<section class="page-stack">
		<h1>Adventure not found</h1>
		<Button.Root href={resolve('/')} data-variant="plain">Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack">
		<nav aria-label="Back to campaign">
			<Button.Root href={resolve(`/campaigns/${campaignId}`)} data-variant="plain">←</Button.Root>
		</nav>

		<div class="campaign-header campaign-header--centered">
			<div class="adventure-heading">
				<p class="eyebrow">{campaign?.campaign_name ?? ''}</p>
				<h1>{adventure?.name ?? ''}</h1>
			</div>
			{#if campaign && adventure}
				<AdventureSettingsModal
					campaignId={campaign.campaign_id}
					campaignName={campaign.campaign_name}
					adventureId={adventure.adventure_id}
					adventureName={adventure.name}
					shorthand={adventure.shorthand ?? ''}
				/>
			{/if}
		</div>

		{#if adventure?.overview}
			<p>{adventure.overview}</p>
		{/if}

		{#if adventure?.adventure_hook}
			<blockquote>{adventure.adventure_hook}</blockquote>
		{/if}

		<div class="actions-row">
			<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}/full`)}>
				Full adventure
			</Button.Root>
		</div>

		<section class="parts-section">
			<AdventurePartsList
				parts={partReorder.displayParts}
				{campaignId}
				{adventureId}
				draggedPartId={partReorder.draggedPartId}
				bind:sessionDurationDrafts
				onSessionDurationBlur={savePartSessionDuration}
				onHandlePointerDown={partReorder.handleHandlePointerDown}
			/>

			<form class="parts-form" onsubmit={saveNewParts}>
				<div class="field">
					<div class="campaign-header campaign-header--centered">
						<Label.Root>{partReorder.displayParts.length === 0 ? 'Parts' : 'Add parts'}</Label.Root>
						<OcrScanButton />
					</div>
					<p class="hint">Enter each part title on its own line. Press Enter to add another.</p>
					<DraftLinesForm
						lines={partDraft.lines}
						listClass="part-lines list-plain"
						lineClass="part-line"
						onRemove={partDraft.remove}
						onAdd={partDraft.add}
						showRemove={(line) =>
							partDraft.lines.length > 1 || Boolean((line as PartLine).title.trim())}
					>
						{#snippet row({ line })}
							{@const partLine = line as PartLine}
							<input
								bind:this={partTitleInputs[partLine.id]}
								bind:value={partLine.title}
								placeholder="Part title"
								aria-label="Part title"
								onkeydown={(event) => handlePartKeydown(event, partLine.id)}
							/>
						{/snippet}
					</DraftLinesForm>
				</div>

				<div class="parts-form-submit">
					<Button.Root type="submit" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</Button.Root>
				</div>
			</form>
		</section>
	</section>
{/if}

<style>
	.adventure-heading h1 {
		margin: 0.15rem 0 0;
	}
</style>
