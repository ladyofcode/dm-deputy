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
	stroke-width="2.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d="M20 6 9 17l-5-5" />
</svg>
