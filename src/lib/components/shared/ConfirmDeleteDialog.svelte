<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
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

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-stacked">
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				<p>
					{@render description()}
				</p>
				<p class="delete-warning">This cannot be undone.</p>
			</Dialog.Description>

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
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.delete-warning {
		margin: 0;
		font-weight: 600;
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
