<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Component } from 'svelte';
	import ClipboardIcon from '$lib/components/icons/ClipboardIcon.svelte';

	let showOcrModal = $state(false);
	let OcrModal = $state<Component<{ open?: boolean }> | null>(null);

	async function openOcrModal() {
		if (!OcrModal) {
			const module = await import('$lib/components/part/PartOcrModal.svelte');
			OcrModal = module.default;
		}

		showOcrModal = true;
	}
</script>

<Button.Root
	type="button"
	data-variant="icon"
	aria-label="Scan text from image"
	onclick={() => void openOcrModal()}
>
	<ClipboardIcon size={20} />
</Button.Root>

{#if OcrModal}
	<OcrModal bind:open={showOcrModal} />
{/if}
