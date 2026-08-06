<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import StoryNodeFields from '$lib/components/shared/StoryNodeFields.svelte';
	import { normalizeStoryNode } from '$lib/data/part-story';
	import { wouldCreateParentCycle } from '$lib/domain/story-node-tree';
	import { type StoryNode, type StoryNodeKind } from '$lib/types/schema';

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
	let parentNodeIds = $state<string[]>([]);
	let difficulty = $state('');
	let error = $state<string | null>(null);
	let formKey = $state('');

	const parentOptions = $derived(
		allNodes.filter((candidate) => candidate.node_id !== node?.node_id)
	);

	$effect(() => {
		if (!open) {
			formKey = '';
			return;
		}

		if (!node) return;

		const nextKey = node.node_id;
		if (formKey === nextKey) return;

		formKey = nextKey;
		title = node.title;
		kind = node.kind;
		summary = node.summary;
		parentNodeIds = [...(node.parent_node_ids ?? [])];
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

		const nextParentIds = [...new Set(parentNodeIds)];

		if (wouldCreateParentCycle(allNodes, node.node_id, nextParentIds)) {
			error = 'Those links would create a loop.';
			return;
		}

		const nextNode = normalizeStoryNode({
			...node,
			title: trimmedTitle,
			kind,
			summary: summary.trim(),
			parent_node_ids: nextParentIds,
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
			<Dialog.Description>
				Update this node&apos;s details and how it connects to the rest of the story.
			</Dialog.Description>

			{#if node}
				<form onsubmit={handleSubmit}>
					<StoryNodeFields
						idPrefix="edit_story_node"
						bind:title
						bind:kind
						bind:summary
						bind:parentNodeIds
						bind:difficulty
						{parentOptions}
					/>

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
