<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Tooltip } from 'bits-ui';
	import FullAdventureRewardSection from '$lib/components/adventure/FullAdventureRewardSection.svelte';
	import StoryMapPreview from '$lib/components/part/StoryMapPreview.svelte';
	import { fromStore } from 'svelte/store';
	import { getAdventureById, getCampaignById, getCharacterById, getNpcsForCampaign, getPartsForAdventure } from '$lib/data';
	import { loadEncounterXpAwardsByEventIds } from '$lib/data/character-stats-persistence';
	import { getInitialStoryItems, getInitialStoryNodes } from '$lib/data/part-story';
	import {
		buildFullAdventurePartBlocks,
		buildNodeXpAwardLines,
		formatRewardMoney,
		groupXpAwardsByEventId,
		type NodeXpAwardLine
	} from '$lib/domain/full-adventure';
	import { ensurePartStoryInCache } from '$lib/db/cache';
	import { loadPartStory } from '$lib/db/client';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import { STORY_NODE_KIND_LABELS, type StoryItem } from '$lib/types/schema';

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
	const parts = $derived.by(() => {
		if (!dbReady.current) return [];
		return getPartsForAdventure(adventureId);
	});

	let storyLoaded = $state(false);
	let xpAwardsByNodeId = $state<Map<string, NodeXpAwardLine[]>>(new Map());

	$effect(() => {
		if (!dbReady.current || parts.length === 0) {
			storyLoaded = parts.length === 0;
			return;
		}

		let cancelled = false;

		void Promise.all(parts.map((part) => ensurePartStoryInCache(part.part_id, loadPartStory))).then(
			() => {
				if (!cancelled) {
					storyLoaded = true;
				}
			}
		);

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!storyLoaded || !dbReady.current) {
			xpAwardsByNodeId = new Map();
			return;
		}

		const nodeIds = parts.flatMap((part) =>
			getInitialStoryNodes(part.part_id).map((node) => node.node_id)
		);

		if (nodeIds.length === 0) {
			xpAwardsByNodeId = new Map();
			return;
		}

		let cancelled = false;

		void loadEncounterXpAwardsByEventIds(nodeIds).then((awards) => {
			if (cancelled) return;

			const grouped = groupXpAwardsByEventId(awards);
			const next = new Map<string, NodeXpAwardLine[]>();

			for (const [eventId, eventAwards] of grouped) {
				next.set(
					eventId,
					buildNodeXpAwardLines(eventAwards, (characterId) => {
						return getCharacterById(characterId)?.display_name ?? 'Unknown player';
					})
				);
			}

			xpAwardsByNodeId = next;
		});

		return () => {
			cancelled = true;
		};
	});

	const partBlocks = $derived.by(() => {
		if (!storyLoaded) return [];

		const nodesByPartId = new Map(
			parts.map((part) => [part.part_id, getInitialStoryNodes(part.part_id)])
		);
		const itemsByPartId = new Map(
			parts.map((part) => [part.part_id, getInitialStoryItems(part.part_id)])
		);

		return buildFullAdventurePartBlocks(parts, nodesByPartId, itemsByPartId);
	});

	const npcsById = $derived(
		dbReady.current ? new Map(getNpcsForCampaign(campaignId).map((npc) => [npc.character_id, npc])) : new Map()
	);

	function contextLabel(item: StoryItem): string {
		switch (item.kind) {
			case 'npc': {
				const npc = item.character_id ? npcsById.get(item.character_id) : undefined;
				return npc?.display_name ?? item.label;
			}
			case 'money':
				return formatRewardMoney(item) ?? item.label;
			default:
				return item.label;
		}
	}
</script>

<svelte:head>
	<title>{adventure?.name ?? 'Adventure'} · Full adventure · DM Deputy</title>
</svelte:head>

