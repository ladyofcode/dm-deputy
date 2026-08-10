<script lang="ts">
	import { Button } from 'bits-ui';
	import AddressCardIcon from '$lib/components/icons/AddressCardIcon.svelte';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import EditIcon from '$lib/components/icons/EditIcon.svelte';
	import OcrScanButton from '$lib/components/part/OcrScanButton.svelte';
	import PartSettingsModal from '$lib/components/part/PartSettingsModal.svelte';

	type Props = {
		campaignId: string;
		adventureId: string;
		adventureName: string;
		partId: string;
		partTitle: string;
		storyLoaded: boolean;
		hasStoryNodes: boolean;
		onEditNodes: () => void;
		onAddNode: () => void;
		onAwardXp: () => void;
		onViewNpcs: () => void;
	};

	let {
		campaignId,
		adventureId,
		adventureName,
		partId,
		partTitle,
		storyLoaded,
		hasStoryNodes,
		onEditNodes,
		onAddNode,
		onAwardXp,
		onViewNpcs
	}: Props = $props();
</script>

<nav aria-label="Part actions" class="part-actions">
	<PartSettingsModal {campaignId} {adventureId} {partId} {partTitle} {adventureName} />

	{#if storyLoaded && hasStoryNodes}
		<Button.Root
			type="button"
			data-variant="icon"
			aria-label="Edit story nodes"
			onclick={onEditNodes}
		>
			<EditIcon />
		</Button.Root>
		<Button.Root type="button" data-action="add" aria-label="Add story node" onclick={onAddNode}>
			<AddIcon />
		</Button.Root>
		<Button.Root type="button" data-variant="icon" aria-label="Award XP" onclick={onAwardXp}>
			XP
		</Button.Root>
	{/if}
	{#if storyLoaded}
		<Button.Root type="button" data-variant="icon" aria-label="View NPCs" onclick={onViewNpcs}>
			<AddressCardIcon size={20} />
		</Button.Root>
	{/if}
	{#if storyLoaded && hasStoryNodes}
		<OcrScanButton />
	{/if}
</nav>

<style>
	.part-actions {
		position: absolute;
		top: calc(var(--space-page) + env(safe-area-inset-top, 0px));
		right: calc(var(--space-page) + env(safe-area-inset-right, 0px));
		z-index: 4;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.part-actions :global([data-button-root]),
	.part-actions :global([data-dialog-trigger][data-variant='icon']) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 2.75rem;
		min-block-size: 2.75rem;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border-radius: 999px;
		box-shadow: 0 4px 14px var(--color-shadow);
	}

	.part-actions :global([data-button-root] svg),
	.part-actions :global([data-dialog-trigger][data-variant='icon'] svg) {
		display: block;
		flex-shrink: 0;
	}
</style>
