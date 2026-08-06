<script lang="ts">
	import { Label } from 'bits-ui';
	import { STORY_NODE_KIND_LABELS, type StoryNode, type StoryNodeKind } from '$lib/types/schema';

	type Props = {
		idPrefix?: string;
		title?: string;
		kind?: StoryNodeKind;
		summary?: string;
		parentNodeIds?: string[];
		difficulty?: string;
		parentOptions?: StoryNode[];
	};

	let {
		idPrefix = 'story_node',
		title = $bindable(''),
		kind = $bindable('exploration' as StoryNodeKind),
		summary = $bindable(''),
		parentNodeIds = $bindable([] as string[]),
		difficulty = $bindable(''),
		parentOptions = []
	}: Props = $props();

	function toggleParent(parentId: string, checked: boolean) {
		if (checked) {
			if (!parentNodeIds.includes(parentId)) {
				parentNodeIds = [...parentNodeIds, parentId];
			}
			return;
		}

		parentNodeIds = parentNodeIds.filter((id) => id !== parentId);
	}
</script>

<div class="field">
	<Label.Root for="{idPrefix}_title">Name</Label.Root>
	<input id="{idPrefix}_title" bind:value={title} required placeholder="Node title" />
</div>

<div class="field">
	<Label.Root for="{idPrefix}_summary">Summary</Label.Root>
	<textarea
		id="{idPrefix}_summary"
		bind:value={summary}
		rows="4"
		placeholder="What happens here?"
	></textarea>
</div>

<div class="field">
	<Label.Root for="{idPrefix}_kind">Type</Label.Root>
	<select id="{idPrefix}_kind" bind:value={kind}>
		<option value="exploration">{STORY_NODE_KIND_LABELS.exploration}</option>
		<option value="encounter">{STORY_NODE_KIND_LABELS.encounter}</option>
	</select>
</div>

<div class="field">
	<Label.Root>Follows from</Label.Root>
	<p class="hint">
		Select one or more earlier nodes. Leave empty for an entry point. Multiple selections branch
		subplots (e.g. different dungeon wings) or merge paths back together.
	</p>
	{#if parentOptions.length === 0}
		<p class="hint">No other nodes yet — this will be the first entry point.</p>
	{:else}
		<ul class="parent-options list-plain">
			{#each parentOptions as parent (parent.node_id)}
				<li>
					<label class="checkbox-field" for="{idPrefix}_parent_{parent.node_id}">
						<input
							id="{idPrefix}_parent_{parent.node_id}"
							type="checkbox"
							checked={parentNodeIds.includes(parent.node_id)}
							onchange={(event) =>
								toggleParent(parent.node_id, (event.currentTarget as HTMLInputElement).checked)}
						/>
						<span>{STORY_NODE_KIND_LABELS[parent.kind]} · {parent.title}</span>
					</label>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if kind === 'encounter'}
	<div class="field">
		<Label.Root for="{idPrefix}_difficulty">Difficulty</Label.Root>
		<input id="{idPrefix}_difficulty" bind:value={difficulty} placeholder="e.g. medium" />
	</div>
{/if}

<style>
	.parent-options {
		display: grid;
		gap: 0.35rem;
		max-height: 12rem;
		overflow: auto;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-surface) 88%, var(--color-bg));
	}

	.parent-options span {
		font-size: 0.92rem;
	}
</style>
