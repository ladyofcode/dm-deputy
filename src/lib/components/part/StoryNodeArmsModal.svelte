<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { tick } from 'svelte';
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
	import { getNpcsForCampaign } from '$lib/data';
	import { getReactiveCampaignMapsForCampaign } from '$lib/stores/campaign-maps.svelte';
	import TreasureIcon from '$lib/components/icons/TreasureIcon.svelte';
	import RewardIcon from '$lib/components/icons/RewardIcon.svelte';
	import {
		getCachedArmor,
		getCachedItems,
		getCachedWeapons,
		isCatalogCacheReady
	} from '$lib/db/catalog-cache';
	import {
		STORY_ITEM_KIND_LABELS,
		type StoryItem,
		type StoryItemCatalogType,
		type StoryItemKind
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

	let armLines = $state<StoryArmLine[]>([createEmptyArmLine()]);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const npcs = $derived(getNpcsForCampaign(campaignId));
	const generalNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_general'));
	const foeNpcs = $derived(npcs.filter((npc) => npc.kind === 'npc_foe'));
	const npcsById = $derived(new Map(npcs.map((npc) => [npc.character_id, npc])));
	const campaignMaps = $derived(getReactiveCampaignMapsForCampaign(campaignId));
	const mapsById = $derived(new Map(campaignMaps.map((map) => [map.map_id, map])));
	const weapons = $derived(isCatalogCacheReady() ? getCachedWeapons() : []);
	const armor = $derived(isCatalogCacheReady() ? getCachedArmor() : []);
	const gear = $derived(isCatalogCacheReady() ? getCachedItems() : []);

	function getCatalogEntries(
		catalogType: StoryItemCatalogType | ''
	): { id: string; name: string }[] {
		switch (catalogType) {
			case 'weapon':
				return weapons.map((entry) => ({ id: entry.weapon_id, name: entry.weapon_name }));
			case 'armor':
				return armor.map((entry) => ({ id: entry.armor_id, name: entry.armor_name }));
			case 'item':
				return gear.map((entry) => ({ id: entry.item_id, name: entry.item_name }));
			default:
				return [];
		}
	}

	function catalogNameForLine(line: StoryArmLine): string | null {
		const entries = getCatalogEntries(line.catalog_type);
		return entries.find((entry) => entry.id === line.catalog_id)?.name ?? null;
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
		if (!open || !nodeId) return;

		const nodeItems = existingItems.filter((item) => item.parent_node_id === nodeId);
		armLines = nodeItems.length ? nodeItems.map(storyItemToArmLine) : [createEmptyArmLine()];
		error = null;
	});

	function addArmLine() {
		armLines = [...armLines, createEmptyArmLine()];
	}

	async function handleArmKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		event.preventDefault();
		addArmLine();
		await tick();

		const selects = document.querySelectorAll<HTMLSelectElement>('.arm-line-type select');
		selects[selects.length - 1]?.focus();
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
						<li class="arm-line">
							<div class="arm-line-row">
								<div class="field arm-line-type">
									<Label.Root for={`arm_kind_${line.id}`}>Type</Label.Root>
									<select
										id={`arm_kind_${line.id}`}
										value={line.kind}
										onkeydown={handleArmKeydown}
										onchange={(event) =>
											handleKindChange(
												line,
												(event.currentTarget as HTMLSelectElement).value as StoryItemKind
											)}
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
											onkeydown={handleArmKeydown}
										/>
									</div>
								{:else if line.kind === 'npc'}
									<div class="field arm-line-value">
										<Label.Root for={`arm_npc_${line.id}`}>NPC</Label.Root>
										<select
											id={`arm_npc_${line.id}`}
											bind:value={line.character_id}
											onkeydown={handleArmKeydown}
										>
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
											onkeydown={handleArmKeydown}
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
											onkeydown={handleArmKeydown}
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
											onkeydown={handleArmKeydown}
										/>
									</div>
									<label
										for={`arm_treasure_money_${line.id}`}
										class="treasure-toggle arm-line-extra"
									>
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
											onkeydown={handleArmKeydown}
											onchange={(event) =>
												handleCatalogTypeChange(
													line,
													(event.currentTarget as HTMLSelectElement).value as
														| StoryItemCatalogType
														| ''
												)}
										>
											<option value="">Choose…</option>
											<option value="weapon">Weapon</option>
											<option value="armor">Armor</option>
											<option value="item">Other item</option>
										</select>
									</div>
									<div class="field arm-line-value arm-line-value-wide">
										<Label.Root for={`arm_catalog_id_${line.id}`}>Item</Label.Root>
										<select
											id={`arm_catalog_id_${line.id}`}
											bind:value={line.catalog_id}
											disabled={!line.catalog_type}
											onkeydown={handleArmKeydown}
										>
											<option value="">Choose…</option>
											{#each getCatalogEntries(line.catalog_type) as entry (entry.id)}
												<option value={entry.id}>{entry.name}</option>
											{/each}
										</select>
									</div>
									<label
										for={`arm_treasure_item_${line.id}`}
										class="treasure-toggle arm-line-extra"
									>
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
											onkeydown={handleArmKeydown}
											placeholder="Write a note…"
										></textarea>
									</div>
								{:else if line.kind === 'map'}
									<div class="field arm-line-value arm-line-value-wide">
										<Label.Root for={`arm_map_${line.id}`}>Campaign map</Label.Root>
										<select
											id={`arm_map_${line.id}`}
											bind:value={line.map_id}
											onkeydown={handleArmKeydown}
										>
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
										<input
											id={`arm_reward_${line.id}`}
											type="checkbox"
											bind:checked={line.is_reward}
										/>
										<RewardIcon title="Reward" />
									</label>
								{/if}

								<div class="arm-line-actions">
									{#if index === armLines.length - 1}
										<Button.Root
											type="button"
											data-variant="icon"
											aria-label="Add item row"
											onclick={addArmLine}
										>
											+
										</Button.Root>
									{/if}
									{#if armLines.length > 1 || isArmLineValid(line)}
										<Button.Root
											type="button"
											data-variant="icon"
											aria-label="Remove item row"
											onclick={() => removeArmLine(line.id)}
										>
											×
										</Button.Root>
									{/if}
								</div>
							</div>
						</li>
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

	.treasure-toggle :global(input) {
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

	.reward-toggle :global(input) {
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

	.arm-line-actions {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.35rem;
		margin-left: auto;
	}

	.arm-line :global(.field) {
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
</style>
