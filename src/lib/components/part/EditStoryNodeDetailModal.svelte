<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { parentTitlesForNode, wouldCreateParentCycle } from '$lib/domain/story-node-tree';
	import { STORY_NODE_KIND_LABELS, type StoryNode } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		node: StoryNode | null;
		allNodes: StoryNode[];
		onSave?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), node, allNodes, onSave }: Props = $props();

	let summary = $state('');
	let parentIds = $state<string[]>([]);
	let difficulty = $state('');
	let error = $state<string | null>(null);

	const parentOptions = $derived(
		allNodes.filter((candidate) => candidate.node_id !== node?.node_id)
	);

	$effect(() => {
		if (!open || !node) return;

		summary = node.summary;
		parentIds = [...(node.parent_node_ids ?? [])];
		difficulty = node.difficulty ?? '';
		error = null;
	});

	function toggleParent(parentId: string, checked: boolean) {
		parentIds = checked
			? [...new Set([...parentIds, parentId])]
			: parentIds.filter((id) => id !== parentId);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!node) return;

		if (wouldCreateParentCycle(allNodes, node.node_id, parentIds)) {
			error = 'Those parents would create a cycle in the story tree.';
			return;
		}

		const nextNode: StoryNode = {
			...node,
			summary: summary.trim(),
			parent_node_ids: [...parentIds]
		};

		if (node.kind === 'encounter') {
			nextNode.difficulty = difficulty.trim() || null;
		}

		onSave?.(nextNode);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-wide dialog-stacked">
			<Dialog.Title>{node?.title ?? 'Story node'}</Dialog.Title>
			<Dialog.Description>
				{#if node}
					{STORY_NODE_KIND_LABELS[node.kind]} node details and branch connections.
				{/if}
			</Dialog.Description>

			{#if node}
				<form onsubmit={handleSubmit}>
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
						<Label.Root>Parent nodes</Label.Root>
						<p class="hint">
							Select one or more parents to branch this node. Leave empty to make it a root node.
						</p>
						{#if parentOptions.length === 0}
							<p class="hint">No other nodes are available as parents yet.</p>
						{:else}
							<ul class="parent-options list-plain">
								{#each parentOptions as parent (parent.node_id)}
									<li class="parent-option">
										<label>
											<input
												type="checkbox"
												checked={parentIds.includes(parent.node_id)}
												onchange={(event) =>
													toggleParent(
														parent.node_id,
														(event.currentTarget as HTMLInputElement).checked
													)}
											/>
											<span class="parent-option-label">
												<span class="node-kind">{STORY_NODE_KIND_LABELS[parent.kind]}</span>
												{parent.title}
											</span>
										</label>
									</li>
								{/each}
							</ul>
						{/if}
						{#if parentIds.length > 1}
							<p class="hint branch-hint">
								This node branches from {parentTitlesForNode(
									{ ...node, parent_node_ids: parentIds },
									allNodes
								).join(' and ')}.
							</p>
						{/if}
					</div>

					{#if node.kind === 'encounter'}
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
						<Button.Root type="submit" data-variant="primary">Save details</Button.Root>
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

	.parent-options {
		display: grid;
		gap: 0.5rem;
		max-height: 12rem;
		overflow: auto;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.parent-option label {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		cursor: pointer;
	}

	.parent-option input {
		margin-top: 0.2rem;
	}

	.parent-option-label {
		display: grid;
		gap: 0.15rem;
	}

	.node-kind {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.branch-hint {
		margin-top: 0.35rem;
	}
</style>
