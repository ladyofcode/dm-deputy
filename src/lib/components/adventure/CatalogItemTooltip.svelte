<script lang="ts">
	import { Popover } from 'bits-ui';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import { formatStoryItemCatalogStats } from '$lib/domain/story-item-catalog';
	import type { StoryItem } from '$lib/types/schema';

	type Props = {
		item: StoryItem;
		label: string;
	};

	let { item, label }: Props = $props();

	const stats = $derived(item.kind === 'item' ? formatStoryItemCatalogStats(item) : []);
	const hasTooltip = $derived(stats.length > 0);
</script>

{#if hasTooltip}
	<Popover.Root>
		<Popover.Trigger class="catalog-item-trigger" type="button" aria-label="{label} stats">
			{label}
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content class="tooltip-panel catalog-item-tooltip" side="top" align="start">
				<div class="catalog-item-header">
					<ul>
						{#each stats as stat (stat)}
							<li>{stat}</li>
						{/each}
					</ul>
					<Popover.Close class="catalog-item-close" aria-label="Close stats">
						<CloseIcon size={16} />
					</Popover.Close>
				</div>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
{:else}
	<span>{label}</span>
{/if}

<style>
	:global(.catalog-item-trigger) {
		display: inline;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: var(--color-accent);
		cursor: pointer;
	}

	:global(.catalog-item-trigger:hover),
	:global(.catalog-item-trigger:focus-visible) {
		color: var(--color-accent-hover);
	}

	:global(.catalog-item-trigger):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.catalog-item-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.catalog-item-header ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.2rem;
		flex: 1;
	}

	.catalog-item-header li {
		font-size: 0.875rem;
		line-height: 1.35;
		color: var(--color-text);
	}

	:global(.catalog-item-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.15rem;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	:global(.catalog-item-close):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
