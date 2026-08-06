<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import CatalogSelect from '$lib/components/shared/CatalogSelect.svelte';
	import RewardIcon from '$lib/components/icons/RewardIcon.svelte';
	import TreasureIcon from '$lib/components/icons/TreasureIcon.svelte';
	import {
		ITEM_CATEGORY_ORDER,
		type CatalogOptionGroup
	} from '$lib/domain/catalog-select';
	import { ITEM_CATEGORY_LABELS } from '$lib/domain/catalog';
	import type { StoryArmLine } from '$lib/domain/story-item';
	import {
		STORY_ITEM_KIND_LABELS,
		type Armor,
		type CampaignMap,
		type Character,
		type Item,
		type ItemCategory,
		type StoryItemCatalogType,
		type StoryItemKind,
		type Weapon
	} from '$lib/types/schema';

	type Props = {
		line: StoryArmLine;
		index: number;
		armLineCount: number;
		showRemove: boolean;
		kindSelect?: HTMLSelectElement;
		generalNpcs: Character[];
		foeNpcs: Character[];
		campaignMaps: CampaignMap[];
		weaponGroups: CatalogOptionGroup<Weapon>[];
		armorGroups: CatalogOptionGroup<Armor>[];
		itemGroups: CatalogOptionGroup<Item>[];
		itemCategoryFilter: ItemCategory | '';
		onKeydown?: (event: KeyboardEvent) => void;
		onKindChange?: (line: StoryArmLine, kind: StoryItemKind) => void;
		onCatalogTypeChange?: (line: StoryArmLine, catalogType: StoryItemCatalogType | '') => void;
		onItemCategoryFilterChange?: (line: StoryArmLine, category: ItemCategory | '') => void;
		onAddLine?: () => void;
		onRemoveLine?: (lineId: string) => void;
	};

	let {
		line,
		index,
		armLineCount,
		showRemove,
		kindSelect = $bindable(),
		generalNpcs,
		foeNpcs,
		campaignMaps,
		weaponGroups,
		armorGroups,
		itemGroups,
		itemCategoryFilter,
		onKeydown,
		onKindChange,
		onCatalogTypeChange,
		onItemCategoryFilterChange,
		onAddLine,
		onRemoveLine
	}: Props = $props();
</script>

