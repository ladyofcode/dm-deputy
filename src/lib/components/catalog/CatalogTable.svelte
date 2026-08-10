<script lang="ts" generics="T">
	import { Button } from 'bits-ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		items: T[];
		getId: (item: T) => string;
		emptyMessage: string;
		onEdit?: (item: T) => void;
		onDelete?: (id: string) => void;
		deletingId?: string | null;
		header: Snippet;
		row: Snippet<[T]>;
		actions?: Snippet<[T]>;
	};

	let {
		items,
		getId,
		emptyMessage,
		onEdit,
		onDelete,
		deletingId = null,
		header,
		row,
		actions
	}: Props = $props();
</script>

{#if items.length}
	<div class="table-wrap">
		<table class="data-table">
			<thead>
				<tr>
					{@render header()}
					<th scope="col" class="actions-col">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item (getId(item))}
					<tr>
						{@render row(item)}
						<td class="actions-col">
							{#if actions}
								{@render actions(item)}
							{:else}
								<Button.Root type="button" data-variant="ghost" onclick={() => onEdit?.(item)}>
									Edit
								</Button.Root>
								<RemoveIconButton
									variant="ghost"
									ariaLabel="Delete"
									busy={deletingId === getId(item)}
									onclick={() => onDelete?.(getId(item))}
								/>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<EmptyState message={emptyMessage} />
{/if}

<style>
	.data-table :global(.description-cell) {
		color: var(--color-text-muted);
	}

	.actions-col :global([data-button-root]) {
		margin-right: 0.25rem;
	}
</style>