{#if dbReady.current && (!campaign || !adventure)}
	<section class="page-stack">
		<h1>Adventure not found</h1>
		<Button.Root href={resolve('/')}>Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack full-adventure-page">
		<Tooltip.Provider delayDuration={200}>
		<nav aria-label="Back to adventure">
			<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}>
				← Adventure
			</Button.Root>
		</nav>

		<div class="campaign-header campaign-header--centered">
			<div class="adventure-heading">
				<p class="eyebrow">{campaign?.campaign_name ?? ''}</p>
				<h1>{adventure?.name ?? ''}</h1>
				<p class="hint">Full adventure</p>
			</div>
		</div>

		{#if adventure?.overview}
			<p class="adventure-overview">{adventure.overview}</p>
		{/if}

		{#if adventure?.adventure_hook}
			<blockquote>{adventure.adventure_hook}</blockquote>
		{/if}

		{#if !storyLoaded}
			<p class="hint">Loading story…</p>
		{:else if partBlocks.length === 0}
			<p class="hint">No story nodes yet. Add parts and story nodes to build this view.</p>
		{:else}
			{#each partBlocks as block (block.part.part_id)}
				<section class="part-block">
					<h2>{block.part.title}</h2>
					{#if block.part.summary}
						<p class="part-summary">{block.part.summary}</p>
					{/if}

					{#each block.sections as section (section.node.node_id)}
						<article class="node-section">
							<header class="node-header">
								<p class="eyebrow">{STORY_NODE_KIND_LABELS[section.node.kind]}</p>
								<h3>{section.node.title}</h3>
							</header>

							<div class="node-narrative">
								{#if section.node.summary.trim()}
									<p class="node-summary">{section.node.summary}</p>
								{/if}

								{#each section.narrativeNotes as note (note.item_id)}
									{#if note.note_text?.trim()}
										<p class="node-note">{note.note_text}</p>
									{/if}
								{/each}

								{#if section.node.kind === 'encounter' && section.node.difficulty?.trim()}
									<p class="node-meta">Difficulty: {section.node.difficulty}</p>
								{/if}

								{#each section.contextItems as { item, kind } (item.item_id)}
									{#if kind === 'note' && item.note_text?.trim()}
										<p class="node-note">{item.note_text}</p>
									{:else if kind === 'item'}
										<p class="node-context">Item: {item.label}</p>
									{:else if kind === 'npc'}
										<p class="node-context">NPC: {contextLabel(item)}</p>
									{:else if kind === 'money'}
										<p class="node-context">Treasure: {contextLabel(item)}</p>
									{:else if kind === 'map' && item.map_id}
										<StoryMapPreview mapId={item.map_id} label={contextLabel(item)} />
									{/if}
								{/each}
							</div>

							<FullAdventureRewardSection
								{section}
								{campaignId}
								xpAwards={xpAwardsByNodeId.get(section.node.node_id) ?? []}
							/>
						</article>
					{/each}
				</section>
			{/each}
		{/if}
		</Tooltip.Provider>
	</section>
{/if}

<style>
	.adventure-heading h1 {
		margin: 0.15rem 0 0;
	}

	.adventure-overview {
		line-height: 1.65;
	}

	.part-block {
		display: grid;
		gap: 1.25rem;
	}

	.part-block:not(:first-of-type) {
		margin-top: 0.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.part-block h2 {
		margin-top: 0;
		margin-bottom: 0;
	}

	.part-summary {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.55;
	}

	.node-section {
		display: grid;
		gap: 0.5rem;
		padding: 1rem 0;
	}

	.node-header h3 {
		margin: 0.15rem 0 0;
		font-size: clamp(1.1rem, 2.5vw, 1.35rem);
	}

	.node-narrative {
		display: grid;
		gap: 0.75rem;
	}

	.node-summary,
	.node-note {
		margin: 0;
		line-height: 1.65;
		white-space: pre-wrap;
	}

	.node-note {
		color: var(--color-text-muted);
	}

	.node-meta,
	.node-context {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
</style>
