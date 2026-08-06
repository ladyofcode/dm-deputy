<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Dialog, Label } from 'bits-ui';
	import ConfirmDeleteDialog from '$lib/components/shared/ConfirmDeleteDialog.svelte';
	import { getPartsForAdventure } from '$lib/data';
	import { persistAdventureParts, touchCampaign } from '$lib/data/writes';
	import { workspace } from '$lib/stores/workspace.svelte';

	type Props = {
		campaignId: string;
		adventureId: string;
		partId: string;
		partTitle: string;
		adventureName: string;
		open?: boolean;
	};

	let {
		campaignId,
		adventureId,
		partId,
		partTitle,
		adventureName,
		open = $bindable(false)
	}: Props = $props();

	let title = $state('');
	let saving = $state(false);
	let deleting = $state(false);
	let showDeleteConfirm = $state(false);
	let error = $state<string | null>(null);
	let formKey = $state('');

	$effect(() => {
		if (!open) {
			formKey = '';
			return;
		}

		const nextKey = `${partId}:${partTitle}`;
		if (formKey === nextKey) return;

		formKey = nextKey;
		title = partTitle;
		error = null;
	});

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || deleting) return;

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		saving = true;
		error = null;

		try {
			const nextParts = getPartsForAdventure(adventureId).map((part) =>
				part.part_id === partId ? { ...part, title: trimmedTitle } : part
			);
			await persistAdventureParts(adventureId, nextParts);
			await touchCampaign(workspace.currentUserId, campaignId);
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save part';
		} finally {
			saving = false;
		}
	}

	async function confirmDeletePart() {
		if (deleting) return;

		deleting = true;
		error = null;

		try {
			const nextParts = getPartsForAdventure(adventureId).filter((part) => part.part_id !== partId);
			await persistAdventureParts(adventureId, nextParts);
			await touchCampaign(workspace.currentUserId, campaignId);
			showDeleteConfirm = false;
			open = false;
			await goto(resolve(`/campaigns/${campaignId}/adventures/${adventureId}`));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not delete part';
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger data-variant="icon" aria-label="Part settings">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="3" />
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
			/>
		</svg>
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content>
			<Dialog.Title>Part settings</Dialog.Title>
			<Dialog.Description>
				Edit this part in <strong>{adventureName}</strong>.
			</Dialog.Description>

			<form class="settings-form" onsubmit={handleSave}>
				<div class="field">
					<Label.Root for="part_settings_title">Part title</Label.Root>
					<input
						id="part_settings_title"
						bind:value={title}
						required
						disabled={saving || deleting}
						placeholder="Part title"
					/>
				</div>

				{#if error}
					<p class="hint error">{error}</p>
				{/if}

				<div class="dialog-footer">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button.Root {...props} type="button" disabled={saving || deleting}>Cancel</Button.Root>
						{/snippet}
					</Dialog.Close>
					<Button.Root type="submit" data-variant="primary" disabled={saving || deleting}>
						{saving ? 'Saving…' : 'Save'}
					</Button.Root>
				</div>
			</form>

			<section class="danger-zone" aria-labelledby="part-delete-heading">
				<h3 id="part-delete-heading">Danger zone</h3>
				<p class="hint">
					Permanently remove <strong>{partTitle}</strong> from this adventure. Story nodes and items
					for this part will also be deleted.
				</p>
				<Button.Root
					type="button"
					class="delete-button"
					disabled={saving || deleting}
					onclick={() => (showDeleteConfirm = true)}
				>
					Delete part
				</Button.Root>
			</section>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<ConfirmDeleteDialog
	bind:open={showDeleteConfirm}
	title="Delete part?"
	confirmLabel="Yes, delete part"
	{deleting}
	onConfirm={confirmDeletePart}
>
	{#snippet description()}
		This permanently deletes <strong>{partTitle}</strong> and all of its story nodes and items.
	{/snippet}
</ConfirmDeleteDialog>

<style>
	.settings-form {
		display: grid;
		gap: 0.75rem;
	}

	.danger-zone {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-border);
		display: grid;
		gap: 0.75rem;
	}

	.danger-zone h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 600;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}

	:global([data-button-root].delete-button) {
		border-color: #b42318;
		color: #b42318;
	}

	:global([data-button-root].delete-button:hover:not(:disabled)) {
		background: #fef3f2;
		border-color: #912018;
		color: #912018;
	}
</style>
