<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { formatErrorMessage } from '$lib/domain/errors';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';
	import { createDraftLines } from '$lib/stores/draft-lines.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import StoryArmLineRow from '$lib/components/part/StoryArmLineRow.svelte';
	import { createCampaignNpcFromTemplate } from '$lib/data/campaign-npc-from-template';
	import {
		armLineToStoryItem,
		buildStoryItemLabel,
		createEmptyArmLine,
		isArmLineValid,
		NOTE_DEFAULT_HEIGHT,
		NOTE_DEFAULT_WIDTH,
		storyItemToArmLine,
		type StoryArmLine
	} from '$lib/domain/story-item';
	import { getReactiveNpcsForCampaign } from '$lib/stores/campaign-characters.svelte';
	import { getReactiveCampaignMapsForCampaign } from '$lib/stores/campaign-maps.svelte';
	import {
		getMonsterTemplates,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import {
		getReactiveCatalogArmor,
		getReactiveCatalogItems,
		getReactiveCatalogWeapons
	} from '$lib/stores/catalog.svelte';
	import {
		groupArmorByCategory,
		groupItemsByCategory,
		groupWeaponsByCategory,
		inferItemCategoryForCatalogId
	} from '$lib/domain/catalog-select';
	import type {
		ItemCategory,
		StoryItem,
		StoryItemCatalogType,
		StoryItemKind
	} from '$lib/types/schema';

	type Props = {
		open?: boolean;
		nodeId: string | null;
		nodeTitle?: string;
		campaignId: string;
		existingItems: StoryItem[];
		onSave?: (nodeId: string, items: StoryItem[]) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		nodeId,
		nodeTitle = '',
		campaignId,
		existingItems,
		onSave
	}: Props = $props();

	const armDraft = createDraftLines(createEmptyArmLine);

	let saving = $state(false);
	let error = $state<string | null>(null);
	let itemCategoryFilters = $state<Record<string, ItemCategory | ''>>({});
	let armKindSelects = $state<Record<string, HTMLSelectElement | undefined>>({});

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
	const campaignMaps = $derived(getReactiveCampaignMapsForCampaign(campaignId));
	const mapsById = $derived(new Map(campaignMaps.map((map) => [map.map_id, map])));
	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());
	const gear = $derived(getReactiveCatalogItems());
	const weaponGroups = $derived(groupWeaponsByCategory(weapons));
	const armorGroups = $derived(groupArmorByCategory(armor));

	const itemGroupsByLineId = $derived.by(() => {
		const groups = new SvelteMap<string, ReturnType<typeof groupItemsByCategory>>();

		for (const line of armDraft.lines) {
			if (line.kind !== 'item') continue;
			groups.set(
				line.id,
				groupItemsByCategory(gear, itemCategoryFilterForLine(line.id, line.catalog_id))
			);
		}

		return groups;
	});

	function itemCategoryFilterForLine(lineId: string, catalogId: string): ItemCategory | '' {
		return itemCategoryFilters[lineId] ?? inferItemCategoryForCatalogId(gear, catalogId);
	}

	function getCatalogName(
		catalogType: StoryItemCatalogType | '',
		catalogId: string
	): string | null {
		if (!catalogType || !catalogId) return null;

		switch (catalogType) {
			case 'weapon':
				return weapons.find((entry) => entry.weapon_id === catalogId)?.weapon_name ?? null;
			case 'armor':
				return armor.find((entry) => entry.armor_id === catalogId)?.armor_name ?? null;
			case 'item':
				return gear.find((entry) => entry.item_id === catalogId)?.item_name ?? null;
			default:
				return null;
		}
	}

	function catalogNameForLine(line: StoryArmLine): string | null {
		return getCatalogName(line.catalog_type, line.catalog_id);
	}

	function mapNameForLine(line: StoryArmLine): string | null {
		return mapsById.get(line.map_id)?.name ?? null;
	}

	function labelNameForLine(line: StoryArmLine): string | null {
		if (line.kind === 'map') return mapNameForLine(line);
		return catalogNameForLine(line);
	}

	const isEditMode = $derived(
		nodeId ? existingItems.some((item) => item.parent_node_id === nodeId) : false
	);

	useDialogFormReset(
		() => open && Boolean(nodeId),
		() => {
			if (!nodeId) return null;
			const nodeItems = existingItems.filter((item) => item.parent_node_id === nodeId);
			return `${nodeId}:${nodeItems.map((item) => item.item_id).join('|')}`;
		},
		() => {
			if (!nodeId) return;
			const nodeItems = existingItems.filter((item) => item.parent_node_id === nodeId);
			armDraft.lines = nodeItems.length
				? nodeItems.map(storyItemToArmLine)
				: [createEmptyArmLine()];
			error = null;
		}
	);

	async function handleArmKeydown(event: KeyboardEvent) {
		await armDraft.handleEnter(event, () => {
			const newLine = armDraft.lines[armDraft.lines.length - 1];
			return newLine ? armKindSelects[newLine.id] : undefined;
		});
	}

	function handleKindChange(line: StoryArmLine, kind: StoryItemKind) {
		armDraft.lines = armDraft.lines.map((entry) =>
			entry.id === line.id
				? {
						...entry,
						kind,
						xp_amount: 0,
						character_id: '',
						monster_template_id: '',
						npc_name: '',
						gold: 0,
						silver: 0,
						copper: 0,
						is_treasure: false,
						is_reward: kind === 'xp',
						catalog_type: '',
						catalog_id: '',
						note_text: '',
						note_width: NOTE_DEFAULT_WIDTH,
						note_height: NOTE_DEFAULT_HEIGHT,
						map_id: ''
					}
				: entry
		);
	}

	function handleCatalogTypeChange(line: StoryArmLine, catalogType: StoryItemCatalogType | '') {
		armDraft.lines = armDraft.lines.map((entry) =>
			entry.id === line.id ? { ...entry, catalog_type: catalogType, catalog_id: '' } : entry
		);
		if (catalogType !== 'item') {
			const rest = { ...itemCategoryFilters };
			delete rest[line.id];
			itemCategoryFilters = rest;
		}
	}

	function handleItemCategoryFilterChange(line: StoryArmLine, category: ItemCategory | '') {
		itemCategoryFilters = { ...itemCategoryFilters, [line.id]: category };
		armDraft.lines = armDraft.lines.map((entry) =>
			entry.id === line.id ? { ...entry, catalog_id: '' } : entry
		);
	}

	async function resolveTemplateArmLines(lines: StoryArmLine[]): Promise<StoryArmLine[]> {
		const resolved: StoryArmLine[] = [];

		for (const line of lines) {
			if (line.kind !== 'npc' || !line.monster_template_id || line.character_id) {
				resolved.push(line);
				continue;
			}

			const character = await createCampaignNpcFromTemplate(
				campaignId,
				workspace.currentUserId,
				line.monster_template_id,
				line.npc_name
			);

			resolved.push({
				...line,
				character_id: character.character_id,
				monster_template_id: '',
				npc_name: ''
			});
		}

		return resolved;
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !nodeId) return;

		const validLines = armDraft.lines.filter(isArmLineValid);
		const resolvedLines = await resolveTemplateArmLines(validLines);
		const freshNpcsById = new Map(
			getReactiveNpcsForCampaign(campaignId).map((npc) => [npc.character_id, npc])
		);
		const items = resolvedLines.map((line) => {
			const draft = armLineToStoryItem(
				line,
				nodeId,
				buildStoryItemLabel(line, freshNpcsById, labelNameForLine(line))
			);
			return draft;
		});

		saving = true;
		error = null;

		try {
			await onSave?.(nodeId, items);
			open = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not save items');
		} finally {
			saving = false;
		}
	}
