<script lang="ts">
	import type { Snippet } from 'svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		triggerAriaLabel: string;
		trigger?: Snippet<[{ props?: Record<string, unknown> }]>;
		descriptionContent?: Snippet;
		form?: Snippet;
		dangerZone?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		triggerAriaLabel,
		trigger: customTrigger,
		descriptionContent,
		form,
		dangerZone
	}: Props = $props();
</script>

<AppDialog
	bind:open
	{title}
	{description}
	{descriptionContent}
	triggerVariant="icon"
	{triggerAriaLabel}
>
	{#snippet trigger()}
		{#if customTrigger}
			{@render customTrigger({})}
		{:else}
			<SettingsIcon />
		{/if}
	{/snippet}
	{#if form}
		{@render form()}
	{/if}
	{#if dangerZone}
		{@render dangerZone()}
	{/if}
</AppDialog>

<style>
	:global(.entity-settings-form) {
		display: grid;
		gap: 0.75rem;
	}

	:global(.entity-settings-form .hint.error) {
		color: var(--color-danger);
	}
</style>
