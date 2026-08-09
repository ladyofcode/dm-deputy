<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		navLabel: string;
		backHref: string;
		title: string;
		subtitle?: string;
		headerActions?: Snippet;
		extraSections?: Snippet;
		loading?: boolean;
		saving?: boolean;
		error?: string | null;
		submitLabel?: string;
		submitPendingLabel?: string;
		secondaryAction?: Snippet;
		onSubmit: () => void | Promise<void>;
		form: Snippet;
	};

	let {
		navLabel,
		backHref,
		title,
		subtitle = '',
		headerActions,
		extraSections,
		loading = false,
		saving = false,
		error = null,
		submitLabel = 'Save sheet',
		submitPendingLabel = 'Saving…',
		secondaryAction,
		onSubmit,
		form
	}: Props = $props();
</script>

<section class="page-stack character-sheet-page">
	<nav class="sheet-nav" aria-label={navLabel}>
		<Button.Root href={backHref} data-variant="plain">← Library</Button.Root>
	</nav>

	<header class="sheet-page-header">
		{#if subtitle}
			<p class="eyebrow">{subtitle}</p>
		{/if}
		<h1>{title}</h1>
		{#if headerActions}
			{@render headerActions()}
		{/if}
	</header>

	<form
		class="sheet-page-form"
		onsubmit={(event) => {
			event.preventDefault();
			void onSubmit();
		}}
	>
		{@render form()}

		{#if extraSections}
			{@render extraSections()}
		{/if}

		{#if error}
			<p class="hint error" role="alert">{error}</p>
		{/if}

		<div class="actions-row">
			{#if secondaryAction}
				{@render secondaryAction()}
			{/if}
			<Button.Root type="submit" data-variant="primary" disabled={loading || saving}>
				{saving ? submitPendingLabel : submitLabel}
			</Button.Root>
		</div>
	</form>
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