<li class="arm-line">
	<div class="arm-line-row">
		<div class="field arm-line-type">
			<Label.Root for={`arm_kind_${line.id}`}>Type</Label.Root>
			<select
				id={`arm_kind_${line.id}`}
				bind:this={kindSelect}
				value={line.kind}
				onkeydown={onKeydown}
				onchange={(event) =>
					onKindChange?.(line, (event.currentTarget as HTMLSelectElement).value as StoryItemKind)}
			>
				{#each Object.entries(STORY_ITEM_KIND_LABELS) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		{#if line.kind === 'xp'}
			<div class="field arm-line-value">
				<Label.Root for={`arm_xp_${line.id}`}>XP</Label.Root>
				<input
					id={`arm_xp_${line.id}`}
					type="number"
					min="0"
					step="1"
					bind:value={line.xp_amount}
					onkeydown={onKeydown}
				/>
			</div>
		{:else if line.kind === 'npc'}
			<div class="field arm-line-value">
				<Label.Root for={`arm_npc_${line.id}`}>NPC</Label.Root>
				<select id={`arm_npc_${line.id}`} bind:value={line.character_id} onkeydown={onKeydown}>
					<option value="">None</option>
					{#if generalNpcs.length}
						<optgroup label="NPCs">
							{#each generalNpcs as npc (npc.character_id)}
								<option value={npc.character_id}>{npc.display_name}</option>
							{/each}
						</optgroup>
					{/if}
					{#if foeNpcs.length}
						<optgroup label="Foes">
							{#each foeNpcs as npc (npc.character_id)}
								<option value={npc.character_id}>{npc.display_name}</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</div>
		{:else if line.kind === 'money'}
			<div class="field arm-line-value">
				<Label.Root for={`arm_gold_${line.id}`}>Gold</Label.Root>
				<input
					id={`arm_gold_${line.id}`}
					type="number"
					min="0"
					step="1"
					bind:value={line.gold}
					onkeydown={onKeydown}
				/>
			</div>
			<div class="field arm-line-value">
				<Label.Root for={`arm_silver_${line.id}`}>Silver</Label.Root>
				<input
					id={`arm_silver_${line.id}`}
					type="number"
					min="0"
					step="1"
					bind:value={line.silver}
					onkeydown={onKeydown}
				/>
			</div>
			<div class="field arm-line-value">
				<Label.Root for={`arm_copper_${line.id}`}>Copper</Label.Root>
				<input
					id={`arm_copper_${line.id}`}
					type="number"
					min="0"
					step="1"
					bind:value={line.copper}
					onkeydown={onKeydown}
				/>
			</div>
			<label for={`arm_treasure_money_${line.id}`} class="treasure-toggle arm-line-extra">
				<input
					id={`arm_treasure_money_${line.id}`}
					type="checkbox"
					bind:checked={line.is_treasure}
				/>
				<TreasureIcon title="Treasure" />
			</label>
		{:else if line.kind === 'item'}
			<div class="field arm-line-value">
				<Label.Root for={`arm_catalog_type_${line.id}`}>Category</Label.Root>
				<select
					id={`arm_catalog_type_${line.id}`}
					value={line.catalog_type}
					onkeydown={onKeydown}
					onchange={(event) =>
						onCatalogTypeChange?.(
							line,
							(event.currentTarget as HTMLSelectElement).value as StoryItemCatalogType | ''
						)}
				>
					<option value="">Choose…</option>
					<option value="weapon">Weapon</option>
					<option value="armor">Armor</option>
					<option value="item">Gear, mounts & services</option>
				</select>
			</div>
			{#if line.catalog_type === 'item'}
				<div class="field arm-line-value">
					<Label.Root for={`arm_item_category_${line.id}`}>Gear type</Label.Root>
					<select
						id={`arm_item_category_${line.id}`}
						value={itemCategoryFilter}
						onkeydown={onKeydown}
						onchange={(event) =>
							onItemCategoryFilterChange?.(
								line,
								(event.currentTarget as HTMLSelectElement).value as ItemCategory | ''
							)}
					>
						<option value="">All categories</option>
						{#each ITEM_CATEGORY_ORDER as category (category)}
							<option value={category}>{ITEM_CATEGORY_LABELS[category]}</option>
						{/each}
					</select>
				</div>
			{/if}
			<div class="field arm-line-value arm-line-value-wide">
				<Label.Root for={`arm_catalog_id_${line.id}`}>Item</Label.Root>
				<CatalogSelect
					id={`arm_catalog_id_${line.id}`}
					kind={line.catalog_type || 'item'}
					groups={line.catalog_type === 'weapon'
						? weaponGroups
						: line.catalog_type === 'armor'
							? armorGroups
							: line.catalog_type === 'item'
								? itemGroups
								: []}
					bind:value={line.catalog_id}
					emptyLabel="Choose…"
					disabled={!line.catalog_type}
					onkeydown={onKeydown}
				/>
			</div>
			<label for={`arm_treasure_item_${line.id}`} class="treasure-toggle arm-line-extra">
				<input
					id={`arm_treasure_item_${line.id}`}
					type="checkbox"
					bind:checked={line.is_treasure}
				/>
				<TreasureIcon title="Treasure" />
			</label>
		{:else if line.kind === 'note'}
			<div class="field arm-line-value arm-line-value-wide">
				<Label.Root for={`arm_note_${line.id}`}>Note</Label.Root>
				<textarea
					id={`arm_note_${line.id}`}
					rows="3"
					bind:value={line.note_text}
					onkeydown={onKeydown}
					placeholder="Write a note…"
				></textarea>
			</div>
		{:else if line.kind === 'map'}
			<div class="field arm-line-value arm-line-value-wide">
				<Label.Root for={`arm_map_${line.id}`}>Campaign map</Label.Root>
				<select id={`arm_map_${line.id}`} bind:value={line.map_id} onkeydown={onKeydown}>
					<option value="">Select a map…</option>
					{#each campaignMaps as map (map.map_id)}
						<option value={map.map_id}>{map.name}</option>
					{/each}
				</select>
				{#if campaignMaps.length === 0}
					<p class="hint">Upload maps from the campaign page.</p>
				{/if}
			</div>
		{/if}

		{#if line.kind !== 'xp'}
			<label for={`arm_reward_${line.id}`} class="reward-toggle arm-line-extra">
				<input id={`arm_reward_${line.id}`} type="checkbox" bind:checked={line.is_reward} />
				<RewardIcon title="Reward" />
			</label>
		{/if}

		<div class="arm-line-actions">
			{#if index === armLineCount - 1}
				<Button.Root type="button" data-variant="icon" aria-label="Add item row" onclick={onAddLine}>
					+
				</Button.Root>
			{/if}
			{#if showRemove}
				<Button.Root
					type="button"
					data-variant="icon"
					aria-label="Remove item row"
					onclick={() => onRemoveLine?.(line.id)}
				>
					×
				</Button.Root>
			{/if}
		</div>
	</div>
</li>

<style>
	.arm-line {
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-surface) 88%, var(--color-bg));
	}

	.arm-line-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.arm-line-type {
		flex: 0 1 8.5rem;
		min-width: min(100%, 8.5rem);
	}

	.arm-line-value {
		flex: 1 1 5.5rem;
		min-width: min(100%, 5.5rem);
	}

	.arm-line-value-wide {
		flex: 2 1 10rem;
		min-width: min(100%, 10rem);
	}

	.arm-line-extra {
		flex: 0 0 auto;
		align-self: center;
	}

	.treasure-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-text-muted);
		opacity: 0.45;
		transition:
			color 120ms ease,
			opacity 120ms ease;
	}

	.treasure-toggle:has(:checked) {
		color: #b8860b;
		opacity: 1;
	}

	.treasure-toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.reward-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-text-muted);
		opacity: 0.45;
		transition:
			color 120ms ease,
			opacity 120ms ease;
	}

	.reward-toggle:has(:checked) {
		color: var(--color-accent);
		opacity: 1;
	}

	.reward-toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.field {
		margin-bottom: 0;
	}

	.arm-line-type select,
	.arm-line-value select,
	.arm-line-value input,
	.arm-line-value textarea {
		width: 100%;
	}

	.arm-line-value textarea {
		min-height: 4.5rem;
		resize: vertical;
	}

	.arm-line-actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.35rem;
		margin-left: auto;
	}
</style>
