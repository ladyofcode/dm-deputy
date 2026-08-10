<script lang="ts">
	import { Button, Tooltip } from 'bits-ui';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import SessionZeroCategorySections from '$lib/components/campaign/SessionZeroCategorySections.svelte';
	import SessionZeroQuestionHint from '$lib/components/campaign/SessionZeroQuestionHint.svelte';
	import {
		groupActiveQuestionsBySection,
		groupExcludedQuestionsBySection,
		groupSectionsByCategory,
		sortSessionZeroQuestionIds
	} from '$lib/domain/session-zero-questions';

	type Props = {
		activeQuestionIds: string[];
		onchange?: () => void;
		open?: boolean;
	};

	let { activeQuestionIds = $bindable([]), onchange, open = $bindable(false) }: Props = $props();

	const activeQuestionBlocks = $derived(
		groupSectionsByCategory(groupActiveQuestionsBySection(activeQuestionIds))
	);
	const excludedQuestionBlocks = $derived(
		groupSectionsByCategory(groupExcludedQuestionsBySection(activeQuestionIds))
	);

	const activeQuestionCount = $derived(
		activeQuestionBlocks.reduce(
			(count, block) =>
				count +
				block.sections.reduce(
					(sectionCount, section) => sectionCount + section.questions.length,
					0
				),
			0
		)
	);
	const excludedQuestionCount = $derived(
		excludedQuestionBlocks.reduce(
			(count, block) =>
				count +
				block.sections.reduce(
					(sectionCount, section) => sectionCount + section.questions.length,
					0
				),
			0
		)
	);

	function removeQuestion(questionId: string) {
		activeQuestionIds = activeQuestionIds.filter((id) => id !== questionId);
		onchange?.();
	}

	function addQuestion(questionId: string) {
		activeQuestionIds = sortSessionZeroQuestionIds([...activeQuestionIds, questionId]);
		onchange?.();
	}
</script>

<Button.Root type="button" data-variant="ghost" onclick={() => (open = true)}>
	Questions
</Button.Root>

<AppDialog
	bind:open
	title="Session 0 questions"
	description="Manage which questions appear on the page. Removing a question hides it without deleting its answer."
>
	<div class="question-manage-sections">
		<Tooltip.Provider delayDuration={200}>
			<section class="question-manage-section" aria-labelledby="session-zero-active-heading">
				<h2 id="session-zero-active-heading">On the page</h2>
				{#if activeQuestionCount === 0}
					<EmptyState message="No questions on the page yet." />
				{:else}
					<SessionZeroCategorySections
						blocks={activeQuestionBlocks}
						headingLevel={3}
						subheadingLevel={4}
						idPrefix="session-zero-modal-active-category"
					>
						{#snippet children({ section })}
							<ul class="question-manage-list list-plain">
								{#each section.questions as question (question.id)}
									<li class="question-manage-row">
										<SessionZeroQuestionHint {question} />
										<Button.Root
											type="button"
											class="question-manage-action"
											aria-label={`Remove ${question.prompt}`}
											onclick={() => removeQuestion(question.id)}
										>
											<CloseIcon size={18} />
										</Button.Root>
									</li>
								{/each}
							</ul>
						{/snippet}
					</SessionZeroCategorySections>
				{/if}
			</section>

			<section class="question-manage-section" aria-labelledby="session-zero-excluded-heading">
				<h2 id="session-zero-excluded-heading">Excluded</h2>
				{#if excludedQuestionCount === 0}
					<EmptyState message="All questions are on the page." />
				{:else}
					<SessionZeroCategorySections
						blocks={excludedQuestionBlocks}
						headingLevel={3}
						subheadingLevel={4}
						idPrefix="session-zero-modal-excluded-category"
					>
						{#snippet children({ section })}
							<ul class="question-manage-list list-plain">
								{#each section.questions as question (question.id)}
									<li class="question-manage-row">
										<SessionZeroQuestionHint {question} />
										<Button.Root
											type="button"
											class="question-manage-action"
											aria-label={`Add ${question.prompt}`}
											onclick={() => addQuestion(question.id)}
										>
											<AddIcon />
										</Button.Root>
									</li>
								{/each}
							</ul>
						{/snippet}
					</SessionZeroCategorySections>
				{/if}
			</section>
		</Tooltip.Provider>
	</div>
	{#snippet footer()}
		<div class="dialog-footer">
			<Button.Root type="button" data-variant="primary" onclick={() => (open = false)}>
				Done
			</Button.Root>
		</div>
	{/snippet}
</AppDialog>

<style>
	.question-manage-sections {
		display: grid;
		gap: 1.25rem;
	}

	.question-manage-section h2 {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
	}

	.question-manage-section :global(.session-zero-category) {
		margin-top: 0.25rem;
	}

	.question-manage-section :global(.session-zero-category-heading) {
		font-size: 0.875rem;
	}

	.question-manage-section :global(.session-zero-subcategory-heading) {
		font-size: 0.8125rem;
	}

	.question-manage-list {
		display: grid;
		gap: 0.5rem;
	}

	.question-manage-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.question-manage-row :global(.session-zero-question-prompt) {
		min-width: 0;
	}

	.question-manage-row :global(.question-manage-action) {
		position: relative;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.75rem;
		min-height: 2.75rem;
		padding: 0.15rem 0.35rem;
		border: none;
		background: transparent;
		box-shadow: none;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.question-manage-row :global(.question-manage-action::before) {
		content: '';
		position: absolute;
		inset: -0.375rem;
	}

	.question-manage-row :global(.question-manage-action:hover:not(:disabled)) {
		border: none;
		background: transparent;
		box-shadow: none;
		color: var(--color-accent);
	}
</style>
