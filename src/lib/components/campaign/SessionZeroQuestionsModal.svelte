<script lang="ts">
	import { Button, Dialog, Tooltip } from 'bits-ui';
	import SessionZeroCategorySections from '$lib/components/campaign/SessionZeroCategorySections.svelte';
	import SessionZeroQuestionPrompt from '$lib/components/campaign/SessionZeroQuestionPrompt.svelte';
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
				count + block.sections.reduce((sectionCount, section) => sectionCount + section.questions.length, 0),
			0
		)
	);
	const excludedQuestionCount = $derived(
		excludedQuestionBlocks.reduce(
			(count, block) =>
				count + block.sections.reduce((sectionCount, section) => sectionCount + section.questions.length, 0),
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

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button.Root {...props} type="button" data-variant="ghost">Questions</Button.Root>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content>
			<Dialog.Title>Session 0 questions</Dialog.Title>
			<Dialog.Description>
				Manage which questions appear on the page. Removing a question hides it without deleting its
				answer.
			</Dialog.Description>

			<div class="question-manage-sections">
				<Tooltip.Provider delayDuration={200}>
					<section class="question-manage-section" aria-labelledby="session-zero-active-heading">
						<h2 id="session-zero-active-heading">On the page</h2>
						{#if activeQuestionCount === 0}
							<p class="hint">No questions on the page yet.</p>
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
												<SessionZeroQuestionPrompt {question} />
												<Button.Root
													type="button"
													class="question-manage-action"
													aria-label={`Remove ${question.prompt}`}
													onclick={() => removeQuestion(question.id)}
												>
													×
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
							<p class="hint">All questions are on the page.</p>
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
												<SessionZeroQuestionPrompt {question} />
												<Button.Root
													type="button"
													class="question-manage-action"
													aria-label={`Add ${question.prompt}`}
													onclick={() => addQuestion(question.id)}
												>
													+
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

			<div class="dialog-footer">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button.Root {...props} type="button">Done</Button.Root>
					{/snippet}
				</Dialog.Close>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

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
		flex-shrink: 0;
		min-width: 2rem;
		padding: 0.15rem 0.35rem;
		border: none;
		background: transparent;
		box-shadow: none;
		color: var(--color-text-muted, #667085);
		font-size: 1.1rem;
		line-height: 1;
	}

	.question-manage-row :global(.question-manage-action:hover:not(:disabled)) {
		border: none;
		background: transparent;
		box-shadow: none;
		color: var(--color-accent);
	}
</style>
