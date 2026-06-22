<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Dialog, Label } from 'bits-ui';
	import { getAdventureById } from '$lib/data';
	import {
		persistAdventurePromotion,
		persistAdventurePromoteSetting,
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
		open?: boolean;
	};

	let {
		campaignId,
		campaignName,
		adventureId,
		adventureName,
		open = $bindable(false)
	}: Props = $props();

	const adventure = $derived(getAdventureById(adventureId));
	const selectedTheme = $derived(getCampaignTheme(campaignId, preferences.campaignThemes));
	const canPromote = $derived(adventure?.can_promote_to_campaign ?? false);

	let isSavingTheme = $state(false);
	let isSavingPromoteSetting = $state(false);
	let isPromoting = $state(false);
	let showEnableConfirm = $state(false);
	let enableConfirmValue = $state(true);
	let showPromoteDialog = $state(false);
	let copyMaps = $state(true);
	let copyNpcs = $state(true);
	let promoteError = $state<string | null>(null);

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
			promoteError = cause instanceof Error ? cause.message : 'Could not promote adventure';
		} finally {
			isPromoting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger data-variant="icon" aria-label="Settings">
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
			<Dialog.Title>{adventureName}</Dialog.Title>
			<Dialog.Description>
				Settings for this adventure in <strong>{campaignName}</strong>.
			</Dialog.Description>

			<div class="settings-sections">
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

			<div class="dialog-footer">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button.Root {...props}>Done</Button.Root>
					{/snippet}
				</Dialog.Close>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<Dialog.Root bind:open={showEnableConfirm}>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-stacked">
			<Dialog.Title>
				{enableConfirmValue ? 'Enable Promote to Campaign?' : 'Disable Promote to Campaign?'}
			</Dialog.Title>
			<Dialog.Description>
				{#if enableConfirmValue}
					This marks <strong>{adventureName}</strong> as eligible to be promoted into its own standalone
					campaign.
				{:else}
					<strong>{adventureName}</strong> can no longer be promoted. The existing campaign structure
					stays as-is.
				{/if}
			</Dialog.Description>

			<div class="dialog-footer">
				<Button.Root type="button" onclick={() => (showEnableConfirm = false)}>Cancel</Button.Root>
				<Button.Root
					type="button"
					data-variant="primary"
					disabled={isSavingPromoteSetting}
					onclick={confirmEnableChange}
				>
					{isSavingPromoteSetting
						? 'Saving…'
						: enableConfirmValue
							? 'Enable promotion'
							: 'Disable promotion'}
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<Dialog.Root bind:open={showPromoteDialog}>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-stacked">
			<Dialog.Title>Promote to Campaign?</Dialog.Title>
			<Dialog.Description>
				<p>
					This is <strong>irreversible</strong>. A new campaign named
					<strong>{adventureName}</strong>
					will be created with a full copy of this adventure, its parts, and story nodes.
				</p>
				<p>
					The new campaign must be deleted manually if you no longer want it. You will also need to
					edit <strong>{campaignName}</strong> manually — the original adventure is not removed.
				</p>
				<p class="hint">
					Players are not copied. Link them to the new campaign from its player list when you are
					ready.
				</p>
			</Dialog.Description>

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

			<div class="dialog-footer">
				<Button.Root
					type="button"
					disabled={isPromoting}
					onclick={() => (showPromoteDialog = false)}
				>
					Cancel
				</Button.Root>
				<Button.Root
					type="button"
					data-variant="primary"
					disabled={isPromoting}
					onclick={confirmPromotion}
				>
					{isPromoting ? 'Promoting…' : 'Promote to Campaign'}
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

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
		color: var(--color-danger, #b42318);
	}
</style>
