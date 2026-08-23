<script lang="ts">
	import { Button } from 'bits-ui';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		lines: readonly { id: string }[];
		listClass?: string;
		lineClass?: string;
		removeAriaLabel?: string;
		onRemove: (lineId: string) => void;
		onAdd: () => void;
		showRemove?: (line: { id: string }, index: number) => boolean;
		showAdd?: boolean;
		row: Snippet<[{ line: { id: string }; index: number }]>;
		actions?: Snippet<[{ line: { id: string }; index: number }]>;
	};

	let {
		lines,
		listClass = 'draft-lines list-plain',
		lineClass = 'draft-line',
		removeAriaLabel = 'Remove row',
		onRemove,
		onAdd,
		showRemove,
		showAdd = true,
		row,
		actions
	}: Props = $props();

	function shouldShowRemove(line: { id: string }, index: number): boolean {
		return showRemove?.(line, index) ?? lines.length > 1;
	}
</script>

<ul class={['lines', listClass]}>
	{#each lines as line, index (line.id)}
		<li class={['line', lineClass]}>
			{@render row({ line, index })}
			{#if actions}
				{@render actions({ line, index })}
			{/if}
			{#if shouldShowRemove(line, index)}
				<RemoveIconButton ariaLabel={removeAriaLabel} onclick={() => onRemove(line.id)} />
			{/if}
			{#if showAdd && index === lines.length - 1}
				<Button.Root type="button" data-variant="icon" aria-label="Add row" onclick={onAdd}>
					<AddIcon />
				</Button.Root>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.lines {
		display: grid;
		gap: 0.5rem;
	}

	.line {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
	}

	.line :global([data-button-root][data-variant='icon']) {
		flex: 0 0 auto;
		align-self: stretch;
		aspect-ratio: 1;
		width: auto;
		min-inline-size: 2.75rem;
		padding: 0.125rem;
		background: transparent;
		box-shadow: none;
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}

	.line :global([data-button-root][data-variant='icon']:hover:not(:disabled)) {
		background: transparent;
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>
