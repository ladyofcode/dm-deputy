<script lang="ts">
	import { Button } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		title: string;
		description: Snippet;
		confirmLabel: string;
		deleting?: boolean;
		onConfirm?: () => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		deleting = false,
		onConfirm
	}: Props = $props();
</script>

<AppDialog bind:open {title} stacked>
	{#snippet descriptionContent()}
		<p>
			{@render description()}
		</p>
		<p class="delete-warning">This cannot be undone.</p>
	{/snippet}
	{#snippet footer()}
		<div class="dialog-footer">
			<Button.Root type="button" disabled={deleting} onclick={() => (open = false)}>
				Cancel
			</Button.Root>
			<Button.Root
				type="button"
				class="delete-button"
				disabled={deleting}
				onclick={() => onConfirm?.()}
			>
				{deleting ? 'Deleting…' : confirmLabel}
			</Button.Root>
		</div>
	{/snippet}
</AppDialog>

<style>
	.delete-warning {
		margin: 0;
		font-weight: 600;
		color: var(--color-danger);
	}
</style>
