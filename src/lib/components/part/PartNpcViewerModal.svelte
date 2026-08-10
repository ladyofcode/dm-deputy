<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Dialog } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import MediaThumb from '$lib/components/shared/MediaThumb.svelte';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import ChevronLeftIcon from '$lib/components/icons/ChevronLeftIcon.svelte';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import PartAddNpcModal from '$lib/components/part/PartAddNpcModal.svelte';
	import {
		getPartViewerNpcs,
		formatNpcCardSubtitle,
		getNpcFirstName,
		isUnassignedPartNpc
	} from '$lib/data/part-npcs';
	import { createCharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { resolveCharacterHref } from '$lib/navigation/hrefs';
	import type { PartNpc, StoryItem, StoryNode } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		campaignId: string;
		storyNodes: StoryNode[];
		storyItems: StoryItem[];
		partNpcs: PartNpc[];
		onAddPartNpc?: (characterId: string) => void | Promise<void>;
		onRemovePartNpc?: (characterId: string) => void | Promise<void>;
		onSaveNodeArms?: (nodeId: string, items: StoryItem[]) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		campaignId,
		storyNodes,
		storyItems,
		partNpcs,
		onAddPartNpc,
		onRemovePartNpc,
		onSaveNodeArms
	}: Props = $props();

	const sheet = createCharacterSheetStore();

	let selectedCharacterId = $state<string | null>(null);
	let showAddNpcModal = $state(false);
	let removingNpc = $state(false);

	const viewerNpcs = $derived(getPartViewerNpcs(storyItems, partNpcs));
	const selectedCharacter = $derived(
		selectedCharacterId
			? (viewerNpcs.find((npc) => npc.character_id === selectedCharacterId) ?? null)
			: null
	);
	const selectedIsUnassigned = $derived(
		selectedCharacterId ? isUnassignedPartNpc(partNpcs, selectedCharacterId) : false
	);

	$effect(() => {
		if (!open) {
			selectedCharacterId = null;
			showAddNpcModal = false;
			sheet.error = null;
		}
	});

	$effect(() => {
		if (!open || !selectedCharacter) {
			sheet.loading = false;
			return;
		}

		let cancelled = false;
		sheet.loading = true;
		sheet.error = null;

		void sheet
			.loadFromCharacter(selectedCharacter)
			.then(() => {
				if (cancelled || !selectedCharacter) return;
				sheet.kind = selectedCharacter.kind === 'npc_foe' ? 'npc_foe' : 'npc_general';
			})
			.catch((cause) => {
				if (cancelled) return;
				sheet.error = formatErrorMessage(cause, 'Could not load NPC');
			});

		return () => {
			cancelled = true;
		};
	});

	function openDetail(characterId: string) {
		selectedCharacterId = characterId;
	}

	function closeDetail() {
		selectedCharacterId = null;
	}

	async function handleRemoveUnassigned() {
		if (!selectedCharacterId || !selectedIsUnassigned || removingNpc) return;

		removingNpc = true;

		try {
			await onRemovePartNpc?.(selectedCharacterId);
			closeDetail();
		} catch (cause) {
			sheet.error = formatErrorMessage(cause, 'Could not remove NPC');
		} finally {
			removingNpc = false;
		}
	}
</script>

<AppDialog
	bind:open
	variant="viewer"
	overlayClass="npc-viewer-overlay"
	contentClass="npc-viewer-content"
	ariaLabel="NPC viewer"
