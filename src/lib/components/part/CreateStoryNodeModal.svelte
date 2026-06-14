<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import type { StoryNode, StoryNodeKind } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		onCreate?: (node: StoryNode) => void;
	};

	let { open = $bindable(false), onCreate }: Props = $props();

	let kind = $state<StoryNodeKind>('event');
	let title = $state('');
	let summary = $state('');

	function resetForm() {
		kind = 'event';
		title = '';
		summary = '';
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		onCreate?.({
			node_id: `node-${crypto.randomUUID()}`,
			kind,
			title: trimmedTitle,
			summary: summary.trim(),
			parent_node_ids: []
		});

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
				Create a new encounter or event on this part&apos;s story canvas.
			</Dialog.Description>

			<form onsubmit={handleSubmit}>
				<div class="field">
					<Label.Root for="story_node_kind">Type</Label.Root>
					<select id="story_node_kind" bind:value={kind}>
						<option value="encounter">Encounter</option>
						<option value="event">Event</option>
					</select>
				</div>

				<div class="field">
					<Label.Root for="story_node_title">Title</Label.Root>
					<input id="story_node_title" bind:value={title} required placeholder="Node title" />
				</div>

				<div class="field">
					<Label.Root for="story_node_summary">Summary</Label.Root>
					<textarea
						id="story_node_summary"
						bind:value={summary}
						rows="3"
						placeholder="What happens here?"
					></textarea>
				</div>

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
