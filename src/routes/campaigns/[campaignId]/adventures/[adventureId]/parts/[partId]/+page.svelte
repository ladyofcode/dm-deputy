<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import CreateStoryNodeModal from '$lib/components/part/CreateStoryNodeModal.svelte';
	import EditStoryNodesModal from '$lib/components/part/EditStoryNodesModal.svelte';
	import AwardEncounterXpModal from '$lib/components/part/AwardEncounterXpModal.svelte';
	import PartNpcViewerModal from '$lib/components/part/PartNpcViewerModal.svelte';
	import PartPageToolbar from '$lib/components/part/PartPageToolbar.svelte';
	import PartStoryCanvas from '$lib/components/part/PartStoryCanvas.svelte';
	import StoryNodeArmsModal from '$lib/components/part/StoryNodeArmsModal.svelte';
	import StoryNodesEmptyForm from '$lib/components/part/StoryNodesEmptyForm.svelte';
	import { createPartPageState } from '$lib/stores/part-page.svelte';
	import { database } from '$lib/stores/database.svelte';

	const STORY_CONTENT_FADE = { duration: 180 };

	const campaignId = $derived(page.params.campaignId ?? '');
	const adventureId = $derived(page.params.adventureId ?? '');
	const partId = $derived(page.params.partId ?? '');

	const partPage = createPartPageState(() => ({ campaignId, adventureId, partId }));
</script>

<svelte:head>
	<title>{partPage.part?.title ?? 'Part'} · DM Deputy</title>
</svelte:head>

{#if database.isReady && !partPage.part}
	<section class="page-stack">
		<h1>Part not found</h1>
		<Button.Root
			href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}
			data-variant="plain"
		>
			Back to adventure
		</Button.Root>
	</section>
{:else}
	<div class="part-page">
		<nav class="part-page-back" aria-label="Back to adventure">
			<Button.Root
				href={resolve(`/campaigns/${campaignId}/adventures/${adventureId}`)}
				data-variant="plain">←</Button.Root
			>
		</nav>

		{#if partPage.part && partPage.adventure}
			<PartPageToolbar
				{campaignId}
				{adventureId}
				adventureName={partPage.adventure.name}
				partId={partPage.part.part_id}
				partTitle={partPage.part.title}
				storyLoaded={partPage.storyLoaded}
				hasStoryNodes={partPage.hasStoryNodes}
				onEditNodes={() => (partPage.showEditModal = true)}
				onAddNode={() => (partPage.showCreateModal = true)}
				onAwardXp={partPage.openAwardXpFromMenu}
				onViewNpcs={() => (partPage.showNpcViewerModal = true)}
			/>
		{/if}

		{#if partPage.storyLoaded && partPage.hasStoryNodes}
			<CreateStoryNodeModal
				bind:open={partPage.showCreateModal}
				nodes={partPage.storyNodes}
				onCreate={partPage.handleCreateNode}
			/>
			<EditStoryNodesModal
				bind:open={partPage.showEditModal}
				nodes={partPage.storyNodes}
				onSave={partPage.handleSaveEditedNodes}
			/>

			<div class="story-canvas-shell" in:fade={STORY_CONTENT_FADE}>
				<PartStoryCanvas
					{partId}
					nodes={partPage.storyNodes}
					storyItems={partPage.storyItems}
					onActivateNode={partPage.handleActivateNode}
					onManageNodeArms={partPage.openArmsModal}
					onToggleNodeComplete={partPage.handleToggleNodeComplete}
					onAssignRewardXp={partPage.openAssignRewardXp}
					xpAwardedNodeIds={partPage.xpAwardedNodeIds}
					onStoryItemUpdate={partPage.handleStoryItemUpdate}
				/>
			</div>
		{:else if partPage.storyLoaded}
			<div in:fade={STORY_CONTENT_FADE}>
				<StoryNodesEmptyForm onSave={partPage.handleSaveEmptyForm} />
			</div>
		{/if}

		{#if partPage.campaign}
			<PartNpcViewerModal
				bind:open={partPage.showNpcViewerModal}
				campaignId={partPage.campaign.campaign_id}
				storyNodes={partPage.storyNodes}
				storyItems={partPage.storyItems}
				partNpcs={partPage.partNpcs}
				onAddPartNpc={partPage.handleAddPartNpc}
				onRemovePartNpc={partPage.handleRemovePartNpc}
				onSaveNodeArms={partPage.handleSaveNodeArms}
			/>
			<StoryNodeArmsModal
				bind:open={partPage.showArmsModal}
				nodeId={partPage.armsModalNodeId}
				nodeTitle={partPage.armsModalNode?.title ?? ''}
				campaignId={partPage.campaign.campaign_id}
				existingItems={partPage.storyItems}
				onSave={partPage.handleSaveNodeArms}
			/>
			<AwardEncounterXpModal
				bind:open={partPage.showAwardXpModal}
				mode={partPage.awardXpMode}
				node={partPage.awardXpNode}
				rewardXpTotal={partPage.awardXpRewardTotal}
				awardedNodeIds={partPage.xpAwardedNodeIds}
				campaignId={partPage.campaign.campaign_id}
				gameSchema={partPage.campaign.game_schema}
				{adventureId}
				{partId}
				adventureName={partPage.adventure?.name}
				partName={partPage.part?.title}
				onAwarded={partPage.handleXpAwarded}
			/>
		{/if}
	</div>
{/if}

<style>
	.part-page {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.story-canvas-shell {
		flex: 1;
		min-height: 0;
		width: 100%;
	}

	.part-page-back {
		position: absolute;
		top: calc(var(--space-page) + env(safe-area-inset-top, 0px));
		left: calc(var(--space-page) + env(safe-area-inset-left, 0px));
		z-index: 4;
	}
</style>
