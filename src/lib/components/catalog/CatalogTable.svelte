<script lang="ts" generics="T">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		items: T[];
		getId: (item: T) => string;
		emptyMessage: string;
		onEdit: (item: T) => void;
		onDelete: (id: string) => void;
		deletingId?: string | null;
		header: Snippet;
		row: Snippet<[T]>;
	};

	let {
		items,
		getId,
		emptyMessage,
		onEdit,
		onDelete,
		deletingId = null,
		header,
		row
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
							<Button.Root type="button" data-variant="ghost" onclick={() => onEdit(item)}>
								Edit
							</Button.Root>
							<Button.Root
								type="button"
								data-variant="ghost"
								disabled={deletingId === getId(item)}
								onclick={() => onDelete(getId(item))}
							>
								Delete
							</Button.Root>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p class="hint">{emptyMessage}</p>
{/if}

<style>
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.65rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
	}

	.data-table th {
		font-family: var(--font-heading);
		font-weight: 600;
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}

	.data-table :global(.name-cell) {
		font-weight: 600;
	}

	.data-table :global(.description-cell) {
		max-width: 36rem;
		color: var(--color-text-muted, inherit);
	}

	.actions-col {
		white-space: nowrap;
	}

	.actions-col :global([data-button-root]) {
		margin-right: 0.25rem;
	}
</style>
