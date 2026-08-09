<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		id?: string;
		headingId: string;
		title: string;
		hint?: string;
		emptyMessage?: string;
		showEmpty?: boolean;
		error?: string | null;
		class?: string;
		headerAction?: Snippet;
		list?: Snippet;
		between?: Snippet;
		addForm?: Snippet;
	};

	let {
		id,
		headingId,
		title,
		hint,
		emptyMessage,
		showEmpty = false,
		error = null,
		class: className = '',
		headerAction,
		list,
		between,
		addForm
	}: Props = $props();
</script>

<section
	{id}
	class={['entity-section', className].filter(Boolean).join(' ')}
	aria-labelledby={headingId}
>
	<div class="entity-section-header">
		<h2 id={headingId}>{title}</h2>
		{#if headerAction}
			{@render headerAction()}
		{/if}
	</div>

	{#if hint}
		<p class="hint">{hint}</p>
	{/if}

	{#if list}
		{@render list()}
	{/if}

	{#if showEmpty && emptyMessage}
		<EmptyState message={emptyMessage} />
	{/if}

	{#if between}
		{@render between()}
	{/if}

	{#if addForm}
		{@render addForm()}
	{/if}

	{#if error}
		<p class="hint error">{error}</p>
	{/if}
</section>

<style>
	.entity-section {
		display: grid;
		gap: 0.75rem;
	}

	.entity-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.entity-section-header h2 {
		margin: 0;
	}

	.hint.error {
		color: var(--color-danger);
	}
</style>
