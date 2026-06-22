<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Label } from 'bits-ui';
	import { tick } from 'svelte';
	import AdventureSettingsModal from '$lib/components/AdventureSettingsModal.svelte';
	import OcrScanButton from '$lib/components/OcrScanButton.svelte';
	import { fromStore } from 'svelte/store';
	import { getAdventureById, getCampaignById, getPartsForAdventure } from '$lib/data';
	import {
		persistAdventureParts,
		syncAdventurePartOrderWithDatabase,
		touchCampaign
	} from '$lib/data/writes';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { Part } from '$lib/types/schema';

	type PartLine = {
		id: string;
		title: string;
	};

	const dbReady = fromStore(dbIsReady);

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');

	const campaign = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getCampaignById(campaignId);
	});
	const adventure = $derived.by(() => {
		if (!dbReady.current) return undefined;
		return getAdventureById(adventureId);
	});

	let displayParts = $state<Part[]>([]);
	let draggedPartId = $state<string | null>(null);
	let dragOrderSnapshot = $state('');
	let partLines = $state<PartLine[]>([{ id: crypto.randomUUID(), title: '' }]);
	let saving = $state(false);
	let isReordering = $state(false);
	let sessionDurationDrafts = $state<Record<string, string>>({});

	$effect(() => {
		if (!dbReady.current || !adventureId) return;

		let cancelled = false;

		void (async () => {
			const initialParts = getPartsForAdventure(adventureId);
			displayParts = initialParts;
			sessionDurationDrafts = Object.fromEntries(
				initialParts.map((part) => [part.part_id, part.session_duration ?? ''])
			);

			await syncAdventurePartOrderWithDatabase(adventureId);
			if (cancelled) return;

			const syncedParts = getPartsForAdventure(adventureId);
			displayParts = syncedParts;
			sessionDurationDrafts = Object.fromEntries(
				syncedParts.map((part) => [part.part_id, part.session_duration ?? ''])
			);
		})();

		return () => {
			cancelled = true;
		};
	});

	function assignPartOrder(items: Part[]): Part[] {
		return items.map((part, index) => ({ ...part, sort_order: index + 1 }));
	}

	function reorderParts(items: Part[], fromIndex: number, toIndex: number): Part[] {
		if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;

		const next = [...items];
		const [moved] = next.splice(fromIndex, 1);
		if (!moved) return items;

		next.splice(toIndex, 0, moved);
		return assignPartOrder(next);
	}

	async function commitParts(next: Part[]) {
		saving = true;

		try {
			const normalized = next.map((part) => ({
				...part,
				session_duration: part.session_duration?.trim() || null
			}));
			await persistAdventureParts(adventureId, normalized);
			await touchCampaign(workspace.currentUserId, campaignId);
			displayParts = [...normalized];
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
		const part = displayParts.find((entry) => entry.part_id === partId);
		if (!part || (part.session_duration ?? null) === normalized) return;

		const next = displayParts.map((entry) =>
			entry.part_id === partId ? { ...entry, session_duration: normalized } : entry
		);
		await commitParts(next);
	}

	function movePartOverTarget(targetPartId: string) {
		if (!draggedPartId || draggedPartId === targetPartId) return;

		const fromIndex = displayParts.findIndex((part) => part.part_id === draggedPartId);
		const toIndex = displayParts.findIndex((part) => part.part_id === targetPartId);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

		displayParts = reorderParts(displayParts, fromIndex, toIndex);
	}

	function handleWindowPointerMove(event: PointerEvent) {
		if (!draggedPartId) return;

		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest('[data-part-id]');
		const targetPartId = target?.getAttribute('data-part-id');
		if (targetPartId) {
			movePartOverTarget(targetPartId);
		}
	}

	async function finishReorder() {
		if (!draggedPartId || isReordering) return;

		const nextParts = displayParts;
		const orderChanged = nextParts.map((part) => part.part_id).join('\n') !== dragOrderSnapshot;

		draggedPartId = null;
		dragOrderSnapshot = '';
		window.removeEventListener('pointermove', handleWindowPointerMove);
		window.removeEventListener('pointerup', handleWindowPointerUp);
		window.removeEventListener('pointercancel', handleWindowPointerUp);

		if (!orderChanged) return;

		isReordering = true;
		try {
			await commitParts(nextParts);
		} finally {
			isReordering = false;
		}
	}

	function handleWindowPointerUp() {
		void finishReorder();
	}

	function handleHandlePointerDown(partId: string, event: PointerEvent) {
		if (event.button !== 0) return;

		event.preventDefault();
		draggedPartId = partId;
		dragOrderSnapshot = displayParts.map((part) => part.part_id).join('\n');
		window.addEventListener('pointermove', handleWindowPointerMove);
		window.addEventListener('pointerup', handleWindowPointerUp);
		window.addEventListener('pointercancel', handleWindowPointerUp);
	}

	function addPartLine() {
		partLines = [...partLines, { id: crypto.randomUUID(), title: '' }];
	}

	function removePartLine(lineId: string) {
		partLines = partLines.filter((line) => line.id !== lineId);
		if (partLines.length === 0) {
			partLines = [{ id: crypto.randomUUID(), title: '' }];
		}
	}

	async function handlePartKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		addPartLine();
		await tick();

		const inputs = document.querySelectorAll<HTMLInputElement>('.part-line input');
		inputs[inputs.length - 1]?.focus();
	}

	async function saveNewParts(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const titles = partLines.map((line) => line.title.trim()).filter(Boolean);
		if (titles.length === 0) return;

		const newParts: Part[] = titles.map((title, index) => ({
			part_id: `part-${crypto.randomUUID()}`,
			adventure_id: adventureId,
			title,
			summary: null,
			session_duration: null,
			sort_order: displayParts.length + index + 1
		}));

		await commitParts(assignPartOrder([...displayParts, ...newParts]));
		partLines = [{ id: crypto.randomUUID(), title: '' }];
	}
