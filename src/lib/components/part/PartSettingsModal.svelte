<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import EntitySettingsDialog from '$lib/components/shared/EntitySettingsDialog.svelte';
	import ConfirmDeleteDialog from '$lib/components/shared/ConfirmDeleteDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import { getPartsForAdventure } from '$lib/data';
	import { persistAdventureParts, touchCampaign } from '$lib/data/writes';
	import { formatErrorMessage } from '$lib/domain/errors';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';
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

	useDialogFormReset(
		() => open,
		() => `${partId}:${partTitle}`,
		() => {
			title = partTitle;
			error = null;
		}
	);

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
			error = formatErrorMessage(cause, 'Could not save part');
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
			error = formatErrorMessage(cause, 'Could not delete part');
		} finally {
			deleting = false;
		}
	}
</script>

<EntitySettingsDialog bind:open title="Part settings" triggerAriaLabel="Part settings">
	{#snippet descriptionContent()}
		Edit this part in <strong>{adventureName}</strong>.
	{/snippet}
	{#snippet form()}
		<form class="entity-settings-form" onsubmit={handleSave}>
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

			<DialogFormFooter
				submitLabel={saving ? 'Saving…' : 'Save'}
				pending={saving}
				disabled={deleting}
			/>
		</form>
	{/snippet}
	{#snippet dangerZone()}
		<section class="danger-zone" aria-labelledby="part-delete-heading">
			<h3 id="part-delete-heading">Danger zone</h3>
			<p class="hint">
				Permanently remove <strong>{partTitle}</strong> from this adventure. Story nodes and items for
				this part will also be deleted.
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
	{/snippet}
</EntitySettingsDialog>

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
