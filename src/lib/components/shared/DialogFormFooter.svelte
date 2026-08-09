<script lang="ts">
	import { Button, Dialog } from 'bits-ui';

	type Props = {
		submitLabel: string;
		pending?: boolean;
		disabled?: boolean;
		cancelLabel?: string;
		pendingLabel?: string;
		useDialogClose?: boolean;
		onCancel?: () => void;
		submitType?: 'button' | 'submit';
		onSubmit?: () => void;
	};

	let {
		submitLabel,
		pending = false,
		disabled = false,
		cancelLabel = 'Cancel',
		pendingLabel,
		useDialogClose = true,
		onCancel,
		submitType = 'submit',
		onSubmit
	}: Props = $props();

	const isDisabled = $derived(pending || disabled);
</script>

<div class="dialog-footer">
	{#if useDialogClose}
		<Dialog.Close>
			{#snippet child({ props })}
				<Button.Root {...props} type="button" disabled={isDisabled}>{cancelLabel}</Button.Root>
			{/snippet}
		</Dialog.Close>
	{:else}
		<Button.Root type="button" disabled={isDisabled} onclick={() => onCancel?.()}>
			{cancelLabel}
		</Button.Root>
	{/if}
	<Button.Root
		type={submitType}
		data-variant="primary"
		disabled={isDisabled}
		onclick={submitType === 'button' ? onSubmit : undefined}
	>
		{pending && pendingLabel ? pendingLabel : submitLabel}
	</Button.Root>
</div>
