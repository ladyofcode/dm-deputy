<script lang="ts">
	import { tick, type Snippet } from 'svelte';

	type FieldVariant = 'field' | 'heading';
	type FieldLayout = 'stacked' | 'inline';
	type InputType = 'text' | 'number' | 'textarea';

	type Props = {
		label?: string;
		value?: string | number | null;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		type?: InputType;
		variant?: FieldVariant;
		layout?: FieldLayout;
		hideLabel?: boolean;
		wide?: boolean;
		truncate?: boolean;
		nullable?: boolean;
		rows?: number;
		min?: number;
		max?: number;
		step?: number | string;
		class?: string;
		labelExtra?: Snippet;
		oncommit?: (value: string | number | null) => void;
		'aria-label'?: string;
	};

	let {
		label = '',
		value = $bindable(''),
		placeholder = 'Add…',
		id,
		disabled = false,
		type = 'text',
		variant = 'field',
		layout = 'stacked',
		hideLabel = false,
		wide = false,
		truncate = false,
		nullable = false,
		rows = 4,
		min,
		max,
		step,
		class: className = '',
		labelExtra,
		oncommit,
		'aria-label': ariaLabel
	}: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let inputEl = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

	const resolvedAriaLabel = $derived(ariaLabel ?? label);

	function isValueEmpty(): boolean {
		if (type === 'number') {
			if (value === '' || value === null || value === undefined) return true;
			const numeric = typeof value === 'number' ? value : Number(value);
			return !Number.isFinite(numeric);
		}

		const text = typeof value === 'string' ? value : String(value ?? '');
		return text.trim().length === 0;
	}

	const displayText = $derived.by(() => {
		if (isValueEmpty()) return '';

		if (type === 'number') {
			const numeric = typeof value === 'number' ? value : Number(value);
			return Number.isFinite(numeric) ? String(numeric) : '';
		}

		return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
	});
	const isEmpty = $derived(isValueEmpty());

	function readDraft() {
		if (isValueEmpty()) return '';

		if (type === 'number') {
			return typeof value === 'number' ? String(value) : String(value ?? '');
		}

		return typeof value === 'string' ? value : String(value ?? '');
	}

	function commitDraft() {
		if (type === 'number') {
			if (draft.trim() === '') {
				if (nullable) {
					value = null;
					oncommit?.(null);
				}
				return;
			}

			const parsed = Number.parseInt(draft, 10);
			if (Number.isFinite(parsed)) {
				value = parsed;
				oncommit?.(parsed);
			}
			return;
		}

		value = draft;
		oncommit?.(draft);
	}

	async function activate() {
		if (disabled || editing) return;

		draft = readDraft();
		editing = true;
		await tick();

		if (!inputEl) return;

		inputEl.focus();
		if (type !== 'number' && draft.length > 0) {
			inputEl.select();
		}
	}

	function finishEditing(commit: boolean) {
		if (!editing) return;

		if (commit) {
			commitDraft();
		}

		editing = false;
	}

	function handleDisplayKeydown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			void activate();
		}
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			finishEditing(false);
			return;
		}

		if (type !== 'textarea' && event.key === 'Enter') {
			event.preventDefault();
			finishEditing(true);
		}
	}

	function handleInputBlur() {
		finishEditing(true);
	}
</script>

{#if variant === 'heading'}
	<h1 class="inline-editable-heading">
		{#if editing}
			<input
				bind:this={inputEl}
				{id}
				class="inline-editable-control inline-editable-control-heading"
				type={type === 'textarea' ? 'text' : type}
				bind:value={draft}
				{min}
				{max}
				{step}
				aria-label={resolvedAriaLabel}
				onkeydown={handleInputKeydown}
				onblur={handleInputBlur}
			/>
		{:else}
			<button
				type="button"
				class="inline-editable-display inline-editable-display-heading"
				class:inline-editable-empty={isEmpty}
				class:inline-editable-display-truncate={truncate}
				title={truncate && !isEmpty ? displayText : undefined}
				{disabled}
				aria-label={resolvedAriaLabel}
				onclick={activate}
				onkeydown={handleDisplayKeydown}
			>
				{displayText || placeholder}
			</button>
		{/if}
	</h1>
{:else}
	<div
		class={['inline-editable-field', className].filter(Boolean).join(' ')}
		class:inline-editable-field-wide={wide}
		class:inline-editable-field-inline={layout === 'inline'}
	>
		{#if label && !hideLabel}
			<div class="inline-editable-label-row" id={id ? `${id}-label` : undefined}>
				<span class="inline-editable-label">{label}</span>
				{@render labelExtra?.()}
			</div>
		{/if}

		{#if editing}
			{#if type === 'textarea'}
				<textarea
					bind:this={inputEl}
					{id}
					class="inline-editable-control inline-editable-control-textarea"
					bind:value={draft}
					aria-label={resolvedAriaLabel}
					aria-labelledby={label && id ? `${id}-label` : undefined}
					{rows}
					onkeydown={handleInputKeydown}
					onblur={handleInputBlur}
				></textarea>
			{:else}
				<input
					bind:this={inputEl}
					{id}
					class="inline-editable-control"
					{type}
					bind:value={draft}
					{min}
					{max}
					{step}
					aria-label={resolvedAriaLabel}
					aria-labelledby={label && id ? `${id}-label` : undefined}
					onkeydown={handleInputKeydown}
					onblur={handleInputBlur}
				/>
			{/if}
		{:else}
			<button
				type="button"
				class="inline-editable-display"
				class:inline-editable-display-block={wide}
				class:inline-editable-empty={isEmpty}
				class:inline-editable-display-truncate={truncate}
				title={truncate && !isEmpty ? displayText : undefined}
				{disabled}
				aria-label={resolvedAriaLabel}
				aria-labelledby={label && id ? `${id}-label` : undefined}
				onclick={activate}
				onkeydown={handleDisplayKeydown}
			>
				{displayText || placeholder}
			</button>
		{/if}
	</div>
{/if}

<style>
	.inline-editable-field {
		display: grid;
		gap: 0.2rem;
	}

	.inline-editable-field-inline {
		grid-template-columns: 6.75rem minmax(0, 1fr);
		align-items: center;
		gap: var(--space-field);
	}

	.inline-editable-field-wide {
		grid-column: 1 / -1;
	}

	.inline-editable-label-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
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
		cursor: text;
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

	.inline-editable-display-block {
		white-space: pre-wrap;
		min-height: 3.5rem;
	}

	.inline-editable-display-truncate {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inline-editable-control {
		width: 100%;
		margin: 0;
	}

	.inline-editable-control-textarea {
		resize: vertical;
		min-height: 5rem;
	}

	.inline-editable-heading {
		margin: 0;
		font-size: clamp(1.5rem, 5vw, 2rem);
		line-height: 1.15;
		font-family: var(--font-display);
		font-weight: 700;
	}

	.inline-editable-display-heading {
		padding: 0.1rem 0.25rem;
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		line-height: inherit;
	}

	.inline-editable-control-heading {
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		line-height: inherit;
		padding: 0.25rem 0.35rem;
	}
</style>
