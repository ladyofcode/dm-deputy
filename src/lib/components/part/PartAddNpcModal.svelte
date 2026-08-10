<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import DraftLinesForm from '$lib/components/shared/DraftLinesForm.svelte';
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
	import {
		filterSelectablePartNpcs,
		getExcludedCharacterIdsForPartNpcSelection,
		getPartNpcCharacterIdSet
	} from '$lib/data/part-npcs';
	import { getReactiveNpcsForCampaign } from '$lib/stores/campaign-characters.svelte';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import {
		getMonsterTemplates,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { Character, PartNpc, StoryItem, StoryNode } from '$lib/types/schema';

	type PartNpcDraftLine = {
		id: string;
		characterId: string;
		monsterTemplateId: string;
		npcName: string;
	};

	type Props = {
		open?: boolean;
		campaignId: string;
		storyNodes: StoryNode[];
		storyItems: StoryItem[];
		partNpcs: PartNpc[];
		onAddPartNpc?: (characterId: string) => void | Promise<void>;
		onSaveNodeArms?: (nodeId: string, items: StoryItem[]) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		campaignId,
		storyNodes,
		storyItems,
		partNpcs,
		onAddPartNpc,
		onSaveNodeArms
	}: Props = $props();

	function createEmptyPartNpcDraftLine(): PartNpcDraftLine {
		return {
			id: crypto.randomUUID(),
			characterId: '',
			monsterTemplateId: '',
			npcName: ''
		};
	}

	const npcDraft = createDraftLines(createEmptyPartNpcDraftLine);

	let selectedNodeId = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let formInitialized = $state(false);

	const campaignNpcs = $derived(getReactiveNpcsForCampaign(campaignId));
	const onPartCharacterIds = $derived(getPartNpcCharacterIdSet(storyItems, partNpcs));
	const foeTemplates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return getMonsterTemplates()
			.filter((template) => template.kind === 'npc_foe')
			.sort((left, right) =>
				left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
			);
	});

	function isLineValid(line: PartNpcDraftLine): boolean {
		const hasSelection = Boolean(line.characterId || line.monsterTemplateId);
		if (!hasSelection || (line.monsterTemplateId && !line.npcName.trim())) {
			return false;
		}

		if (line.characterId && onPartCharacterIds.has(line.characterId)) {
			return false;
		}

		return true;
	}

	function selectableNpcsForRow(
		line: PartNpcDraftLine,
		kind: Character['kind']
	): Character[] {
		const otherDraftCharacterIds = npcDraft.lines
			.filter((draftLine) => draftLine.id !== line.id)
			.map((draftLine) => draftLine.characterId)
			.filter(Boolean);
		const excludedCharacterIds = getExcludedCharacterIdsForPartNpcSelection(
			storyItems,
			partNpcs,
			otherDraftCharacterIds,
			line.characterId
		);

		return filterSelectablePartNpcs(
			campaignNpcs.filter((npc) => npc.kind === kind),
			excludedCharacterIds,
			line.characterId
		);
	}

	function hasDuplicateExistingCharacter(lines: PartNpcDraftLine[]): boolean {
		const seen = new Set<string>();

		for (const line of lines) {
			if (!line.characterId) continue;

			if (onPartCharacterIds.has(line.characterId) || seen.has(line.characterId)) {
				return true;
			}

			seen.add(line.characterId);
		}

		return false;
	}

	const validLines = $derived(npcDraft.lines.filter(isLineValid));
	const submitCount = $derived(validLines.length);
	const canSubmit = $derived(submitCount > 0 && !hasDuplicateExistingCharacter(validLines));

	$effect(() => {
		if (!open) {
			formInitialized = false;
			return;
		}

		if (formInitialized) return;

		npcDraft.reset();
		selectedNodeId = '';
		error = null;
		formInitialized = true;
	});

	function handleNpcSelectionChange(line: PartNpcDraftLine, event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const decoded = decodeStoryNpcSelection(value);
		line.characterId = decoded.characterId;
		line.monsterTemplateId = decoded.monsterTemplateId;
		line.npcName = decoded.monsterTemplateId
			? generateRandomNameForTemplate(decoded.monsterTemplateId)
			: '';
	}

	function shuffleNpcName(line: PartNpcDraftLine) {
		if (!line.monsterTemplateId) return;
		line.npcName = generateRandomNameForTemplate(line.monsterTemplateId);
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

	async function resolveCharacterId(line: PartNpcDraftLine): Promise<string> {
		if (line.characterId) return line.characterId;

		if (line.monsterTemplateId) {
			const character = await createCampaignNpcFromTemplate(
				campaignId,
				workspace.currentUserId,
				line.monsterTemplateId,
				line.npcName.trim()
			);
			return character.character_id;
		}

		throw new Error('Choose an NPC or template');
	}

	async function saveNpcLines(lines: PartNpcDraftLine[]) {
		if (hasDuplicateExistingCharacter(lines)) {
			throw new Error('Each existing NPC can only be added once to this part');
		}

		const unassignedCharacterIds: string[] = [];
		const characterIdsByNode = new Map<string, string[]>();

		for (const line of lines) {
			const resolvedCharacterId = await resolveCharacterId(line);

			if (selectedNodeId) {
				const nodeCharacterIds = characterIdsByNode.get(selectedNodeId) ?? [];
				if (!nodeCharacterIds.includes(resolvedCharacterId)) {
					nodeCharacterIds.push(resolvedCharacterId);
				}
				characterIdsByNode.set(selectedNodeId, nodeCharacterIds);
			} else if (!unassignedCharacterIds.includes(resolvedCharacterId)) {
				unassignedCharacterIds.push(resolvedCharacterId);
			}
		}

		for (const resolvedCharacterId of unassignedCharacterIds) {
			if (onPartCharacterIds.has(resolvedCharacterId)) continue;
			await onAddPartNpc?.(resolvedCharacterId);
		}

		if (characterIdsByNode.size === 0) return;

		const npcsById = new Map(campaignNpcs.map((npc) => [npc.character_id, npc]));

		for (const [nodeId, characterIds] of characterIdsByNode) {
			const nodeItems = storyItems.filter((item) => item.parent_node_id === nodeId);
			const newItems = characterIds
				.filter((resolvedCharacterId) => !onPartCharacterIds.has(resolvedCharacterId))
				.map((resolvedCharacterId) => {
					const armLine = createNpcArmLine(resolvedCharacterId);
					return armLineToStoryItem(
						armLine,
						nodeId,
						buildStoryItemLabel(armLine, npcsById, null)
					);
				});

			if (newItems.length === 0) continue;

			await onSaveNodeArms?.(nodeId, [...nodeItems, ...newItems]);
		}
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !canSubmit) return;

		saving = true;
		error = null;

		try {
			await saveNpcLines(validLines);
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
			<Label.Root>NPC</Label.Root>
			<DraftLinesForm
				lines={npcDraft.lines}
				listClass="add-npc-lines list-plain"
				lineClass="add-npc-line"
				removeAriaLabel="Remove NPC row"
				onRemove={npcDraft.remove}
				onAdd={npcDraft.add}
				showRemove={(line) =>
					npcDraft.lines.length > 1 ||
					Boolean((line as PartNpcDraftLine).characterId || (line as PartNpcDraftLine).monsterTemplateId)}
			>
				{#snippet row({ line })}
					{@const draftLine = line as PartNpcDraftLine}
					{@const rowGeneralNpcs = selectableNpcsForRow(draftLine, 'npc_general')}
					{@const rowFoeNpcs = selectableNpcsForRow(draftLine, 'npc_foe')}
					<div class="npc-row-fields">
						<select
							value={encodeStoryNpcSelection(draftLine.characterId, draftLine.monsterTemplateId)}
							onchange={(event) => handleNpcSelectionChange(draftLine, event)}
							aria-label="Choose NPC or template"
						>
							<option value="">Choose an NPC…</option>
							{#if rowGeneralNpcs.length}
								<optgroup label="NPCs">
									{#each rowGeneralNpcs as npc (npc.character_id)}
										<option value="character:{npc.character_id}">{npc.display_name}</option>
									{/each}
								</optgroup>
							{/if}
							{#if rowFoeNpcs.length}
								<optgroup label="Foes">
									{#each rowFoeNpcs as npc (npc.character_id)}
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

						{#if draftLine.monsterTemplateId}
							<div class="npc-name-controls">
								<input
									type="text"
									bind:value={draftLine.npcName}
									placeholder="Foe name"
									aria-label="Foe name"
								/>
								<Button.Root
									type="button"
									data-variant="icon"
									aria-label="Random name"
									onclick={() => shuffleNpcName(draftLine)}
								>
									↻
								</Button.Root>
							</div>
						{/if}
					</div>
				{/snippet}
			</DraftLinesForm>
		</div>

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
			submitLabel={saving
				? 'Adding…'
				: submitCount > 1
					? `Add ${submitCount} NPCs`
					: 'Add NPC'}
			pending={saving}
			disabled={!canSubmit}
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

	:global(.add-npc-lines) {
		margin-top: 0.65rem;
	}

	:global(.add-npc-line) {
		align-items: flex-start;
	}

	.npc-row-fields {
		display: grid;
		flex: 1;
		gap: 0.5rem;
		min-width: 0;
	}

	.npc-row-fields select,
	.npc-name-controls input {
		width: 100%;
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
