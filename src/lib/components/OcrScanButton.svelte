<script lang="ts">
	import { Button } from 'bits-ui';
	import ClipboardIcon from '$lib/components/icons/ClipboardIcon.svelte';
	import PartOcrModal from '$lib/components/part/PartOcrModal.svelte';

	let showOcrModal = $state(false);
</script>

<Button.Root
	type="button"
	data-variant="icon"
	aria-label="Scan text from image"
	onclick={() => (showOcrModal = true)}
>
	<ClipboardIcon size={20} />
</Button.Root>

<PartOcrModal bind:open={showOcrModal} />
