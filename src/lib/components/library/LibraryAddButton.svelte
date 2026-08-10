<script lang="ts">
	import { Button } from 'bits-ui';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';

	type Props = {
		label: string;
		href?: string;
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
	};

	let { label, href, disabled = false, onclick }: Props = $props();
</script>

{#if href}
	<Button.Root class="library-add-button" {href} {disabled}>
		<AddIcon />
		Add {label}
	</Button.Root>
{:else}
	<Button.Root type="button" class="library-add-button" {disabled} {onclick}>
		<AddIcon />
		Add {label}
	</Button.Root>
{/if}

<style>
	:global(.library-add-button[data-button-root]) {
		padding: 0.4rem 0.75rem;
		font-size: 0.9rem;
		box-shadow: none;
	}
</style>
