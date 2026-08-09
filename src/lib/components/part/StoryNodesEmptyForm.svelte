<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
	import { STORY_NODE_KIND_LABELS, type StoryNodeKind } from '$lib/types/schema';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';

	type StoryNodeLine = {
		id: string;
		title: string;
		kind: StoryNodeKind;
	};

	type Props = {
		onSave?: (lines: { title: string; kind: StoryNodeKind }[]) => Promise<void>;
	};

	let { onSave }: Props = $props();

	const nodeDraft = createDraftLines<StoryNodeLine>(() => ({
		id: crypto.randomUUID(),
		title: '',
		kind: 'exploration'
	}));

	let nodeTitleInputs = $state<Record<string, HTMLInputElement | undefined>>({});
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleNodeKeydown(event: KeyboardEvent) {
		await nodeDraft.handleEnter(event, () => {
			const newLine = nodeDraft.lines[nodeDraft.lines.length - 1];
			return newLine ? nodeTitleInputs[newLine.id] : undefined;
		});
	}

	async function saveNewNodes(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const lines = nodeDraft.lines
			.map((line) => ({ title: line.title.trim(), kind: line.kind }))
			.filter((line) => line.title.length > 0);

		if (lines.length === 0) return;

		saving = true;
		error = null;

		try {
			await onSave?.(lines);
			nodeDraft.reset();
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save story nodes');
		} finally {
			saving = false;
		}
	}
</script>

<section class="story-nodes-empty" aria-label="Add story nodes">
	<div class="story-nodes-empty-panel">
		<h2>No story nodes! Add below</h2>
		<p class="hint">Enter each node title and type. Press Enter to add another.</p>

		<form class="story-nodes-form" onsubmit={saveNewNodes}>
			<div class="field">
				<Label.Root>Story nodes</Label.Root>
				<DraftLinesForm
					lines={nodeDraft.lines}
					listClass="story-node-lines list-plain"
					lineClass="story-node-line"
					onRemove={nodeDraft.remove}
					onAdd={nodeDraft.add}
					showRemove={() => false}
				>
					{#snippet row({ line })}
						{@const nodeLine = line as StoryNodeLine}
						<input
							bind:this={nodeTitleInputs[nodeLine.id]}
							bind:value={nodeLine.title}
							placeholder="Node title"
							aria-label="Story node title"
							onkeydown={handleNodeKeydown}
						/>
						<select bind:value={nodeLine.kind} aria-label="Story node type">
							<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
							<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
						</select>
					{/snippet}
				</DraftLinesForm>
			</div>

			<div class="story-nodes-form-submit">
				{#if error}
					<p class="hint">{error}</p>
				{/if}
				<Button.Root type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button.Root>
			</div>
		</form>
	</div>
</section>

<style>
	.story-nodes-empty {
		position: fixed;
		inset: 0;
		z-index: 5;
		display: grid;
		place-items: center;
		padding: calc(var(--space-page) + env(safe-area-inset-top, 0px))
			calc(var(--space-page) + env(safe-area-inset-right, 0px))
			calc(var(--space-page) + env(safe-area-inset-bottom, 0px))
			calc(var(--space-page) + env(safe-area-inset-left, 0px));
		pointer-events: none;
	}

	.story-nodes-empty-panel {
		width: min(100%, 32rem);
		padding: var(--space-page);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-panel);
		background: var(--color-surface);
		box-shadow: 0 12px 40px var(--color-shadow);
		pointer-events: auto;
		overflow: hidden;
	}

	.story-nodes-form {
		display: grid;
		gap: var(--space-section);
		min-width: 0;
	}

	.story-nodes-empty-panel :global(.field) {
		margin-bottom: 0;
		min-width: 0;
	}

	.story-nodes-empty-panel h2 {
		margin: 0 0 var(--space-field);
		font-size: 1.1rem;
	}

	.story-nodes-form-submit {
		margin-top: var(--space-section);
	}
</style>
