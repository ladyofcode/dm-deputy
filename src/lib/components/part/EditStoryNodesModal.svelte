<script lang="ts">
	import { Button } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import StoryNodeFields from '$lib/components/shared/StoryNodeFields.svelte';
	import { formatErrorMessage } from '$lib/domain/errors';
	import { normalizeStoryNode } from '$lib/data/part-story';
	import {
		cloneStoryNodes,
		flattenStoryNodeTree,
		parentTitlesForNode,
		removeStoryNode,
		updateStoryNode,
		wouldCreateParentCycle
	} from '$lib/domain/story-node-tree';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';
	import { STORY_NODE_KIND_LABELS, type StoryNode, type StoryNodeKind } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		nodes: StoryNode[];
		onSave?: (nodes: StoryNode[]) => void | Promise<void>;
	};

	let { open = $bindable(false), nodes, onSave }: Props = $props();

	let draftNodes = $state<StoryNode[]>([]);
	let detailNodeId = $state<string | null>(null);
	let showDetailModal = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	let detailTitle = $state('');
	let detailKind = $state<StoryNodeKind>('exploration');
	let detailSummary = $state('');
	let detailParentNodeIds = $state<string[]>([]);
	let detailDifficulty = $state('');
	let detailError = $state<string | null>(null);

	const treeRows = $derived(flattenStoryNodeTree(draftNodes));
	const detailNode = $derived(
		detailNodeId ? (draftNodes.find((node) => node.node_id === detailNodeId) ?? null) : null
	);
	const detailParentOptions = $derived(
		draftNodes.filter((candidate) => candidate.node_id !== detailNode?.node_id)
	);

	useDialogFormReset(
		() => open,
		() => nodes.map((node) => node.node_id).join('|'),
		() => {
			draftNodes = cloneStoryNodes(nodes);
			detailNodeId = null;
			showDetailModal = false;
			error = null;
		}
	);

	useDialogFormReset(
		() => showDetailModal,
		() => detailNode?.node_id ?? null,
		() => {
			if (!detailNode) return;
			detailTitle = detailNode.title;
			detailKind = detailNode.kind;
			detailSummary = detailNode.summary;
			detailParentNodeIds = [...(detailNode.parent_node_ids ?? [])];
			detailDifficulty = detailNode.difficulty ?? '';
			detailError = null;
		},
		{ whenKeyMissing: 'keep' }
	);

	function openDetails(nodeId: string) {
		detailNodeId = nodeId;
		showDetailModal = true;
	}

	function handleDetailSave(node: StoryNode) {
		draftNodes = updateStoryNode(draftNodes, node);
	}

	function deleteNode(nodeId: string) {
		draftNodes = removeStoryNode(draftNodes, nodeId);
		if (detailNodeId === nodeId) {
			detailNodeId = null;
			showDetailModal = false;
		}
	}

	function handleDetailSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!detailNode) return;

		const trimmedTitle = detailTitle.trim();
		if (!trimmedTitle) {
			detailError = 'Name is required.';
			return;
		}

		const nextParentIds = [...new Set(detailParentNodeIds)];

		if (wouldCreateParentCycle(draftNodes, detailNode.node_id, nextParentIds)) {
			detailError = 'Those links would create a loop.';
			return;
		}

		const nextNode = normalizeStoryNode({
			...detailNode,
			title: trimmedTitle,
			kind: detailKind,
			summary: detailSummary.trim(),
			parent_node_ids: nextParentIds,
			difficulty: detailKind === 'encounter' ? detailDifficulty.trim() || null : null
		});

		handleDetailSave(nextNode);
		showDetailModal = false;
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		const trimmed = draftNodes
			.map((node) => ({ ...node, title: node.title.trim() }))
			.filter((node) => node.title.length > 0);

		saving = true;
		error = null;

		try {
			await onSave?.(trimmed);
			open = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save story nodes');
		} finally {
			saving = false;
		}
	}
</script>

