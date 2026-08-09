<script lang="ts">
	import type { Snippet } from 'svelte';
	import LibraryAddButton from '$lib/components/library/LibraryAddButton.svelte';

	type Props = {
		title: string;
		id: string;
		addLabel?: string;
		addHref?: string;
		onAdd?: () => void;
		addDisabled?: boolean;
		actions?: Snippet;
	};

	let { title, id, addLabel, addHref, onAdd, addDisabled = false, actions }: Props = $props();
</script>

<div class="library-section-header">
	<h2 {id}>{title}</h2>
	{#if actions || (addLabel && (addHref || onAdd))}
		<div class="library-section-actions">
			{@render actions?.()}
			{#if addLabel && (addHref || onAdd)}
				<LibraryAddButton label={addLabel} href={addHref} disabled={addDisabled} onclick={onAdd} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.library-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 0 0 0.75rem;
	}

	.library-section-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
</style>
