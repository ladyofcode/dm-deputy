<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		lines: readonly { id: string }[];
		listClass?: string;
		lineClass?: string;
		onRemove: (lineId: string) => void;
		onAdd: () => void;
		showRemove?: (line: { id: string }, index: number) => boolean;
		showAdd?: boolean;
		row: Snippet<[{ line: { id: string }; index: number }]>;
	};

	let {
		lines,
		listClass = 'draft-lines list-plain',
		lineClass = 'draft-line',
		onRemove,
		onAdd,
		showRemove,
		showAdd = true,
		row
	}: Props = $props();

	function shouldShowRemove(line: { id: string }, index: number): boolean {
		return showRemove?.(line, index) ?? lines.length > 1;
	}
</script>

<ul class={listClass}>
	{#each lines as line, index (line.id)}
		<li class={lineClass}>
			{@render row({ line, index })}
			{#if shouldShowRemove(line, index)}
				<Button.Root
					type="button"
					data-variant="icon"
					aria-label="Remove row"
					onclick={() => onRemove(line.id)}
				>
					−
				</Button.Root>
			{/if}
			{#if showAdd && index === lines.length - 1}
				<Button.Root type="button" data-variant="icon" aria-label="Add row" onclick={onAdd}>
					+
				</Button.Root>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.draft-lines {
		display: grid;
		gap: 0.5rem;
	}

	.draft-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.draft-line :global(input),
	.draft-line :global(select) {
		flex: 1;
		min-width: 0;
	}
</style>
