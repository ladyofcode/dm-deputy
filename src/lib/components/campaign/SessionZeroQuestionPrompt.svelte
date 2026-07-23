<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { SessionZeroQuestion } from '$lib/domain/session-zero-questions';

	type Props = {
		question: SessionZeroQuestion;
	};

	let { question }: Props = $props();
</script>

<span class="session-zero-question-prompt">
	{question.prompt}
	<Tooltip.Root>
		<Tooltip.Trigger
			class="session-zero-question-tooltip-trigger"
			type="button"
			aria-label={`More about: ${question.prompt}`}
		>
			<span aria-hidden="true">ⓘ</span>
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content class="session-zero-question-tooltip">
				<p>{question.description}</p>
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</span>

<style>
	.session-zero-question-prompt {
		display: inline-flex;
		align-items: flex-start;
		gap: 0.35rem;
		line-height: 1.4;
	}

	:global(.session-zero-question-tooltip-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: var(--color-text-muted, #667085);
		cursor: help;
	}

	:global(.session-zero-question-tooltip) {
		z-index: 60;
		max-width: min(22rem, 90vw);
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-panel, 0.75rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 24px var(--color-shadow);
	}

	:global(.session-zero-question-tooltip) p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
	}
</style>
