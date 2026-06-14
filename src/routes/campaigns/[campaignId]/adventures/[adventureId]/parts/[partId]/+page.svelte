<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import CreateStoryNodeModal from '$lib/components/part/CreateStoryNodeModal.svelte';
	import PartStoryCanvas from '$lib/components/part/PartStoryCanvas.svelte';
	import { STORY_NODE_SIZE } from '$lib/components/part/StoryNode.svelte';
	import { getPartById, getPartsForAdventure } from '$lib/data';
	import {
		defaultPositionForNewNode,
		getInitialStoryNodes,
		loadPartNodeLayout,
		savePartNodeLayout,
		savePartStoryNodes
	} from '$lib/data/part-story';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { StoryNode } from '$lib/types/schema';

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');
	const partId = $derived(page.params.partId ?? '');

	const isOnboardingAdventure = $derived(workspace.createdAdventureId === adventureId);

	const parts = $derived(
		isOnboardingAdventure ? workspace.onboardingParts : getPartsForAdventure(adventureId)
	);

	const part = $derived(parts.find((item) => item.part_id === partId) ?? getPartById(partId));

	let storyNodes = $state<StoryNode[]>([]);
	let showCreateModal = $state(false);

	$effect(() => {
		if (!partId) return;
		storyNodes = getInitialStoryNodes(partId);
	});

	function handleCreateNode(node: StoryNode) {
		if (!part) return;

		const existingLayout = loadPartNodeLayout(part.part_id) ?? {};
		const canvasWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
		const canvasHeight =
			typeof window !== 'undefined'
				? window.innerHeight * Math.max(2, storyNodes.length + 1.5)
				: 0;

		const position = defaultPositionForNewNode(
			existingLayout,
			canvasWidth,
			canvasHeight,
			STORY_NODE_SIZE
		);

		storyNodes = [...storyNodes, node];
		savePartNodeLayout(part.part_id, { ...existingLayout, [node.node_id]: position });
		savePartStoryNodes(part.part_id, storyNodes);
	}
</script>

<svelte:head>
	<title>{part?.title ?? 'Part'} · DM Deputy</title>
</svelte:head>

{#if !part}
	<section class="page-stack">
		<h1>Part not found</h1>
		<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}>
			Back to adventure
		</Button.Root>
	</section>
{:else}
	<div>
		<header>
			<h1>{part.title}</h1>
		</header>

		<nav aria-label="Back to adventure">
			<Button.Root href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}>←</Button.Root>
		</nav>

		<nav aria-label="Add story node">
			<Button.Root type="button" onclick={() => (showCreateModal = true)}>+</Button.Root>
		</nav>

		<CreateStoryNodeModal bind:open={showCreateModal} onCreate={handleCreateNode} />

		<PartStoryCanvas partId={part.part_id} nodes={storyNodes} />
	</div>
{/if}

<style>
	div {
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		margin-right: calc(50% - 50vw);
	}

	header {
		position: sticky;
		top: 0;
		z-index: 3;
		padding: var(--space-page) 4.5rem var(--space-page) 1.5rem;
		text-align: center;
		background: color-mix(in srgb, var(--color-bg) 90%, transparent);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
	}

	h1 {
		margin: 0;
		font-size: clamp(1.2rem, 3.8vw, 1.65rem);
	}

	nav {
		position: fixed;
		top: 5.25rem;
		z-index: 4;
	}

	nav:first-of-type {
		left: var(--space-page);
	}

	nav:last-of-type {
		right: var(--space-page);
	}

	nav :global([data-button-root]) {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border-radius: 999px;
		box-shadow: 0 4px 14px var(--color-shadow);
	}

	nav:last-of-type :global([data-button-root]) {
		font-size: 1.35rem;
		line-height: 1;
	}
</style>
