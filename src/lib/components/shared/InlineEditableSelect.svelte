<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import InlineEditableSelectShell from '$lib/components/shared/InlineEditableSelectShell.svelte';

	type FieldLayout = 'stacked' | 'inline';

	type Props = {
		label?: string;
		value?: string;
		displayValue?: string;
		emptyLabel?: string;
		id?: string;
		disabled?: boolean;
		layout?: FieldLayout;
		onchange?: (event: Event & { currentTarget: HTMLSelectElement }) => void;
		options?: Snippet;
		'aria-label'?: string;
	};

	let {
		label = '',
		value = $bindable(''),
		displayValue = '',
		emptyLabel = 'Choose…',
		id,
		disabled = false,
		layout = 'stacked',
		onchange,
		options,
		'aria-label': ariaLabel
	}: Props = $props();

	let selectEl = $state<HTMLSelectElement | null>(null);

	const resolvedAriaLabel = $derived(ariaLabel ?? label);
	const shownValue = $derived(displayValue.trim() || value.trim());

	function handleSelectChange(
		event: Event & { currentTarget: HTMLSelectElement },
		finishEditing: () => void
	) {
		onchange?.(event);
		finishEditing();
	}

	function handleSelectKeydown(event: KeyboardEvent, finishEditing: () => void) {
		if (event.key === 'Escape') {
			event.preventDefault();
			finishEditing();
		}
	}

	async function focusSelect() {
		await tick();
		selectEl?.focus();
	}
</script>

<InlineEditableSelectShell
	{label}
	displayValue={shownValue}
	{emptyLabel}
	{id}
	{disabled}
	{layout}
	aria-label={resolvedAriaLabel}
	onActivate={focusSelect}
>
	{#snippet control({ finishEditing })}
		<select
			bind:this={selectEl}
			{id}
			class="inline-editable-control"
			bind:value
			{disabled}
			aria-label={resolvedAriaLabel}
			aria-labelledby={label && id ? `${id}-label` : undefined}
			onchange={(event) => handleSelectChange(event, finishEditing)}
			onkeydown={(event) => handleSelectKeydown(event, finishEditing)}
			onblur={finishEditing}
		>
			<option value="">{emptyLabel}</option>
			{@render options?.()}
		</select>
	{/snippet}
</InlineEditableSelectShell>
