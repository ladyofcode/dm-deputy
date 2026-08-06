<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { focusDraftRowInput } from '$lib/actions/focus-draft-row';
	import { STORY_NODE_KIND_LABELS, type StoryNodeKind } from '$lib/types/schema';

	type StoryNodeLine = {
		id: string;
		title: string;
		kind: StoryNodeKind;
	};

	type Props = {
		onSave?: (lines: { title: string; kind: StoryNodeKind }[]) => Promise<void>;
	};

	let { onSave }: Props = $props();

	let nodeLines = $state<StoryNodeLine[]>([
		{ id: crypto.randomUUID(), title: '', kind: 'exploration' }
	]);
	let nodeTitleInputs = $state<Record<string, HTMLInputElement | undefined>>({});
	let saving = $state(false);
	let error = $state<string | null>(null);

	function addNodeLine() {
		nodeLines = [...nodeLines, { id: crypto.randomUUID(), title: '', kind: 'exploration' }];
	}

	async function handleNodeKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const newLine = { id: crypto.randomUUID(), title: '', kind: 'exploration' as const };
		nodeLines = [...nodeLines, newLine];
		await focusDraftRowInput(() => nodeTitleInputs[newLine.id]);
	}

	async function saveNewNodes(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const lines = nodeLines
			.map((line) => ({ title: line.title.trim(), kind: line.kind }))
			.filter((line) => line.title.length > 0);

		if (lines.length === 0) return;

		saving = true;
		error = null;

		try {
			await onSave?.(lines);
			nodeLines = [{ id: crypto.randomUUID(), title: '', kind: 'exploration' }];
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save story nodes';
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
				<ul class="story-node-lines list-plain">
					{#each nodeLines as line, index (line.id)}
						<li class="story-node-line">
							<input
								bind:this={nodeTitleInputs[line.id]}
								bind:value={line.title}
								placeholder="Node title"
								aria-label="Story node title"
								onkeydown={handleNodeKeydown}
							/>
							<select bind:value={line.kind} aria-label="Story node type">
								<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
								<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
							</select>
							{#if index === nodeLines.length - 1}
								<Button.Root
									type="button"
									data-variant="icon"
									onclick={addNodeLine}
									aria-label="Add story node line"
								>
									+
								</Button.Root>
							{/if}
						</li>
					{/each}
				</ul>
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
		padding: var(--space-page);
		pointer-events: none;
	}

	.story-nodes-empty-panel {
		width: min(100%, 32rem);
		padding: var(--space-page);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-panel, 0.75rem);
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
