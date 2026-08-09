<script lang="ts">
	import { Button } from 'bits-ui';
	import InlineEditableCatalogSelect from '$lib/components/shared/InlineEditableCatalogSelect.svelte';
	import {
		addLoadoutEntry,
		appendLoadoutRowKey,
		removeLoadoutEntry,
		removeLoadoutRowKey,
		syncLoadoutRowKeys,
		updateLoadoutEntry,
		type LoadoutListField
	} from '$lib/domain/loadout-rows';
	import type { CatalogOptionGroup } from '$lib/domain/catalog-select';
	import type { Item, Weapon } from '$lib/types/schema';

	type Props = {
		field: Extract<LoadoutListField, 'weapons' | 'items'>;
		heading: string;
		values: string[];
		rowKeys: string[];
		groups: CatalogOptionGroup<Weapon | Item>[];
		emptyLabel: string;
		addLabel: string;
		removeLabel: string;
		onValuesChange: (values: string[]) => void;
		onRowKeysChange: (keys: string[]) => void;
	};

	let {
		field,
		heading,
		values,
		rowKeys,
		groups,
		emptyLabel,
		addLabel,
		removeLabel,
		onValuesChange,
		onRowKeysChange
	}: Props = $props();

	$effect(() => {
		const nextKeys = syncLoadoutRowKeys(rowKeys, field, values.length);
		if (nextKeys !== rowKeys) {
			onRowKeysChange(nextKeys);
		}
	});

	function updateRow(index: number, value: string) {
		onValuesChange(updateLoadoutEntry(values, index, value));
	}

	function addRow() {
		onRowKeysChange(appendLoadoutRowKey(rowKeys, field));
		onValuesChange(addLoadoutEntry(values, ''));
	}

	function removeRow(index: number) {
		onRowKeysChange(removeLoadoutRowKey(rowKeys, index));
		onValuesChange(removeLoadoutEntry(values, index, ''));
	}
</script>

<div class="loadout-block">
	<span class="loadout-heading">{heading}</span>
	<ul class="loadout-lines list-plain">
		{#each values as value, index (rowKeys[index] ?? index)}
			<li class="loadout-line">
				<InlineEditableCatalogSelect
					kind={field === 'weapons' ? 'weapon' : 'item'}
					{groups}
					{value}
					{emptyLabel}
					aria-label={heading.slice(0, -1)}
					onchange={(event) => updateRow(index, event.currentTarget.value)}
				/>
				{#if values.length > 1 || value}
					<Button.Root
						type="button"
						data-variant="icon"
						aria-label={removeLabel}
						onclick={() => removeRow(index)}
					>
						−
					</Button.Root>
				{/if}
				{#if index === values.length - 1}
					<Button.Root type="button" data-variant="icon" aria-label={addLabel} onclick={addRow}>
						+
					</Button.Root>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.loadout-block {
		margin-bottom: 0.75rem;
	}

	.loadout-heading {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.loadout-lines {
		display: grid;
		gap: 0.5rem;
	}

	.loadout-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.loadout-line :global(.inline-editable-field) {
		flex: 1;
		min-width: 0;
	}
</style>
