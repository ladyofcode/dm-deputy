<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import { createCampaignNpcFromTemplate } from '$lib/data/campaign-npc-from-template';
	import {
		armLineToStoryItem,
		buildStoryItemLabel,
		createEmptyArmLine,
		type StoryArmLine
	} from '$lib/domain/story-item';
	import {
		decodeStoryNpcSelection,
		encodeStoryNpcSelection
	} from '$lib/domain/story-npc-selection';
	import { generateRandomNameForTemplate } from '$lib/domain/template-npc-name';
	import { getReactiveNpcsForCampaign } from '$lib/stores/campaign-characters.svelte';
	import {
		getMonsterTemplates,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { StoryItem, StoryNode } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		campaignId: string;
		storyNodes: StoryNode[];
		storyItems: StoryItem[];
		onAddPartNpc?: (characterId: string) => void | Promise<void>;
		onSaveNodeArms?: (nodeId: string, items: StoryItem[]) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		campaignId,
		storyNodes,
		storyItems,
		onAddPartNpc,
		onSaveNodeArms
	}: Props = $props();

	let characterId = $state('');
	let monsterTemplateId = $state('');
	let npcName = $state('');
	let selectedNodeId = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let formInitialized = $state(false);

	const npcs = $derived(getReactiveNpcsForCampaign(campaignId));
	const generalNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_general'));
	const foeNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_foe'));
	const foeTemplates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return getMonsterTemplates()
			.filter((template) => template.kind === 'npc_foe')
			.sort((left, right) =>
				left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
			);
	});

	const npcSelection = $derived(encodeStoryNpcSelection(characterId, monsterTemplateId));
	const hasNpcSelection = $derived(Boolean(characterId || monsterTemplateId));
	const canSave = $derived(hasNpcSelection && (!monsterTemplateId || npcName.trim().length > 0));

	$effect(() => {
		if (!open) {
			formInitialized = false;
			return;
		}

		if (formInitialized) return;

		characterId = '';
		monsterTemplateId = '';
		npcName = '';
		selectedNodeId = '';
		error = null;
		formInitialized = true;
	});

	function handleNpcSelectionChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const decoded = decodeStoryNpcSelection(value);
		characterId = decoded.characterId;
		monsterTemplateId = decoded.monsterTemplateId;
		npcName = decoded.monsterTemplateId
			? generateRandomNameForTemplate(decoded.monsterTemplateId)
			: '';
	}

	function shuffleNpcName() {
		if (!monsterTemplateId) return;
		npcName = generateRandomNameForTemplate(monsterTemplateId);
	}

	function createNpcArmLine(resolvedCharacterId: string): StoryArmLine {
		return {
			...createEmptyArmLine(),
			kind: 'npc',
			character_id: resolvedCharacterId,
			monster_template_id: '',
			npc_name: '',
			is_reward: false
		};
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !canSave) return;

		saving = true;
		error = null;

		try {
			let resolvedCharacterId = characterId;

			if (monsterTemplateId && !characterId) {
				const character = await createCampaignNpcFromTemplate(
					campaignId,
					workspace.currentUserId,
					monsterTemplateId,
					npcName
				);
				resolvedCharacterId = character.character_id;
			}

			if (!resolvedCharacterId) {
				throw new Error('Choose an NPC or template');
			}

			if (selectedNodeId) {
				const nodeItems = storyItems.filter((item) => item.parent_node_id === selectedNodeId);
				const line = createNpcArmLine(resolvedCharacterId);
				const npcsById = new Map(
					getReactiveNpcsForCampaign(campaignId).map((npc) => [npc.character_id, npc])
				);
				const newItem = armLineToStoryItem(
					line,
					selectedNodeId,
					buildStoryItemLabel(line, npcsById, null)
				);

				await onSaveNodeArms?.(selectedNodeId, [...nodeItems, newItem]);
			} else {
				await onAddPartNpc?.(resolvedCharacterId);
			}

			open = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not add NPC');
		} finally {
			saving = false;
		}
	}
</script>

<AppDialog
	bind:open
	title="Add NPC"
	description="Choose a campaign NPC or foe template. Optionally link the NPC to a story node."
	stacked
	wide
>
	<form class="add-npc-form" onsubmit={handleSave}>
		<div class="field">
			<Label.Root for="part_add_npc_select">NPC</Label.Root>
			<select
				id="part_add_npc_select"
				value={npcSelection}
				onchange={handleNpcSelectionChange}
				aria-label="Choose NPC or template"
			>
				<option value="">Choose an NPC…</option>
				{#if generalNpcs.length}
					<optgroup label="NPCs">
						{#each generalNpcs as npc (npc.character_id)}
							<option value="character:{npc.character_id}">{npc.display_name}</option>
						{/each}
					</optgroup>
				{/if}
				{#if foeNpcs.length}
					<optgroup label="Foes">
						{#each foeNpcs as npc (npc.character_id)}
							<option value="character:{npc.character_id}">{npc.display_name}</option>
						{/each}
					</optgroup>
				{/if}
				{#if foeTemplates.length}
					<optgroup label="Templates">
						{#each foeTemplates as template (template.id)}
							<option value="template:{template.id}">{template.name}</option>
						{/each}
					</optgroup>
				{/if}
			</select>
		</div>

		{#if monsterTemplateId}
			<div class="field">
				<Label.Root for="part_add_npc_name">Name</Label.Root>
				<div class="npc-name-controls">
					<input id="part_add_npc_name" type="text" bind:value={npcName} placeholder="Foe name" />
					<Button.Root
						type="button"
						data-variant="icon"
						aria-label="Random name"
						onclick={shuffleNpcName}
					>
						↻
					</Button.Root>
				</div>
			</div>
		{/if}

		<div class="field">
			<Label.Root for="part_add_npc_node">Story node</Label.Root>
			<p class="hint">Leave unassigned to add the NPC to this part only.</p>
			<select id="part_add_npc_node" bind:value={selectedNodeId} aria-label="Link to story node">
				<option value="">Unassigned</option>
				{#each storyNodes as node (node.node_id)}
					<option value={node.node_id}>{node.title}</option>
				{/each}
			</select>
		</div>

		{#if error}
			<p class="add-npc-error">{error}</p>
		{/if}

		<DialogFormFooter
			submitLabel={saving ? 'Adding…' : 'Add NPC'}
			pending={saving}
			disabled={!canSave}
		/>
	</form>
</AppDialog>

<style>
	.add-npc-form {
		display: grid;
		gap: var(--space-section);
	}

	.add-npc-form .hint {
		margin: 0.25rem 0 0.65rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.npc-name-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.npc-name-controls input {
		flex: 1;
		min-width: 0;
	}

	.add-npc-error {
		margin: 0;
		color: var(--color-danger);
		font-size: 0.875rem;
	}
</style>
