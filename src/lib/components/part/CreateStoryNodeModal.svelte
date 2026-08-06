<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { normalizeStoryNode } from '$lib/data/part-story';
	import { wouldCreateParentCycle } from '$lib/domain/story-node-tree';
	import {
		STORY_NODE_KIND_LABELS,
		type StoryNode,
		type StoryNodeKind
	} from '$lib/types/schema';

	type Props = {
		open?: boolean;
		nodes?: StoryNode[];
		onCreate?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), nodes = [], onCreate }: Props = $props();

	let title = $state('');
	let kind = $state<StoryNodeKind>('exploration');
	let summary = $state('');
	let previousNodeId = $state('');
	let difficulty = $state('');
	let error = $state<string | null>(null);

	function resetForm() {
		title = '';
		kind = 'exploration';
		summary = '';
		previousNodeId = nodes.length > 0 ? (nodes[nodes.length - 1]?.node_id ?? '') : '';
		difficulty = '';
		error = null;
	}

	function handleCreate(event: SubmitEvent) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = 'Name is required.';
			return;
		}

		const nodeId = `node-${crypto.randomUUID()}`;
		const parentNodeIds = previousNodeId ? [previousNodeId] : [];

		if (wouldCreateParentCycle(nodes, nodeId, parentNodeIds)) {
			error = 'That sequence would create a loop.';
			return;
		}

		const node = normalizeStoryNode({
			node_id: nodeId,
			kind,
			title: trimmedTitle,
			summary: summary.trim(),
			parent_node_ids: parentNodeIds,
			difficulty: kind === 'encounter' ? difficulty.trim() || null : null
		});

		onCreate?.(node);
		resetForm();
		open = false;
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (isOpen) resetForm();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>Add story node</Dialog.Title>
			<Dialog.Description>Add a new node to this part&apos;s story canvas.</Dialog.Description>

			<form onsubmit={handleCreate}>
				<div class="field">
					<Label.Root for="story_node_title">Name</Label.Root>
					<input id="story_node_title" bind:value={title} required placeholder="Node title" />
				</div>

				<div class="field">
					<Label.Root for="story_node_summary">Summary</Label.Root>
					<textarea
						id="story_node_summary"
						bind:value={summary}
						rows="4"
						placeholder="What happens here?"
					></textarea>
				</div>

				<div class="field">
					<Label.Root for="story_node_kind">Type</Label.Root>
					<select id="story_node_kind" bind:value={kind}>
						<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
						<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
					</select>
				</div>

				<div class="field">
					<Label.Root for="story_node_previous">Comes after</Label.Root>
					<p class="hint">Choose the previous node in the sequence.</p>
					<select id="story_node_previous" bind:value={previousNodeId}>
						<option value="">Start of sequence (first node)</option>
						{#each nodes as parent (parent.node_id)}
							<option value={parent.node_id}>
								{STORY_NODE_KIND_LABELS[parent.kind]} · {parent.title}
							</option>
						{/each}
					</select>
				</div>

				{#if kind === 'encounter'}
					<div class="field">
						<Label.Root for="story_node_difficulty">Difficulty</Label.Root>
						<input id="story_node_difficulty" bind:value={difficulty} placeholder="e.g. medium" />
					</div>
				{/if}

				{#if error}
					<p class="hint">{error}</p>
				{/if}

				<div class="dialog-footer">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button.Root {...props} type="button">Cancel</Button.Root>
						{/snippet}
					</Dialog.Close>
					<Button.Root type="submit" data-variant="primary">Create node</Button.Root>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}
</style>
