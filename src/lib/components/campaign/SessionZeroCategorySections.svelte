<script lang="ts">
	import type { Snippet } from 'svelte';
	import type {
		SessionZeroCategoryBlock,
		SessionZeroSectionGroup
	} from '$lib/domain/session-zero-questions';

	type Props = {
		blocks: SessionZeroCategoryBlock[];
		headingLevel?: 2 | 3;
		subheadingLevel?: 3 | 4;
		idPrefix?: string;
		children?: Snippet<[{ section: SessionZeroSectionGroup }]>;
	};

	let {
		blocks,
		headingLevel = 2,
		subheadingLevel = 3,
		idPrefix = 'session-zero-category',
		children
	}: Props = $props();
</script>

{#each blocks as block (block.category.id)}
	<section class="session-zero-category" aria-labelledby={`${idPrefix}-${block.category.id}`}>
		<svelte:element
			this={`h${headingLevel}`}
			id={`${idPrefix}-${block.category.id}`}
			class="session-zero-category-heading"
		>
			{block.category.label}
		</svelte:element>

		{#each block.sections as section (section.subcategory?.id ?? block.category.id)}
			<div class="session-zero-section">
				{#if section.subcategory}
					<svelte:element
						this={`h${subheadingLevel}`}
						id={`${idPrefix}-${block.category.id}-${section.subcategory.id}`}
						class="session-zero-subcategory-heading"
					>
						{section.subcategory.label}
					</svelte:element>
				{/if}

				<div class="session-zero-category-questions">
					{#if children}
						{@render children({ section })}
					{/if}
				</div>
			</div>
		{/each}
	</section>
{/each}

<style>
	.session-zero-category {
		display: grid;
		gap: 0.75rem;
	}

	.session-zero-category-heading {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.session-zero-section {
		display: grid;
		gap: 0.75rem;
	}

	.session-zero-subcategory-heading {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted, #667085);
	}

	.session-zero-category-questions {
		display: grid;
		gap: 0.75rem;
	}
</style>
