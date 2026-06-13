<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Label } from 'bits-ui';
	import CampaignSettingsModal from '$lib/components/CampaignSettingsModal.svelte';
	import { getAdventureById, getCampaignById, getPartsForAdventure } from '$lib/data';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { Part } from '$lib/types/schema';

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');

	const isOnboardingAdventure = $derived(workspace.createdAdventureId === adventureId);

	const campaign = $derived(
		isOnboardingAdventure
			? {
					campaign_id: campaignId,
					campaign_name: workspace.campaignDraft.campaign_name,
					description: workspace.campaignDraft.description,
					game_schema: workspace.campaignDraft.game_schema,
					theme: 'default' as const
				}
			: getCampaignById(campaignId)
	);

	const adventure = $derived(
		isOnboardingAdventure
			? {
					adventure_id: adventureId,
					name: workspace.adventureDraft.name,
					overview: workspace.adventureDraft.overview,
					adventure_hook: workspace.adventureDraft.adventure_hook,
					can_promote_to_campaign: workspace.adventureDraft.can_promote_to_campaign
				}
			: getAdventureById(adventureId)
	);

	let parts = $state<Part[]>(
		workspace.createdAdventureId === (page.params.adventureId ?? '')
			? workspace.onboardingParts
			: getPartsForAdventure(page.params.adventureId ?? '')
	);

	let draggedIndex = $state<number | null>(null);
	let showAddForm = $state(false);
	let newTitle = $state('');
	let newSummary = $state('');

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

	function setParts(next: Part[]) {
		parts = next;
		if (isOnboardingAdventure) {
			workspace.onboardingParts = next;
		}
	}

	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		setParts(reorderParts(parts, draggedIndex, index));
		draggedIndex = index;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	function addPart() {
		const title = newTitle.trim();
		if (!title) return;

		const nextPart: Part = {
			part_id: `part-${crypto.randomUUID()}`,
			adventure_id: adventureId,
			title,
			summary: newSummary.trim() || null,
			session_estimate_min: 1,
			session_estimate_max: 1,
			sort_order: parts.length + 1
		};

		setParts(assignPartOrder([...parts, nextPart]));
		newTitle = '';
		newSummary = '';
		showAddForm = false;
	}
</script>

<svelte:head>
	<title>{adventure?.name ?? 'Adventure'} · DM Deputy</title>
</svelte:head>

{#if !campaign || !adventure}
	<section class="page-stack">
		<h1>Adventure not found</h1>
		<Button.Root href={resolve('/')}>Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack">
		<div class="campaign-header campaign-header--centered">
			<p class="eyebrow">{campaign.campaign_name}</p>
			<CampaignSettingsModal
				campaignId={campaign.campaign_id}
				campaignName={campaign.campaign_name}
			/>
		</div>
		<h1>{adventure.name}</h1>

		{#if adventure.overview}
			<p>{adventure.overview}</p>
		{/if}

		{#if adventure.adventure_hook}
			<blockquote>{adventure.adventure_hook}</blockquote>
		{/if}

		<section class="parts-section">
			<header>
				<h2>Parts</h2>
				<p>Ordered story beats for this adventure. Drag to reorder.</p>
			</header>

			{#if parts.length === 0}
				<p>No parts yet. Add the first part to start outlining this adventure.</p>
			{:else}
				<ol class="list-plain">
					{#each parts as part, index (part.part_id)}
						<li
							class="part-item"
							class:is-dragging={draggedIndex === index}
							draggable="true"
							ondragstart={() => handleDragStart(index)}
							ondragover={(event) => handleDragOver(event, index)}
							ondragend={handleDragEnd}
						>
							<span class="part-order">{part.sort_order}</span>
							<div class="part-content">
								<h3>{part.title}</h3>
								{#if part.summary}
									<p>{part.summary}</p>
								{/if}
							</div>
							<span class="part-handle" aria-hidden="true">⠿</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if showAddForm}
				<form
					class="panel-form"
					onsubmit={(event) => {
						event.preventDefault();
						addPart();
					}}
				>
					<div class="field">
						<Label.Root for="part_title">Title</Label.Root>
						<input id="part_title" bind:value={newTitle} required placeholder="Part title" />
					</div>
					<div class="field">
						<Label.Root for="part_summary">Description</Label.Root>
						<textarea
							id="part_summary"
							bind:value={newSummary}
							rows="3"
							placeholder="What happens in this part?"
						></textarea>
					</div>
					<div class="actions-row actions-row--tight">
						<Button.Root type="submit">Save part</Button.Root>
						<Button.Root type="button" onclick={() => (showAddForm = false)}>Cancel</Button.Root>
					</div>
				</form>
			{:else}
				<Button.Root type="button" onclick={() => (showAddForm = true)}>Add a part</Button.Root>
			{/if}
		</section>

		<Button.Root href={resolve('/')}>Done for now</Button.Root>
	</section>
{/if}
