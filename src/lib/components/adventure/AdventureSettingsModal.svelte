<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import { getAdventureById } from '$lib/data';
	import {
		persistAdventurePromotion,
		persistAdventurePromoteSetting,
		persistAdventureShorthand,
		persistCampaignTheme
	} from '$lib/data/writes';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { campaignThemeOptions } from '$lib/themes/themes';
	import { getCampaignTheme } from '$lib/themes/resolve';
	import type { CampaignTheme } from '$lib/themes/types';

	type Props = {
		campaignId: string;
		campaignName: string;
		adventureId: string;
		adventureName: string;
		shorthand?: string;
		open?: boolean;
	};

	let {
		campaignId,
		campaignName,
		adventureId,
		adventureName,
		shorthand = '',
		open = $bindable(false)
	}: Props = $props();

	const adventure = $derived(getAdventureById(adventureId));
	const selectedTheme = $derived(getCampaignTheme(campaignId, preferences.campaignThemes));
	const canPromote = $derived(adventure?.can_promote_to_campaign ?? false);

	let adventureNickname = $state('');
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	let isSavingTheme = $state(false);
	let isSavingPromoteSetting = $state(false);
	let isPromoting = $state(false);
	let showEnableConfirm = $state(false);
	let enableConfirmValue = $state(true);
	let showPromoteDialog = $state(false);
	let copyMaps = $state(true);
	let copyNpcs = $state(true);
	let promoteError = $state<string | null>(null);

	useDialogFormReset(
		() => open,
		() => adventureId,
		() => {
			adventureNickname = shorthand;
			saveError = null;
		}
	);

	async function handleDone() {
		if (isSaving || isPromoting || isSavingPromoteSetting) return;

		if (adventureNickname === shorthand) {
			open = false;
			return;
		}

		isSaving = true;
		saveError = null;

		try {
			await persistAdventureShorthand(adventureId, adventureNickname);
			open = false;
		} catch (cause) {
			saveError = formatErrorMessage(cause, 'Could not save adventure settings');
		} finally {
			isSaving = false;
		}
	}

	async function handleThemeChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as CampaignTheme;
		preferences.setCampaignTheme(campaignId, value);

		isSavingTheme = true;
		try {
			await persistCampaignTheme(campaignId, value);
		} finally {
			isSavingTheme = false;
		}
	}

	function openEnableConfirm(enable: boolean) {
		enableConfirmValue = enable;
		showEnableConfirm = true;
	}

	async function confirmEnableChange() {
		if (isSavingPromoteSetting) return;

		isSavingPromoteSetting = true;
		try {
			await persistAdventurePromoteSetting(adventureId, enableConfirmValue);
			showEnableConfirm = false;
		} finally {
			isSavingPromoteSetting = false;
		}
	}

	function openPromoteDialog() {
		promoteError = null;
		copyMaps = true;
		copyNpcs = true;
		showPromoteDialog = true;
	}

	async function confirmPromotion() {
		if (isPromoting) return;

		isPromoting = true;
		promoteError = null;

		try {
			const result = await persistAdventurePromotion(adventureId, workspace.currentUserId, {
				copyMaps,
				copyNpcs
			});

			showPromoteDialog = false;
			open = false;
			await goto(resolve(`/campaigns/${result.campaignId}`));
		} catch (cause) {
			promoteError = formatErrorMessage(cause, 'Could not promote adventure');
		} finally {
			isPromoting = false;
		}
	}
</script>

