<script lang="ts">
	import { Label, Popover } from 'bits-ui';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import InfoIcon from '$lib/components/icons/InfoIcon.svelte';
	import type { SessionZeroQuestion } from '$lib/domain/session-zero-questions';

	type Props = {
		question: SessionZeroQuestion;
		variant?: 'label' | 'text';
	};

	let { question, variant = 'text' }: Props = $props();

	const fieldId = $derived(`session-zero-${question.id}`);
</script>

<div
	class="session-zero-question-hint"
	class:session-zero-question-hint-label={variant === 'label'}
>
	{#if variant === 'label'}
		<Label.Root for={fieldId}>{question.prompt}</Label.Root>
	{:else}
		<span class="session-zero-question-text">{question.prompt}</span>
	{/if}

	<Popover.Root>
		<Popover.Trigger
			class="session-zero-question-info-trigger"
			type="button"
			aria-label={`More about: ${question.prompt}`}
		>
			<InfoIcon />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content class="session-zero-question-info-content" side="top" align="start">
				<div class="session-zero-question-info-header">
					<p>{question.description}</p>
					<Popover.Close class="session-zero-question-info-close" aria-label="Close help">
						<CloseIcon size={16} />
					</Popover.Close>
				</div>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
</div>

<style>
	.session-zero-question-hint {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.session-zero-question-hint-label {
		align-items: center;
	}

	.session-zero-question-text {
		line-height: 1.4;
	}

	:global(.session-zero-question-info-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: var(--color-text-muted);
		cursor: help;
	}

	:global(.session-zero-question-info-trigger):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	:global(.session-zero-question-info-content) {
		z-index: 60;
		max-width: min(22rem, 90vw);
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-panel);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 24px var(--color-shadow);
	}

	.session-zero-question-info-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.session-zero-question-info-header p {
		margin: 0;
		flex: 1;
		font-size: 0.85rem;
		line-height: 1.45;
	}

	:global(.session-zero-question-info-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.15rem;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	:global(.session-zero-question-info-close):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