</script>

<AppDialog bind:open title={isEditMode ? 'Edit items' : 'Add item'} wide>
	{#snippet descriptionContent()}
		{#if nodeTitle}
			Items for <strong>{nodeTitle}</strong>. Add one row per reward, NPC, coin pile, catalog item,
			note, or map. Press Enter in a field to add another row.
		{/if}
	{/snippet}
	<form onsubmit={handleSave}>
		<ul class="arm-lines list-plain">
			{#each armDraft.lines as line, index (line.id)}
				<StoryArmLineRow
					bind:line={armDraft.lines[index]!}
					{index}
					armLineCount={armDraft.lines.length}
					showRemove={armDraft.lines.length > 1 || isArmLineValid(line)}
					bind:kindSelect={armKindSelects[line.id]}
					{generalNpcs}
					{foeNpcs}
					{foeTemplates}
					{campaignMaps}
					{weaponGroups}
					{armorGroups}
					itemGroups={itemGroupsByLineId.get(line.id) ?? []}
					itemCategoryFilter={itemCategoryFilterForLine(line.id, line.catalog_id)}
					onKeydown={handleArmKeydown}
					onKindChange={handleKindChange}
					onCatalogTypeChange={handleCatalogTypeChange}
					onItemCategoryFilterChange={handleItemCategoryFilterChange}
					onAddLine={armDraft.add}
					onRemoveLine={armDraft.remove}
				/>
			{/each}
		</ul>

		{#if error}
			<p class="hint">{error}</p>
		{/if}

		<DialogFormFooter submitLabel={saving ? 'Saving…' : 'Save items'} pending={saving} />
	</form>
</AppDialog>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}

	.arm-lines {
		display: grid;
		gap: 0.75rem;
		max-height: min(60dvh, 28rem);
		overflow: auto;
	}
</style>
