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
		node: StoryNode | null;
		allNodes: StoryNode[];
		onSave?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), node, allNodes, onSave }: Props = $props();

	let title = $state('');
	let kind = $state<StoryNodeKind>('exploration');
	let summary = $state('');
	let previousNodeId = $state('');
	let difficulty = $state('');
	let error = $state<string | null>(null);

	const parentOptions = $derived(
		allNodes.filter((candidate) => candidate.node_id !== node?.node_id)
	);

	$effect(() => {
		if (!open || !node) return;

		title = node.title;
		kind = node.kind;
		summary = node.summary;
		previousNodeId = node.parent_node_ids?.[0] ?? '';
		difficulty = node.difficulty ?? '';
		error = null;
	});

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!node) return;

		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = 'Name is required.';
			return;
		}

		const parentNodeIds = previousNodeId ? [previousNodeId] : [];

		if (wouldCreateParentCycle(allNodes, node.node_id, parentNodeIds)) {
			error = 'That sequence would create a loop.';
			return;
		}

		const nextNode = normalizeStoryNode({
			...node,
			title: trimmedTitle,
			kind,
			summary: summary.trim(),
			parent_node_ids: parentNodeIds,
			difficulty: kind === 'encounter' ? difficulty.trim() || null : null
		});

		onSave?.(nextNode);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-wide dialog-stacked">
			<Dialog.Title>Edit story node</Dialog.Title>
			<Dialog.Description>Update this node&apos;s details and place in the sequence.</Dialog.Description>

			{#if node}
				<form onsubmit={handleSubmit}>
					<div class="field">
						<Label.Root for="edit_story_node_title">Name</Label.Root>
						<input
							id="edit_story_node_title"
							bind:value={title}
							placeholder="Node title"
							required
						/>
					</div>

					<div class="field">
						<Label.Root for="edit_story_node_summary">Summary</Label.Root>
						<textarea
							id="edit_story_node_summary"
							bind:value={summary}
							rows="4"
							placeholder="What happens here?"
						></textarea>
					</div>

					<div class="field">
						<Label.Root for="edit_story_node_kind">Type</Label.Root>
						<select id="edit_story_node_kind" bind:value={kind}>
							<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
							<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
						</select>
					</div>

					<div class="field">
						<Label.Root for="edit_story_node_previous">Comes after</Label.Root>
						<p class="hint">Choose the previous node in the sequence.</p>
						<select id="edit_story_node_previous" bind:value={previousNodeId}>
							<option value="">Start of sequence (first node)</option>
							{#each parentOptions as parent (parent.node_id)}
								<option value={parent.node_id}>
									{STORY_NODE_KIND_LABELS[parent.kind]} · {parent.title}
								</option>
							{/each}
						</select>
					</div>

					{#if kind === 'encounter'}
						<div class="field">
							<Label.Root for="edit_story_node_difficulty">Difficulty</Label.Root>
							<input
								id="edit_story_node_difficulty"
								bind:value={difficulty}
								placeholder="e.g. medium"
							/>
						</div>
					{/if}

					{#if error}
						<p class="hint">{error}</p>
					{/if}

					<div class="dialog-footer">
						<Button.Root type="button" onclick={() => (open = false)}>Cancel</Button.Root>
						<Button.Root type="submit" data-variant="primary">Save</Button.Root>
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