<AppDialog bind:open title={adventureName} triggerVariant="icon" triggerAriaLabel="Settings">
	{#snippet trigger()}
		<SettingsIcon />
	{/snippet}
	{#snippet descriptionContent()}
		Settings for this adventure in <strong>{campaignName}</strong>.
	{/snippet}
	<div class="settings-sections">
		<div class="field">
			<Label.Root for="adventure_settings_nickname">Nickname</Label.Root>
			<input
				id="adventure_settings_nickname"
				bind:value={adventureNickname}
				disabled={isSaving}
				placeholder="Short name for navigation (optional)"
			/>
			<p class="hint">Shown in menu</p>
		</div>

		{#if saveError}
			<p class="error" role="alert">{saveError}</p>
		{/if}

		<section class="settings-section">
			<h3>Campaign theme</h3>
			<p class="hint">
				Override the account theme while browsing this campaign. Updates apply immediately.
			</p>
			<div class="field">
				<Label.Root for="campaign_theme_{campaignId}">Theme</Label.Root>
				<select
					id="campaign_theme_{campaignId}"
					value={selectedTheme}
					disabled={isSavingTheme}
					onchange={handleThemeChange}
				>
					{#each campaignThemeOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<p class="hint">
					{campaignThemeOptions.find((option) => option.value === selectedTheme)?.description}
				</p>
			</div>
		</section>

		<section class="settings-section">
			<h3>Promote to Campaign</h3>
			{#if canPromote}
				<p class="hint">
					Clone this adventure into a new standalone campaign. The original adventure stays in
					<strong>{campaignName}</strong>.
				</p>
				<div class="promote-actions">
					<Button.Root
						type="button"
						data-variant="primary"
						disabled={isPromoting}
						onclick={openPromoteDialog}
					>
						Promote to Campaign
					</Button.Root>
					<Button.Root
						type="button"
						data-variant="ghost"
						disabled={isSavingPromoteSetting}
						onclick={() => openEnableConfirm(false)}
					>
						Disable promotion
					</Button.Root>
				</div>
			{:else}
				<p class="hint">
					Allow this adventure to be cloned into its own standalone campaign later.
				</p>
				<Button.Root
					type="button"
					data-variant="primary"
					disabled={isSavingPromoteSetting}
					onclick={() => openEnableConfirm(true)}
				>
					Enable Promote to Campaign
				</Button.Root>
			{/if}
		</section>
	</div>
	{#snippet footer()}
		<DialogFormFooter
			submitLabel={isSaving ? 'Saving…' : 'Done'}
			pending={isSaving}
			submitType="button"
			onSubmit={handleDone}
		/>
	{/snippet}
</AppDialog>

<AppDialog
	bind:open={showEnableConfirm}
	title={enableConfirmValue ? 'Enable Promote to Campaign?' : 'Disable Promote to Campaign?'}
	stacked
>
	{#snippet descriptionContent()}
		{#if enableConfirmValue}
			This marks <strong>{adventureName}</strong> as eligible to be promoted into its own standalone campaign.
		{:else}
			<strong>{adventureName}</strong> can no longer be promoted. The existing campaign structure stays
			as-is.
		{/if}
	{/snippet}
	{#snippet footer()}
		<DialogFormFooter
			submitLabel={isSavingPromoteSetting
				? 'Saving…'
				: enableConfirmValue
					? 'Enable promotion'
					: 'Disable promotion'}
			pending={isSavingPromoteSetting}
			submitType="button"
			useDialogClose={false}
			onCancel={() => (showEnableConfirm = false)}
			onSubmit={confirmEnableChange}
		/>
	{/snippet}
</AppDialog>

<AppDialog bind:open={showPromoteDialog} title="Promote to Campaign?" stacked>
	{#snippet descriptionContent()}
		<p>
			This is <strong>irreversible</strong>. A new campaign named
			<strong>{adventureName}</strong>
			will be created with a full copy of this adventure, its parts, and story nodes.
		</p>
		<p>
			The new campaign must be deleted manually if you no longer want it. You will also need to edit <strong
				>{campaignName}</strong
			> manually — the original adventure is not removed.
		</p>
		<p class="hint">
			Players are not copied. Link them to the new campaign from its player list when you are ready.
		</p>
	{/snippet}
	<fieldset class="promote-options">
		<legend>Copy from {campaignName}</legend>
		<label class="promote-option">
			<input type="checkbox" bind:checked={copyMaps} disabled={isPromoting} />
			<span>Maps</span>
		</label>
		<label class="promote-option">
			<input type="checkbox" bind:checked={copyNpcs} disabled={isPromoting} />
			<span>NPCs</span>
		</label>
	</fieldset>

	{#if promoteError}
		<p class="error" role="alert">{promoteError}</p>
	{/if}
	{#snippet footer()}
		<DialogFormFooter
			submitLabel={isPromoting ? 'Promoting…' : 'Promote to Campaign'}
			pending={isPromoting}
			submitType="button"
			useDialogClose={false}
			onCancel={() => (showPromoteDialog = false)}
			onSubmit={confirmPromotion}
		/>
	{/snippet}
</AppDialog>

<style>
	.settings-sections {
		display: grid;
		gap: var(--space-section);
	}

	.settings-section h3 {
		margin: 0 0 0.35rem;
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 600;
	}

	.settings-section :global(.field) {
		margin-bottom: 0;
	}

	.promote-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.promote-options {
		margin: 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		display: grid;
		gap: 0.5rem;
	}

	.promote-options legend {
		padding: 0 0.25rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.promote-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.promote-option input {
		margin: 0;
	}

	.error {
		margin: 0;
		color: var(--color-danger);
	}
</style>
