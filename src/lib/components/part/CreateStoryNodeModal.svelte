<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { STORY_NODE_KIND_LABELS, type StoryNode, type StoryNodeKind } from '$lib/types/schema';

	type Step = 'title' | 'type' | 'summary';

	type Props = {
		open?: boolean;
		onCreate?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), onCreate }: Props = $props();

	let step = $state<Step>('title');
	let kind = $state<StoryNodeKind>('exploration');
	let title = $state('');
	let summary = $state('');
	let difficulty = $state('');

	function resetForm() {
		step = 'title';
		kind = 'exploration';
		title = '';
		summary = '';
		difficulty = '';
	}

	function buildNode(): StoryNode | null {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) return null;

		const node: StoryNode = {
			node_id: `node-${crypto.randomUUID()}`,
			kind,
			title: trimmedTitle,
			summary: summary.trim(),
			parent_node_ids: []
		};

		if (kind === 'encounter') {
			node.difficulty = difficulty.trim() || null;
		}

		return node;
	}

	function handleTitleContinue(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim()) return;
		step = 'type';
	}

	function handleTypeContinue(event: SubmitEvent) {
		event.preventDefault();
		step = 'summary';
	}

	function handleCreate(event: SubmitEvent) {
		event.preventDefault();

		const node = buildNode();
		if (!node) return;

		onCreate?.(node);
		resetForm();
		open = false;
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) resetForm();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content>
			<Dialog.Title>Add story node</Dialog.Title>
			<Dialog.Description>
				{#if step === 'title'}
					Start with a title for this node.
				{:else if step === 'type'}
					Choose whether this is exploration or an encounter.
				{:else}
					Add a summary and any encounter details. Set XP on reward items after creating the node.
				{/if}
			</Dialog.Description>

			{#if step === 'title'}
				<form onsubmit={handleTitleContinue}>
					<div class="field">
						<Label.Root for="story_node_title">Title</Label.Root>
						<input id="story_node_title" bind:value={title} required placeholder="Node title" />
					</div>

					<div class="dialog-footer">
						<Dialog.Close>
							{#snippet child({ props })}
								<Button.Root {...props} type="button">Cancel</Button.Root>
							{/snippet}
						</Dialog.Close>
						<Button.Root type="submit" data-variant="primary">Continue</Button.Root>
					</div>
				</form>
			{:else if step === 'type'}
				<form onsubmit={handleTypeContinue}>
					<div class="field">
						<Label.Root for="story_node_kind">Type</Label.Root>
						<select id="story_node_kind" bind:value={kind}>
							<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
							<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
						</select>
					</div>

					<div class="dialog-footer">
						<Button.Root type="button" onclick={() => (step = 'title')}>Back</Button.Root>
						<Button.Root type="submit" data-variant="primary">Continue</Button.Root>
					</div>
				</form>
			{:else}
				<form onsubmit={handleCreate}>
					<div class="field">
						<Label.Root for="story_node_summary">Summary</Label.Root>
						<textarea
							id="story_node_summary"
							bind:value={summary}
							rows="3"
							placeholder="What happens here?"
						></textarea>
					</div>

					{#if kind === 'encounter'}
						<div class="field">
							<Label.Root for="story_node_difficulty">Difficulty</Label.Root>
							<input id="story_node_difficulty" bind:value={difficulty} placeholder="e.g. medium" />
						</div>
					{/if}

					<div class="dialog-footer">
						<Button.Root type="button" onclick={() => (step = 'type')}>Back</Button.Root>
						<Button.Root type="submit" data-variant="primary">Create node</Button.Root>
					</div>
				</form>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}
</style>
