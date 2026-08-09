<script lang="ts">
	type Props = {
		size?: number;
	};

	let { size = 16 }: Props = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<circle cx="12" cy="12" r="10" />
	<path d="M12 16v-4" />
	<path d="M12 8h.01" />
</svg>
