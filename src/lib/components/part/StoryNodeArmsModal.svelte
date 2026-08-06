<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import { focusDraftRowInput } from '$lib/actions/focus-draft-row';
	import StoryArmLineRow from '$lib/components/part/StoryArmLineRow.svelte';
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
	import type { ItemCategory, StoryItem, StoryItemCatalogType, StoryItemKind } from '$lib/types/schema';

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

	let armLines = $state<StoryArmLine[]>([createEmptyArmLine()]);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let itemCategoryFilters = $state<Record<string, ItemCategory | ''>>({});
	let formKey = $state('');
	let armKindSelects = $state<Record<string, HTMLSelectElement | undefined>>({});

	const npcs = $derived(getReactiveNpcsForCampaign(campaignId));
	const generalNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_general'));
	const foeNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_foe'));
	const npcsById = $derived(new Map(npcs.map((npc) => [npc.character_id, npc])));
	const campaignMaps = $derived(getReactiveCampaignMapsForCampaign(campaignId));
	const mapsById = $derived(new Map(campaignMaps.map((map) => [map.map_id, map])));
	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());
	const gear = $derived(getReactiveCatalogItems());
	const weaponGroups = $derived(groupWeaponsByCategory(weapons));
	const armorGroups = $derived(groupArmorByCategory(armor));

	const itemGroupsByLineId = $derived.by(() => {
		const groups = new Map<string, ReturnType<typeof groupItemsByCategory>>();

		for (const line of armLines) {
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

	function getCatalogName(catalogType: StoryItemCatalogType | '', catalogId: string): string | null {
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

	$effect(() => {
		if (!open || !nodeId) {
			formKey = '';
			return;
		}

		const nodeItems = existingItems.filter((item) => item.parent_node_id === nodeId);
		const nextKey = `${nodeId}:${nodeItems.map((item) => item.item_id).join('|')}`;
		if (formKey === nextKey) return;

		formKey = nextKey;
		armLines = nodeItems.length ? nodeItems.map(storyItemToArmLine) : [createEmptyArmLine()];
		error = null;
	});

	function addArmLine() {
		armLines = [...armLines, createEmptyArmLine()];
	}

	async function handleArmKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		const newLine = createEmptyArmLine();
		armLines = [...armLines, newLine];
		await focusDraftRowInput(() => armKindSelects[newLine.id]);
	}

	function removeArmLine(lineId: string) {
		armLines = armLines.filter((line) => line.id !== lineId);
		if (armLines.length === 0) {
			armLines = [createEmptyArmLine()];
		}
	}

	function handleKindChange(line: StoryArmLine, kind: StoryItemKind) {
		armLines = armLines.map((entry) =>
			entry.id === line.id
				? {
						...entry,
						kind,
						xp_amount: 0,
						character_id: '',
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
		armLines = armLines.map((entry) =>
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
		armLines = armLines.map((entry) =>
			entry.id === line.id ? { ...entry, catalog_id: '' } : entry
		);
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !nodeId) return;

		const validLines = armLines.filter(isArmLineValid);
		const items = validLines.map((line) => {
			const draft = armLineToStoryItem(
				line,
				nodeId,
				buildStoryItemLabel(line, npcsById, labelNameForLine(line))
			);
			return draft;
		});

		saving = true;
		error = null;

		try {
			await onSave?.(nodeId, items);
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save items';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>{isEditMode ? 'Edit items' : 'Add item'}</Dialog.Title>
			<Dialog.Description>
				{#if nodeTitle}
					Items for <strong>{nodeTitle}</strong>. Add one row per reward, NPC, coin pile, catalog
					item, note, or map. Press Enter in a field to add another row.
				{/if}
			</Dialog.Description>

			<form onsubmit={handleSave}>
				<ul class="arm-lines list-plain">
					{#each armLines as line, index (line.id)}
						<StoryArmLineRow
							{line}
							{index}
							armLineCount={armLines.length}
							showRemove={armLines.length > 1 || isArmLineValid(line)}
							bind:kindSelect={armKindSelects[line.id]}
							{generalNpcs}
							{foeNpcs}
							{campaignMaps}
							{weaponGroups}
							{armorGroups}
							itemGroups={itemGroupsByLineId.get(line.id) ?? []}
							itemCategoryFilter={itemCategoryFilterForLine(line.id, line.catalog_id)}
							onKeydown={handleArmKeydown}
							onKindChange={handleKindChange}
							onCatalogTypeChange={handleCatalogTypeChange}
							onItemCategoryFilterChange={handleItemCategoryFilterChange}
							onAddLine={addArmLine}
							onRemoveLine={removeArmLine}
						/>
					{/each}
				</ul>

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
						{saving ? 'Saving…' : 'Save items'}
					</Button.Root>
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

	.arm-lines {
		display: grid;
		gap: 0.75rem;
		max-height: min(60vh, 28rem);
		overflow: auto;
	}
</style>
