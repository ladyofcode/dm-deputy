<script lang="ts">
	import { Tooltip } from 'bits-ui';
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
	<Tooltip.Root>
		<Tooltip.Trigger class="catalog-item-trigger" type="button">
			{label}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content class="catalog-item-tooltip">
				<ul>
					{#each stats as stat (stat)}
						<li>{stat}</li>
					{/each}
				</ul>
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
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
		cursor: help;
	}

	:global(.catalog-item-trigger:hover) {
		color: var(--color-accent-hover);
	}

	:global(.catalog-item-tooltip) {
		z-index: 60;
		max-width: 16rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		box-shadow: 0 8px 24px var(--color-shadow);
	}

	:global(.catalog-item-tooltip) ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.2rem;
	}

	:global(.catalog-item-tooltip) li {
		font-size: 0.875rem;
		line-height: 1.35;
		color: var(--color-text);
	}
</style>
