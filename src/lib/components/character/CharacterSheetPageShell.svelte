<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		navLabel: string;
		backHref: string;
		backLabel?: string;
		title: string;
		subtitle?: string;
		headerActions?: Snippet;
		extraSections?: Snippet;
		error?: string | null;
		secondaryAction?: Snippet;
		form: Snippet;
	};

	let {
		navLabel,
		backHref,
		backLabel = 'Library',
		title,
		subtitle = '',
		headerActions,
		extraSections,
		error = null,
		secondaryAction,
		form
	}: Props = $props();
</script>

<section class="page-stack character-sheet-page">
	<nav class="sheet-nav" aria-label={navLabel}>
		<Button.Root href={backHref} data-variant="plain">← {backLabel}</Button.Root>
	</nav>

	<header class="sheet-page-header">
		<div class="sheet-page-header-text">
			{#if subtitle}
				<p class="eyebrow">{subtitle}</p>
			{/if}
			<h1>{title}</h1>
		</div>
		{#if headerActions}
			{@render headerActions()}
		{/if}
	</header>

	<div class="sheet-page-form">
		{@render form()}

		{#if extraSections}
			{@render extraSections()}
		{/if}

		{#if error}
			<p class="hint error" role="alert">{error}</p>
		{/if}

		{#if secondaryAction}
			<div class="actions-row">
				{@render secondaryAction()}
			</div>
		{/if}
	</div>
</section>

<style>
	.sheet-page-header {
		display: grid;
		gap: 0.35rem;
	}

	.sheet-page-header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 5vw, 2rem);
		line-height: 1.15;
	}
</style>
