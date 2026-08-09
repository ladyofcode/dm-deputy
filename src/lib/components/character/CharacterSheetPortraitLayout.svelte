<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		showPortrait?: boolean;
		portrait: Snippet;
		children: Snippet;
	};

	let { showPortrait = true, portrait, children }: Props = $props();
</script>

<div class="sheet-portrait-main">
	{#if showPortrait}
		<div class="sheet-portrait">
			{@render portrait()}
		</div>
	{/if}

	{@render children()}
</div>

<style>
	.sheet-portrait-main {
		display: grid;
		gap: 1rem;
	}

	.sheet-portrait {
		margin-bottom: 0;
	}

	.sheet-portrait :global(.portrait-field) {
		width: 100%;
		max-width: 20rem;
	}

	.sheet-portrait :global(.portrait-preview) {
		width: 100%;
		max-width: 20rem;
	}

	@media (--layout) {
		.sheet-portrait-main:has(.sheet-portrait) {
			grid-template-columns: auto auto;
			justify-content: start;
			align-items: start;
			column-gap: 1.25rem;
		}

		.sheet-portrait {
			grid-column: 2;
			grid-row: 1;
		}

		.sheet-portrait-main :global(.sheet-portrait-fields) {
			grid-column: 1;
			grid-row: 1;
		}

		.sheet-portrait :global(.portrait-field),
		.sheet-portrait :global(.portrait-preview) {
			width: clamp(14rem, 28vw, 20rem);
			max-width: clamp(14rem, 28vw, 20rem);
		}
	}
</style>
