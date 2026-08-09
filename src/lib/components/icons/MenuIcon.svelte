<script lang="ts">
	type Props = {
		size?: number;
		title?: string;
		open?: boolean;
	};

	let { size = 24, title, open = false }: Props = $props();
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
	{#if open}
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	{:else}
		<path d="M4 6h16" />
		<path d="M4 12h16" />
		<path d="M4 18h16" />
	{/if}
</svg>
