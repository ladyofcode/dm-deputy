<script lang="ts">
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import StoryNodeFields from '$lib/components/shared/StoryNodeFields.svelte';
	import { normalizeStoryNode } from '$lib/data/part-story';
	import { wouldCreateParentCycle } from '$lib/domain/story-node-tree';
	import { type StoryNode, type StoryNodeKind } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		nodes?: StoryNode[];
		onCreate?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), nodes = [], onCreate }: Props = $props();

	let title = $state('');
	let kind = $state<StoryNodeKind>('exploration');
	let summary = $state('');
	let parentNodeIds = $state<string[]>([]);
	let difficulty = $state('');
	let error = $state<string | null>(null);

	function resetForm() {
		title = '';
		kind = 'exploration';
		summary = '';
		const lastNodeId = nodes.length > 0 ? (nodes[nodes.length - 1]?.node_id ?? '') : '';
		parentNodeIds = lastNodeId ? [lastNodeId] : [];
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
		const nextParentIds = [...new Set(parentNodeIds)];

		if (wouldCreateParentCycle(nodes, nodeId, nextParentIds)) {
			error = 'Those links would create a loop.';
			return;
		}

		const node = normalizeStoryNode({
			node_id: nodeId,
			kind,
			title: trimmedTitle,
			summary: summary.trim(),
			parent_node_ids: nextParentIds,
			difficulty: kind === 'encounter' ? difficulty.trim() || null : null
		});

		onCreate?.(node);
		resetForm();
		open = false;
	}
</script>

<AppDialog
	bind:open
	title="Add story node"
	description="Add a new node to this part's story canvas."
	wide
	onOpenChange={(isOpen) => {
		if (isOpen) resetForm();
	}}
>
	<form onsubmit={handleCreate}>
		<StoryNodeFields
			idPrefix="story_node"
			bind:title
			bind:kind
			bind:summary
			bind:parentNodeIds
			bind:difficulty
			parentOptions={nodes}
		/>

		{#if error}
			<p class="hint error">{error}</p>
		{/if}

		<DialogFormFooter submitLabel="Create node" />
	</form>
</AppDialog>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}
</style>
