<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { persistCampaignDetails } from '$lib/data/writes';

	type Props = {
		campaignId: string;
		campaignName: string;
		description?: string;
		open?: boolean;
	};

	let { campaignId, campaignName, description = '', open = $bindable(false) }: Props = $props();

	let name = $state('');
	let details = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) return;

		name = campaignName;
		details = description;
		error = null;
	});

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		saving = true;
		error = null;

		try {
			await persistCampaignDetails(campaignId, {
				campaign_name: name,
				description: details
			});
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save campaign';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger data-variant="icon" aria-label="Campaign settings">
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
			<Dialog.Title>Campaign settings</Dialog.Title>
			<Dialog.Description>Edit the campaign name and description.</Dialog.Description>

			<form class="settings-form" onsubmit={handleSave}>
				<div class="field">
					<Label.Root for="campaign_settings_name">Campaign name</Label.Root>
					<input
						id="campaign_settings_name"
						bind:value={name}
						required
						placeholder="Campaign name"
					/>
				</div>

				<div class="field">
					<Label.Root for="campaign_settings_description">Description</Label.Root>
					<textarea
						id="campaign_settings_description"
						bind:value={details}
						rows="4"
						placeholder="Optional description"
					></textarea>
				</div>

				{#if error}
					<p class="hint error">{error}</p>
				{/if}

				<div class="dialog-footer">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button.Root {...props} type="button" disabled={saving}>Cancel</Button.Root>
						{/snippet}
					</Dialog.Close>
					<Button.Root type="submit" data-variant="primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</Button.Root>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.settings-form {
		display: grid;
		gap: 0.75rem;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