<AppDialog
	bind:open
	title="Edit story nodes"
	description="Open a node to edit its name, summary, type, and connections to other nodes."
	wide
>
	<form onsubmit={handleSave}>
		{#if draftNodes.length === 0}
			<p class="hint">No story nodes remain. Save to clear this part&apos;s story canvas.</p>
		{:else}
			<ul class="story-node-editor list-plain">
				{#each treeRows as row (row.key)}
					{@const draftNode = draftNodes.find((node) => node.node_id === row.node.node_id)}
					{@const parents = draftNode ? parentTitlesForNode(draftNode, draftNodes) : []}
					<li class="story-node-editor-row" style={`--tree-depth: ${row.depth}`}>
						<div class="story-node-editor-branch" aria-hidden="true">
							{#if row.depth > 0}
								<span class="branch-line"></span>
							{/if}
						</div>

						<div class="story-node-editor-main">
							<div class="story-node-editor-meta">
								<span class="node-kind">{STORY_NODE_KIND_LABELS[row.node.kind]}</span>
								<strong class="node-title">{draftNode?.title ?? row.node.title}</strong>
								{#if parents.length > 0}
									<span class="parent-summary">Follows {parents.join(', ')}</span>
								{:else}
									<span class="parent-summary">Entry point</span>
								{/if}
							</div>

							<div class="story-node-editor-controls">
								<Button.Root type="button" onclick={() => openDetails(row.node.node_id)}>
									Edit
								</Button.Root>
								<Button.Root
									type="button"
									data-variant="icon"
									aria-label={`Delete ${row.node.title}`}
									onclick={() => deleteNode(row.node.node_id)}
								>
									×
								</Button.Root>
							</div>

							{#if draftNode?.summary.trim()}
								<p class="node-summary-preview">{draftNode.summary}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if error}
			<p class="hint">{error}</p>
		{/if}

		<DialogFormFooter submitLabel={saving ? 'Saving…' : 'Save changes'} pending={saving} />
	</form>
</AppDialog>

<AppDialog
	bind:open={showDetailModal}
	title="Edit story node"
	description="Update this node's details and how it connects to the rest of the story."
	wide
	stacked
>
	{#if detailNode}
		<form class="detail-form" onsubmit={handleDetailSubmit}>
			<StoryNodeFields
				idPrefix="edit_story_node"
				bind:title={detailTitle}
				bind:kind={detailKind}
				bind:summary={detailSummary}
				bind:parentNodeIds={detailParentNodeIds}
				bind:difficulty={detailDifficulty}
				parentOptions={detailParentOptions}
			/>

			{#if detailError}
				<p class="hint">{detailError}</p>
			{/if}

			<DialogFormFooter
				submitLabel="Save"
				useDialogClose={false}
				onCancel={() => (showDetailModal = false)}
			/>
		</form>
	{/if}
</AppDialog>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}

	.detail-form {
		display: grid;
		gap: var(--space-section);
	}

	.story-node-editor {
		display: grid;
		gap: 0.75rem;
		max-height: min(60dvh, 28rem);
		overflow: auto;
		padding-right: 0.25rem;
	}

	.story-node-editor-row {
		display: grid;
		grid-template-columns: calc(var(--tree-depth) * 1.25rem) 1fr;
		gap: 0.5rem;
		align-items: stretch;
	}

	.story-node-editor-branch {
		display: flex;
		justify-content: flex-end;
	}

	.branch-line {
		width: 1px;
		height: 100%;
		background: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
		box-shadow: 1px 0 0 color-mix(in srgb, var(--color-accent) 20%, transparent);
	}

	.story-node-editor-main {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-surface) 88%, var(--color-bg));
	}

	.story-node-editor-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		align-items: center;
	}

	.node-kind {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.node-title {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 600;
	}

	.parent-summary {
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}

	.story-node-editor-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.node-summary-preview {
		margin: 0;
		font-size: 0.86rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}
</style>
