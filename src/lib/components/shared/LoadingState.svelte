<script lang="ts">
	type Props = {
		message?: string;
	};

	let { message = 'Loading…' }: Props = $props();
</script>

<p class="hint">{message}</p>
