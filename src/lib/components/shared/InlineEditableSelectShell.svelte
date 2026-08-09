<script lang="ts">
	import { tick, type Snippet } from 'svelte';

	type FieldLayout = 'stacked' | 'inline';

	type Props = {
		label?: string;
		displayValue: string;
		emptyLabel?: string;
		id?: string;
		disabled?: boolean;
		layout?: FieldLayout;
		'aria-label'?: string;
		onActivate?: () => void | Promise<void>;
		control?: Snippet<[{ finishEditing: () => void }]>;
	};

	let {
		label = '',
		displayValue,
		emptyLabel = 'Choose…',
		id,
		disabled = false,
		layout = 'stacked',
		'aria-label': ariaLabel,
		onActivate,
		control
	}: Props = $props();

	let editing = $state(false);

	const resolvedAriaLabel = $derived(ariaLabel ?? label);
	const isEmpty = $derived(displayValue.trim().length === 0);

	async function activate() {
		if (disabled || editing) return;

		editing = true;
		await tick();
		await onActivate?.();
	}

	function finishEditing() {
		editing = false;
	}

	function handleDisplayKeydown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			void activate();
		}
	}
</script>

<div class="inline-editable-field" class:inline-editable-field-inline={layout === 'inline'}>
	{#if label}
		<span class="inline-editable-label" id={id ? `${id}-label` : undefined}>{label}</span>
	{/if}

	{#if editing && control}
		{@render control({ finishEditing })}
	{:else}
		<button
			type="button"
			class="inline-editable-display"
			class:inline-editable-empty={isEmpty}
			{disabled}
			aria-label={resolvedAriaLabel}
			aria-labelledby={label && id ? `${id}-label` : undefined}
			onclick={activate}
			onkeydown={handleDisplayKeydown}
		>
			{displayValue.trim() || emptyLabel}
		</button>
	{/if}
</div>

<style>
	.inline-editable-field {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}

	.inline-editable-field-inline {
		grid-template-columns: 6.75rem minmax(0, 1fr);
		align-items: center;
		gap: var(--space-field);
	}

	.inline-editable-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.inline-editable-display {
		margin: 0;
		padding: 0.1rem 0.2rem;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: 1.35;
		text-align: start;
		cursor: pointer;
		width: 100%;
	}

	.inline-editable-display:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-color: color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.inline-editable-display:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.inline-editable-display:disabled {
		cursor: default;
		opacity: 0.65;
	}

	.inline-editable-empty {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.inline-editable-field :global(.inline-editable-control) {
		width: 100%;
		margin: 0;
	}
</style>
