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
	aria-hidden="true"
>
	<path d="M18 6 6 18" />
	<path d="m6 6 12 12" />
</svg>
