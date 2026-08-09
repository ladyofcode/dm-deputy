<script lang="ts">
	type Props = {
		size?: number;
		title?: string;
	};

	let { size = 16, title }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	aria-hidden={title ? undefined : true}
	role={title ? 'img' : undefined}
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if title}
		<title>{title}</title>
	{/if}
	<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
</svg>
