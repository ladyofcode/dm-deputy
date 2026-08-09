<script lang="ts">
	type Props = {
		size?: number;
	};

	let { size = 20 }: Props = $props();
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
	<path d="m15 18-6-6 6-6" />
</svg>