>
	<header class="npc-viewer-header">
		<div class="npc-viewer-header-start">
			{#if selectedCharacter}
				<Button.Root
					type="button"
					data-variant="plain"
					class="npc-viewer-tool-btn"
					onclick={closeDetail}
					aria-label="Back to NPC list"
				>
					<ChevronLeftIcon />
				</Button.Root>
			{/if}
			<Dialog.Title>{selectedCharacter?.display_name ?? 'NPCs'}</Dialog.Title>
		</div>
		<div class="npc-viewer-actions">
			{#if selectedCharacter}
				<Button.Root
					href={resolveCharacterHref(selectedCharacter.character_id)}
					class="npc-viewer-edit-btn"
					data-variant="ghost"
				>
					Edit NPC in Library
				</Button.Root>
			{/if}
			<Dialog.Close class="npc-viewer-tool-btn" aria-label="Close NPC viewer">
				<CloseIcon />
			</Dialog.Close>
		</div>
	</header>

	<div class="npc-viewer-body">
		{#if selectedCharacter}
			{#if sheet.loading}
				<LoadingState message="Loading NPC…" />
			{:else if sheet.error}
				<p class="npc-viewer-status">{sheet.error}</p>
			{:else}
				<div class="npc-viewer-detail">
					{#if selectedIsUnassigned}
						<div class="npc-viewer-detail-actions">
							<p class="npc-viewer-unassigned-note">Unassigned to a story node</p>
							<RemoveIconButton
								variant="ghost"
								ariaLabel="Remove from part"
								busy={removingNpc}
								onclick={handleRemoveUnassigned}
							/>
						</div>
					{/if}
					<CharacterSheetForm
						{sheet}
						mode="npc"
						characterId={selectedCharacter.character_id}
						readOnly
					/>
				</div>
			{/if}
		{:else}
			<ul class="npc-viewer-grid" aria-label="NPCs in this part">
				{#each viewerNpcs as npc (npc.character_id)}
					{@const subtitle = formatNpcCardSubtitle(npc)}
					<li>
						<button
							type="button"
							class="npc-viewer-card"
							onclick={() => openDetail(npc.character_id)}
						>
							<MediaThumb variant="portrait" character={npc} class="npc-viewer-card-portrait" />
							<div class="npc-viewer-card-text">
								<div class="npc-viewer-card-names">
									<span class="npc-viewer-card-first-name">{getNpcFirstName(npc.display_name)}</span
									>
									{#if subtitle}
										<span class="npc-viewer-card-subtitle">{subtitle}</span>
									{/if}
								</div>
								<span class="npc-viewer-card-level">Lv {npc.level}</span>
							</div>
						</button>
					</li>
				{/each}
				<li>
					<button
						type="button"
						class="npc-viewer-add-card"
						onclick={() => (showAddNpcModal = true)}
					>
						<span class="npc-viewer-add-card-inner">
							<span class="npc-viewer-add-card-icon" aria-hidden="true"><AddIcon /></span>
							<span class="npc-viewer-add-card-label">Add NPC</span>
						</span>
					</button>
				</li>
			</ul>
		{/if}
	</div>
</AppDialog>

<PartAddNpcModal
	bind:open={showAddNpcModal}
	{campaignId}
	{storyNodes}
	{storyItems}
	{partNpcs}
	{onAddPartNpc}
	{onSaveNodeArms}
/>

<style>
	:global(.npc-viewer-overlay) {
		background: var(--color-viewer-overlay);
	}

	:global([data-dialog-content].npc-viewer-content) {
		display: grid;
		grid-template-rows: auto 1fr;
		width: 100vw;
		height: 100dvh;
		min-height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: var(--color-surface);
		overflow: hidden;
		overscroll-behavior: contain;
		gap: 0;
	}

	@media (--desktop) {
		:global([data-dialog-content].npc-viewer-content) {
			width: min(42rem, calc(100vw - 2rem));
			height: min(85dvh, calc(100dvh - 2rem));
			min-height: min(85dvh, calc(100dvh - 2rem));
			max-width: none;
			max-height: none;
			padding: 0;
			overflow: hidden;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			box-shadow: 0 18px 48px var(--color-shadow);
		}
	}

	.npc-viewer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		min-width: 0;
	}

	.npc-viewer-header-start {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.npc-viewer-header :global([data-dialog-title]) {
		margin: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1.05rem;
	}

	.npc-viewer-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.npc-viewer-actions :global([data-button-root].npc-viewer-edit-btn) {
		max-width: 9rem;
		padding: 0.35rem 0.55rem;
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.2;
		white-space: normal;
		text-align: center;
	}

	@media (--tablet) {
		.npc-viewer-actions :global([data-button-root].npc-viewer-edit-btn) {
			max-width: none;
			white-space: nowrap;
		}
	}

	.npc-viewer-actions :global([data-button-root].npc-viewer-tool-btn),
	.npc-viewer-header-start :global([data-button-root].npc-viewer-tool-btn),
	.npc-viewer-actions :global([data-dialog-close].npc-viewer-tool-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: inherit;
		font: inherit;
		font-weight: 600;
		line-height: 1;
		box-shadow: none;
		cursor: pointer;
	}

	.npc-viewer-actions :global([data-button-root].npc-viewer-tool-btn[data-active='true']) {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.npc-viewer-body {
		min-height: 0;
		overflow: auto;
		padding: 1rem;
		-webkit-overflow-scrolling: touch;
	}

	.npc-viewer-add-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		padding: 0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-muted);
		font: inherit;
		cursor: pointer;
		touch-action: manipulation;
	}

	.npc-viewer-add-card-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		aspect-ratio: 1;
		padding: 0.75rem;
		border: 2px dashed var(--color-border-strong);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
		text-align: center;
	}

	.npc-viewer-add-card-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.npc-viewer-add-card-icon :global(svg) {
		width: 2rem;
		height: 2rem;
	}

	.npc-viewer-add-card-label {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.15;
		color: inherit;
	}

	.npc-viewer-add-card:hover,
	.npc-viewer-add-card:focus-visible {
		color: var(--color-accent);
		outline: none;
	}

	.npc-viewer-add-card:hover .npc-viewer-add-card-inner,
	.npc-viewer-add-card:focus-visible .npc-viewer-add-card-inner {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}

	.npc-viewer-add-card:focus-visible {
		box-shadow: 0 0 0 2px var(--color-accent);
		border-radius: var(--radius-md);
	}

	.npc-viewer-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@media (--layout) {
		.npc-viewer-grid {
			grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
			gap: 1.25rem;
		}
	}

	.npc-viewer-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.65rem;
		width: 100%;
		padding: 0.5rem;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		touch-action: manipulation;
	}

	.npc-viewer-card:hover,
	.npc-viewer-card:focus-visible {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		outline: none;
	}

	.npc-viewer-card:focus-visible {
		box-shadow: 0 0 0 2px var(--color-accent);
	}

	.npc-viewer-card :global(.npc-viewer-card-portrait.media-thumb-portrait) {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
	}

	.npc-viewer-card :global(.npc-viewer-card-portrait .media-thumb-fallback) {
		font-size: clamp(2.5rem, 18vw, 4.5rem);
	}

	.npc-viewer-card-text {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		min-width: 0;
	}

	.npc-viewer-card-names {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.npc-viewer-card-first-name {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.npc-viewer-card-subtitle {
		font-size: 0.78rem;
		font-weight: 500;
		line-height: 1.2;
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}

	.npc-viewer-card-level {
		flex-shrink: 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
		line-height: 1.2;
		white-space: nowrap;
	}

	.npc-viewer-status {
		margin: 0;
		padding: 1.5rem 0.5rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.npc-viewer-detail {
		display: grid;
		gap: 0.75rem;
	}

	.npc-viewer-detail-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.npc-viewer-unassigned-note {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}
</style>
