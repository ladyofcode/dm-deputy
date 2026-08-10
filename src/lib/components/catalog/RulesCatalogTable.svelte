<script lang="ts">
	import { Button } from 'bits-ui';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import type { RulesCatalogColumn, RulesCatalogEntry } from '$lib/domain/rules-catalog-table';

	type Props = {
		items: RulesCatalogEntry[];
		getId: (item: RulesCatalogEntry) => string;
		emptyMessage: string;
		columns: RulesCatalogColumn[];
		onEdit: (item: RulesCatalogEntry) => void;
		onDelete: (id: string) => void;
		deletingId?: string | null;
	};

	let {
		items,
		getId,
		emptyMessage,
		columns,
		onEdit,
		onDelete,
		deletingId = null
	}: Props = $props();
</script>

{#if items.length}
	<div class="table-wrap">
		<table class="data-table">
			<thead>
				<tr>
					{#each columns as column (column.header)}
						<th scope="col">{column.header}</th>
					{/each}
					<th scope="col" class="actions-col">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item (getId(item))}
					<tr>
						{#each columns as column (column.header)}
							<td class={column.cellClass}>{column.render(item)}</td>
						{/each}
						<td class="actions-col">
							<Button.Root type="button" data-variant="ghost" onclick={() => onEdit(item)}>
								Edit
							</Button.Root>
							<RemoveIconButton
								variant="ghost"
								ariaLabel="Delete"
								busy={deletingId === getId(item)}
								onclick={() => onDelete(getId(item))}
							/>
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
	.actions-col :global([data-button-root]) {
		margin-right: 0.25rem;
	}
</style>
