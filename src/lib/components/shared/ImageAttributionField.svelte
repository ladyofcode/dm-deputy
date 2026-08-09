<script lang="ts">
	import FormField from '$lib/components/shared/FormField.svelte';

	type Props = {
		id: string;
		value?: string;
	};

	let { id, value = $bindable('') }: Props = $props();
</script>

<FormField label="Image source (optional)" {id}>
	<input {id} bind:value placeholder="https://… or artist / book / notes" autocomplete="off" />
</FormField>
