<script lang="ts">
	import { Label } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		id?: string;
		hint?: string;
		wide?: boolean;
		children: Snippet;
	};

	let { label, id, hint, wide = false, children }: Props = $props();
</script>

<div class="field" class:field-wide={wide}>
	<Label.Root for={id}>{label}</Label.Root>
	{@render children()}
	{#if hint}
		<p class="hint">{hint}</p>
	{/if}
</div>

<style>
	.field-wide {
		grid-column: 1 / -1;
	}
</style>
