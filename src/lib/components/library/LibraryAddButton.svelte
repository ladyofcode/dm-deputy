<script lang="ts">
	import { Button } from 'bits-ui';

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
		<span aria-hidden="true">+</span>
		Add {label}
	</Button.Root>
{:else}
	<Button.Root type="button" class="library-add-button" {disabled} {onclick}>
		<span aria-hidden="true">+</span>
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