</script>

<svelte:head>
	<title>{adventure?.name ?? 'Adventure'} · DM Deputy</title>
</svelte:head>

{#if dbReady.current && (!campaign || !adventure)}
	<section class="page-stack">
		<h1>Adventure not found</h1>
		<Button.Root href={resolve('/')}>Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack">
		<nav aria-label="Back to campaign">
			<Button.Root href={resolve(`/campaigns/${campaignId}`)}>←</Button.Root>
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
			{#if displayParts.length === 0}
				<h2>No parts! Add below</h2>
			{:else}
				<h2>Parts</h2>
				<p class="hint">Drag to reorder.</p>

				<ul class="part-list list-plain">
					{#each displayParts as part (part.part_id)}
						<li
							class="part-list-item"
							class:is-dragging={draggedPartId === part.part_id}
							data-part-id={part.part_id}
						>
							<span class="part-order">{part.sort_order}</span>
							<div class="part-list-main">
								<a
									class="part-list-link"
									href={resolve(
										`/campaigns/${campaignId}/adventures/${adventureId}/parts/${part.part_id}`
									)}
								>
									<h3>{part.title}</h3>
								</a>
								<div class="part-session-field">
									<Label.Root for="session-{part.part_id}">Session time</Label.Root>
									<textarea
										id="session-{part.part_id}"
										bind:value={sessionDurationDrafts[part.part_id]}
										placeholder="e.g. 3 hours, or two sessions in Jan"
										rows={2}
										onblur={() => savePartSessionDuration(part.part_id)}
									></textarea>
								</div>
							</div>
							<span
								class="part-handle"
								role="button"
								tabindex="0"
								aria-label="Drag to reorder"
								onpointerdown={(event) => handleHandlePointerDown(part.part_id, event)}
							>
								⠿
							</span>
						</li>
					{/each}
				</ul>
			{/if}

			<form class="parts-form" onsubmit={saveNewParts}>
				<div class="field">
					<div class="campaign-header campaign-header--centered">
						<Label.Root>{displayParts.length === 0 ? 'Parts' : 'Add parts'}</Label.Root>
						<OcrScanButton />
					</div>
					<p class="hint">Enter each part title on its own line. Press Enter to add another.</p>
					<ul class="part-lines list-plain">
						{#each partLines as line, index (line.id)}
							<li class="part-line">
								<input
									bind:value={line.title}
									placeholder="Part title"
									aria-label="Part title"
									onkeydown={handlePartKeydown}
								/>
								{#if partLines.length > 1 || line.title.trim()}
									<Button.Root
										type="button"
										data-variant="icon"
										onclick={() => removePartLine(line.id)}
										aria-label="Remove part line"
									>
										−
									</Button.Root>
								{/if}
								{#if index === partLines.length - 1}
									<Button.Root
										type="button"
										data-variant="icon"
										onclick={addPartLine}
										aria-label="Add part line"
									>
										+
									</Button.Root>
								{/if}
							</li>
						{/each}
					</ul>
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

	.part-list-main {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 0.65rem;
	}

	.part-session-field {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}

	.part-session-field textarea {
		width: 100%;
		min-height: 3.5rem;
		resize: vertical;
		line-height: 1.45;
	}
</style>
