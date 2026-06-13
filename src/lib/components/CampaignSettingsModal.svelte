<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { campaignThemeOptions } from '$lib/themes/themes';
	import { getCampaignTheme } from '$lib/themes/resolve';
	import type { CampaignTheme } from '$lib/themes/types';

	type Props = {
		campaignId: string;
		campaignName: string;
		open?: boolean;
	};

	let { campaignId, campaignName, open = $bindable(false) }: Props = $props();

	const selectedTheme = $derived(getCampaignTheme(campaignId, preferences.campaignThemes));

	function handleThemeChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as CampaignTheme;
		preferences.setCampaignTheme(campaignId, value);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger data-variant="icon" aria-label="Campaign settings">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="3" />
			<path
				d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
			/>
		</svg>
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content>
			<Dialog.Title>{campaignName}</Dialog.Title>
			<Dialog.Description>
				Theme updates apply straight away on the home page and while browsing this campaign.
			</Dialog.Description>

			<div class="field">
				<Label.Root for="campaign_theme_{campaignId}">Theme</Label.Root>
				<select id="campaign_theme_{campaignId}" value={selectedTheme} onchange={handleThemeChange}>
					{#each campaignThemeOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<p class="hint">
					{campaignThemeOptions.find((option) => option.value === selectedTheme)?.description}
				</p>
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
