<script lang="ts">
	import { Button } from 'bits-ui';
	import { cycleName, pickRandomExcluding } from '$lib/domain/name-generator';

	type Props = {
		id: string;
		label: string;
		names: readonly string[];
		value?: string;
	};

	let { id, label, names, value = $bindable('') }: Props = $props();

	$effect(() => {
		if (!value && names.length) {
			value = pickRandomExcluding(names, null);
		}
	});

	function shuffle() {
		value = pickRandomExcluding(names, value || null);
	}

	function cycle(direction: 'prev' | 'next') {
		value = cycleName(names, value, direction);
	}
</script>

<div class="name-field">
	<label for={id}>{label}</label>
	<div class="name-controls">
		<Button.Root type="button" data-variant="icon" aria-label="Previous {label}" onclick={() => cycle('prev')}>
			←
		</Button.Root>
		<input {id} type="text" bind:value readonly />
		<Button.Root type="button" data-variant="icon" aria-label="Next {label}" onclick={() => cycle('next')}>
			→
		</Button.Root>
		<Button.Root type="button" data-variant="icon" aria-label="Shuffle {label}" onclick={shuffle}>
			↻
		</Button.Root>
	</div>
</div>

<style>
	.name-field {
		display: grid;
		gap: 0.35rem;
	}

	label {
		font-size: 0.88rem;
		font-weight: 600;
	}

	.name-controls {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	input {
		flex: 1 1 auto;
		min-width: 0;
	}
</style>
