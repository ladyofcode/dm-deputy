<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Tooltip } from 'bits-ui';
	import SessionZeroCategorySections from '$lib/components/campaign/SessionZeroCategorySections.svelte';
	import SessionZeroQuestionHint from '$lib/components/campaign/SessionZeroQuestionHint.svelte';
	import SessionZeroQuestionsModal from '$lib/components/campaign/SessionZeroQuestionsModal.svelte';
	import {
		createEmptySessionZeroState,
		defaultActiveQuestionIds,
		emptySessionZeroAnswers,
		groupActiveQuestionsBySection,
		groupSectionsByCategory,
		sortSessionZeroQuestionIds
	} from '$lib/domain/session-zero-questions';
	import { getCampaignById, getSessionZeroForCampaign } from '$lib/data';
	import { persistSessionZero } from '$lib/data/writes';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { database } from '$lib/stores/database.svelte';

	const AUTOSAVE_DELAY_MS = 400;

	const campaignId = $derived(page.params.campaignId ?? '');

	const campaign = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getCampaignById(campaignId);
	});

	let answers = $state<Record<string, string>>(emptySessionZeroAnswers());
	let activeQuestionIds = $state<string[]>(defaultActiveQuestionIds());
	let saving = $state(false);
	let error = $state<string | null>(null);
	let initializedForCampaignId = $state<string | null>(null);
	let saveTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	const visibleQuestionBlocks = $derived(
		groupSectionsByCategory(groupActiveQuestionsBySection(activeQuestionIds))
	);
	const visibleQuestionCount = $derived(
		visibleQuestionBlocks.reduce(
			(count, block) =>
				count +
				block.sections.reduce(
					(sectionCount, section) => sectionCount + section.questions.length,
					0
				),
			0
		)
	);

	$effect(() => {
		if (!database.isReady || !campaignId || initializedForCampaignId === campaignId) return;

		const stored = getSessionZeroForCampaign(campaignId);
		const emptyState = createEmptySessionZeroState();

		answers = {
			...emptyState.answers,
			...(stored?.answers ?? {})
		};
		activeQuestionIds = stored?.activeQuestionIds?.length
			? sortSessionZeroQuestionIds(stored.activeQuestionIds)
			: emptyState.activeQuestionIds;
		initializedForCampaignId = campaignId;
	});

	async function saveSessionZero() {
		if (saving || !campaignId) return;

		saving = true;
		error = null;

		try {
			await persistSessionZero(campaignId, {
				answers,
				activeQuestionIds: sortSessionZeroQuestionIds(activeQuestionIds)
			});
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save Session 0');
		} finally {
			saving = false;
		}
	}

	function scheduleAutosave() {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		saveTimer = setTimeout(() => {
			saveTimer = null;
			void saveSessionZero();
		}, AUTOSAVE_DELAY_MS);
	}

	function handleAnswerInput() {
		scheduleAutosave();
	}

	function handleQuestionsChange() {
		void saveSessionZero();
	}

	function completePage() {
		activeQuestionIds = activeQuestionIds.filter((id) => answers[id]?.trim());
		void saveSessionZero();
	}
</script>

<svelte:head>
	<title>Session 0 · {campaign?.campaign_name ?? 'Campaign'} · DM Deputy</title>
</svelte:head>

{#if database.isReady && !campaign}
	<section class="page-stack page-stack--compact">
		<h1>Campaign not found</h1>
		<Button.Root href={resolve('/')} data-variant="plain">Back to home</Button.Root>
	</section>
{:else}
	<section class="page-stack page-stack--compact">
		<nav aria-label="Back to campaign">
			<Button.Root href={resolveCampaignHref(campaignId)} data-variant="plain">←</Button.Root>
		</nav>

		<header class="session-zero-header">
			<div class="session-zero-header-row">
				<div>
					<p class="eyebrow">{campaign?.campaign_name ?? ''}</p>
					<h1>Session 0</h1>
				</div>
				<SessionZeroQuestionsModal bind:activeQuestionIds onchange={handleQuestionsChange} />
			</div>
			<div class="session-zero-welcome">
				<p>Welcome to session 0! We'll cover:</p>
				<ul>
					<li>Conduct and house rules</li>
					<li>Character Creation</li>
					<li>Mechanics</li>
					<li>Start the game! (hook)</li>
				</ul>
			</div>
		</header>

		<form
			class="session-zero-form page-stack--compact"
			onsubmit={(event) => event.preventDefault()}
		>
			<Tooltip.Provider delayDuration={200}>
				<SessionZeroCategorySections
					blocks={visibleQuestionBlocks}
					idPrefix="session-zero-page-category"
				>
					{#snippet children({ section })}
						{#each section.questions as question (question.id)}
							<div class="field">
								<SessionZeroQuestionHint {question} variant="label" />
								<input
									id={`session-zero-${question.id}`}
									bind:value={answers[question.id]}
									placeholder="Your answer"
									oninput={handleAnswerInput}
								/>
							</div>
						{/each}
					{/snippet}
				</SessionZeroCategorySections>
			</Tooltip.Provider>

			{#if visibleQuestionCount === 0}
				<p class="hint">No questions on the page. Use Questions to add some back.</p>
			{/if}

			{#if error}
				<p class="hint">{error}</p>
			{/if}

			{#if saving}
				<p class="hint">Saving…</p>
			{/if}

			<div class="actions-row form-submit">
				<Button.Root type="button" data-variant="primary" onclick={completePage}>
					Complete page
				</Button.Root>
			</div>
		</form>
	</section>
{/if}

<style>
	.session-zero-welcome {
		display: grid;
		gap: 0.5rem;
	}

	.session-zero-welcome p {
		margin: 0;
	}

	.session-zero-welcome ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.session-zero-header h1 {
		margin: 0;
	}

	.session-zero-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.session-zero-form {
		display: grid;
		gap: 1.5rem;
	}
</style>
