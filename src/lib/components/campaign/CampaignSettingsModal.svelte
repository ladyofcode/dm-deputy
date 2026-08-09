<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import EntitySettingsDialog from '$lib/components/shared/EntitySettingsDialog.svelte';
	import ConfirmDeleteDialog from '$lib/components/shared/ConfirmDeleteDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import { deleteCampaign, persistCampaignDetails } from '$lib/data/writes';
	import { formatErrorMessage } from '$lib/domain/errors';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';

	type Props = {
		campaignId: string;
		campaignName: string;
		nickname?: string;
		description?: string;
		open?: boolean;
	};

	let {
		campaignId,
		campaignName,
		nickname = '',
		description = '',
		open = $bindable(false)
	}: Props = $props();

	let name = $state('');
	let campaignNickname = $state('');
	let details = $state('');
	let saving = $state(false);
	let deleting = $state(false);
	let showDeleteConfirm = $state(false);
	let error = $state<string | null>(null);

	useDialogFormReset(
		() => open,
		() => campaignId,
		() => {
			name = campaignName;
			campaignNickname = nickname;
			details = description;
			error = null;
		}
	);

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || deleting) return;

		saving = true;
		error = null;

		try {
			await persistCampaignDetails(campaignId, {
				campaign_name: name,
				nickname: campaignNickname,
				description: details
			});
			open = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save campaign');
		} finally {
			saving = false;
		}
	}

	async function confirmDeleteCampaign() {
		if (deleting) return;

		deleting = true;
		error = null;

		try {
			await deleteCampaign(campaignId);
			showDeleteConfirm = false;
			open = false;
			await goto(resolve('/'));
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not delete campaign');
		} finally {
			deleting = false;
		}
	}
</script>

<EntitySettingsDialog
	bind:open
	title="Campaign settings"
	description="Edit the campaign name, nickname, and description."
	triggerAriaLabel="Campaign settings"
>
	{#snippet form()}
		<form class="entity-settings-form" onsubmit={handleSave}>
			<div class="field">
				<Label.Root for="campaign_settings_name">Campaign name</Label.Root>
				<input
					id="campaign_settings_name"
					bind:value={name}
					required
					disabled={saving || deleting}
					placeholder="Campaign name"
				/>
			</div>

			<div class="field">
				<Label.Root for="campaign_settings_nickname">Nickname</Label.Root>
				<input
					id="campaign_settings_nickname"
					bind:value={campaignNickname}
					disabled={saving || deleting}
					placeholder="Short name for navigation (optional)"
				/>
				<p class="hint">Shown in menu</p>
			</div>

			<div class="field">
				<Label.Root for="campaign_settings_description">Description</Label.Root>
				<textarea
					id="campaign_settings_description"
					bind:value={details}
					rows="4"
					disabled={saving || deleting}
					placeholder="Optional description"
				></textarea>
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
		<section class="danger-zone" aria-labelledby="campaign-delete-heading">
			<h3 id="campaign-delete-heading">Danger zone</h3>
			<p class="hint">
				Permanently remove <strong>{campaignName}</strong> from your campaign list. Adventures, characters,
				maps, and story data for this campaign will no longer be accessible.
			</p>
			<Button.Root
				type="button"
				class="delete-button"
				disabled={saving || deleting}
				onclick={() => (showDeleteConfirm = true)}
			>
				Delete campaign
			</Button.Root>
		</section>
	{/snippet}
</EntitySettingsDialog>

<ConfirmDeleteDialog
	bind:open={showDeleteConfirm}
	title="Delete campaign?"
	confirmLabel="Yes, delete campaign"
	{deleting}
	onConfirm={confirmDeleteCampaign}
>
	{#snippet description()}
		This permanently deletes <strong>{campaignName}</strong> and removes it from your campaign list.
	{/snippet}
</ConfirmDeleteDialog>
