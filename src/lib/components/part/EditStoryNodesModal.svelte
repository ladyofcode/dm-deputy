<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import EditStoryNodeDetailModal from '$lib/components/part/EditStoryNodeDetailModal.svelte';
	import {
		cloneStoryNodes,
		flattenStoryNodeTree,
		parentTitlesForNode,
		removeStoryNode,
		updateStoryNode
	} from '$lib/domain/story-node-tree';
	import { STORY_NODE_KIND_LABELS, type StoryNode } from '$lib/types/schema';

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

	const treeRows = $derived(flattenStoryNodeTree(draftNodes));
	const detailNode = $derived(
		detailNodeId ? (draftNodes.find((node) => node.node_id === detailNodeId) ?? null) : null
	);

	$effect(() => {
		if (!open) return;
		draftNodes = cloneStoryNodes(nodes);
		detailNodeId = null;
		showDetailModal = false;
		error = null;
	});

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
			error = cause instanceof Error ? cause.message : 'Could not save story nodes';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>Edit story nodes</Dialog.Title>
			<Dialog.Description>
				Update titles here, then open details to edit summaries and parent branches.
			</Dialog.Description>

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
										{#if parents.length > 0}
											<span class="parent-summary">
												{#if parents.length > 1}
													Branch from {parents.join(' + ')}
												{:else}
													After {parents[0]}
												{/if}
											</span>
										{:else}
											<span class="parent-summary">Root node</span>
										{/if}
									</div>

									<div class="story-node-editor-controls">
										<input
											value={draftNode?.title ?? ''}
											placeholder="Node title"
											aria-label="Story node title"
											required
											oninput={(event) => {
												if (!draftNode) return;

												draftNodes = updateStoryNode(draftNodes, {
													...draftNode,
													title: (event.currentTarget as HTMLInputElement).value
												});
											}}
										/>
										<Button.Root type="button" onclick={() => openDetails(row.node.node_id)}>
											Details
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

				<div class="dialog-footer">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button.Root {...props} type="button">Cancel</Button.Root>
						{/snippet}
					</Dialog.Close>
					<Button.Root type="submit" data-variant="primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save changes'}
					</Button.Root>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<EditStoryNodeDetailModal
	bind:open={showDetailModal}
	node={detailNode}
	allNodes={draftNodes}
	onSave={handleDetailSave}
/>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}

	.story-node-editor {
		display: grid;
		gap: 0.75rem;
		max-height: min(60vh, 28rem);
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

	.parent-summary {
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}

	.story-node-editor-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.story-node-editor-controls input {
		flex: 1;
		min-width: 0;
	}

	.node-summary-preview {
		margin: 0;
		font-size: 0.86rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}
</style>
