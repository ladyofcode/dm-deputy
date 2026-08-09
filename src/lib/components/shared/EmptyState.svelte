<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		message: string;
		action?: Snippet;
	};

	let { message, action }: Props = $props();
</script>

<p class="hint">{message}</p>
{#if action}
	{@render action()}
{/if}
