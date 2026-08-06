<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		id: string;
		label: string;
		hint: string;
		selectAriaLabel: string;
		placeholder: string;
		selectedId: string;
		submitting: boolean;
		submitBusyLabel: string;
		submitIdleLabel: string;
		options: Snippet;
		onsubmit: (event: SubmitEvent) => void | Promise<void>;
		onSelectedIdChange: (value: string) => void;
	};

	let {
		id,
		label,
		hint,
		selectAriaLabel,
		placeholder,
		selectedId,
		submitting,
		submitBusyLabel,
		submitIdleLabel,
		options,
		onsubmit,
		onSelectedIdChange
	}: Props = $props();
</script>

<form class="existing-character-form" {onsubmit}>
	<div class="field">
		<Label.Root for={id}>{label}</Label.Root>
		<p class="hint">{hint}</p>
		<div class="existing-character-row">
			<select
				{id}
				value={selectedId}
				onchange={(event) => onSelectedIdChange(event.currentTarget.value)}
				aria-label={selectAriaLabel}
			>
				<option value="">{placeholder}</option>
				{@render options()}
			</select>
			<Button.Root type="submit" disabled={!selectedId || submitting}>
				{submitting ? submitBusyLabel : submitIdleLabel}
			</Button.Root>
		</div>
	</div>
</form>

<style>
	.existing-character-form .field {
		margin-bottom: 0;
	}

	.existing-character-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.existing-character-row select {
		flex: 1;
		min-width: 0;
	}
</style>
