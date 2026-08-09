<script lang="ts">
	import { resolve } from '$app/paths';
	import { Label } from 'bits-ui';
	import DragHandleIcon from '$lib/components/icons/DragHandleIcon.svelte';
	import type { Part } from '$lib/types/schema';

	type Props = {
		parts: Part[];
		campaignId: string;
		adventureId: string;
		draggedPartId: string | null;
		sessionDurationDrafts: Record<string, string>;
		onSessionDurationBlur: (partId: string) => void;
		onHandlePointerDown: (partId: string, event: PointerEvent) => void;
	};

	let {
		parts,
		campaignId,
		adventureId,
		draggedPartId,
		sessionDurationDrafts = $bindable(),
		onSessionDurationBlur,
		onHandlePointerDown
	}: Props = $props();
</script>

{#if parts.length === 0}
	<h2>No parts! Add below</h2>
{:else}
	<h2>Parts</h2>
	<p class="hint">Drag to reorder.</p>

	<ul class="part-list list-plain">
		{#each parts as part (part.part_id)}
			<li
				class="part-list-item"
				class:is-dragging={draggedPartId === part.part_id}
				data-part-id={part.part_id}
			>
				<span class="part-order">{part.sort_order}</span>
				<div class="part-list-main">
					<a
						class="part-list-link"
						href={resolve(
							`/campaigns/${campaignId}/adventures/${adventureId}/parts/${part.part_id}`
						)}
					>
						<h3>{part.title}</h3>
					</a>
					<div class="part-session-field">
						<Label.Root for="session-{part.part_id}">Session time</Label.Root>
						<input
							id="session-{part.part_id}"
							type="text"
							bind:value={sessionDurationDrafts[part.part_id]}
							placeholder="e.g. 3 hours"
							onblur={() => onSessionDurationBlur(part.part_id)}
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.currentTarget.blur();
								}
							}}
						/>
					</div>
				</div>
				<span
					class="part-handle"
					role="button"
					tabindex="0"
					aria-label="Drag to reorder"
					onpointerdown={(event) => onHandlePointerDown(part.part_id, event)}
				>
					<DragHandleIcon />
				</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.part-list-main {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 0.65rem;
	}

	.part-session-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0;
	}

	.part-session-field :global(label) {
		margin: 0;
		flex-shrink: 0;
		font-size: 0.9rem;
	}

	.part-session-field input {
		flex: 0 1 12rem;
		min-width: 6rem;
		max-width: 100%;
		padding: 0.2rem 0.45rem;
		font-size: 0.9rem;
	}
</style>
