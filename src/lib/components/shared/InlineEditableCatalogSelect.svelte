<script lang="ts">
	import CatalogSelect from '$lib/components/shared/CatalogSelect.svelte';
	import InlineEditableSelectShell from '$lib/components/shared/InlineEditableSelectShell.svelte';
	import {
		formatArmorSelectLabel,
		formatItemSelectLabel,
		formatWeaponSelectLabel,
		type CatalogOptionGroup
	} from '$lib/domain/catalog-select';
	import type { Armor, Item, Weapon } from '$lib/types/schema';

	type CatalogKind = 'weapon' | 'armor' | 'item';
	type FieldLayout = 'stacked' | 'inline';

	type Props = {
		kind: CatalogKind;
		label?: string;
		value?: string;
		groups: CatalogOptionGroup<Weapon | Armor | Item>[];
		emptyLabel?: string;
		id?: string;
		disabled?: boolean;
		layout?: FieldLayout;
		onchange?: (event: Event & { currentTarget: HTMLSelectElement }) => void;
		'aria-label'?: string;
	};

	let {
		kind,
		label = '',
		value = $bindable(''),
		groups,
		emptyLabel = 'None',
		id,
		disabled = false,
		layout = 'stacked',
		onchange,
		'aria-label': ariaLabel
	}: Props = $props();

	const resolvedAriaLabel = $derived(ariaLabel ?? label);

	const displayValue = $derived.by(() => {
		if (!value) return '';

		for (const group of groups) {
			for (const entry of group.entries) {
				const entryId = resolveEntryId(entry);
				if (entryId !== value) continue;

				return resolveEntryLabel(entry);
			}
		}

		return value;
	});

	function resolveEntryId(entry: Weapon | Armor | Item): string {
		switch (kind) {
			case 'weapon':
				return (entry as Weapon).weapon_id;
			case 'armor':
				return (entry as Armor).armor_id;
			case 'item':
				return (entry as Item).item_id;
		}
	}

	function resolveEntryLabel(entry: Weapon | Armor | Item): string {
		switch (kind) {
			case 'weapon':
				return formatWeaponSelectLabel(entry as Weapon);
			case 'armor':
				return formatArmorSelectLabel(entry as Armor);
			case 'item':
				return formatItemSelectLabel(entry as Item);
		}
	}

	function handleSelectChange(
		event: Event & { currentTarget: HTMLSelectElement },
		finishEditing: () => void
	) {
		onchange?.(event);
		finishEditing();
	}
</script>

<InlineEditableSelectShell
	{label}
	{displayValue}
	{emptyLabel}
	{id}
	{disabled}
	{layout}
	aria-label={resolvedAriaLabel}
>
	{#snippet control({ finishEditing })}
		<CatalogSelect
			{id}
			{kind}
			{groups}
			bind:value
			{emptyLabel}
			{disabled}
			class="inline-editable-control"
			aria-label={resolvedAriaLabel}
			onchange={(event) => handleSelectChange(event, finishEditing)}
			onblur={finishEditing}
		/>
	{/snippet}
</InlineEditableSelectShell>
