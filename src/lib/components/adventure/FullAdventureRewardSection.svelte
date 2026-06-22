<script lang="ts">
	import CatalogItemTooltip from '$lib/components/adventure/CatalogItemTooltip.svelte';
	import StoryMapPreview from '$lib/components/part/StoryMapPreview.svelte';
	import {
		formatRewardMoney,
		hasRewardContent,
		rewardCatalogGroupForItem,
		totalRewardXp,
		type FullAdventureNodeSection,
		type NodeXpAwardLine
	} from '$lib/domain/full-adventure';
	import { getNpcsForCampaign } from '$lib/data';
	import type { StoryItem } from '$lib/types/schema';

	type Props = {
		section: FullAdventureNodeSection;
		campaignId: string;
		xpAwards?: NodeXpAwardLine[];
	};

	let { section, campaignId, xpAwards = [] }: Props = $props();

	const npcsById = $derived(new Map(getNpcsForCampaign(campaignId).map((npc) => [npc.character_id, npc])));
	const xpTotal = $derived(totalRewardXp(section.rewardItems));
	const showSection = $derived(hasRewardContent(section) || xpAwards.length > 0);
	const xpPending = $derived(xpTotal != null && xpAwards.length === 0);

	const catalogItems = $derived(
		section.rewardItems.filter((item) => rewardCatalogGroupForItem(item) != null)
	);

	const otherRewards = $derived(
		section.rewardItems.filter((item) => {
			if (item.kind === 'xp') return false;
			if (item.kind === 'item') return false;
			return true;
		})
	);

	function npcLabel(item: StoryItem): string {
		const npc = item.character_id ? npcsById.get(item.character_id) : undefined;
		return npc?.display_name ?? item.label;
	}
</script>

{#if showSection}
	<section class="reward-section" aria-label="Reward">
		<h4>Reward</h4>

		{#if xpTotal != null}
			<p class="reward-xp">{xpTotal} XP</p>
		{/if}

		{#if xpAwards.length > 0}
			<div class="xp-assigned">
				<p class="xp-assigned-label">Assigned</p>
				<ul class="xp-assigned-list list-plain">
					{#each xpAwards as award (award.characterName + award.amount + (award.description ?? ''))}
						<li>
							<span class="xp-assigned-name">{award.characterName}</span>
							<span class="xp-assigned-amount">{award.amount} XP</span>
							{#if award.description}
								<span class="xp-assigned-description">{award.description}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{:else if xpPending}
			<p class="xp-pending">Not yet assigned</p>
		{/if}

		{#if catalogItems.length}
			<p class="reward-group">
				{#each catalogItems as item, index (item.item_id)}
					{#if index > 0}<span aria-hidden="true">, </span>{/if}
					<CatalogItemTooltip {item} label={item.label} />
				{/each}
			</p>
		{/if}

		{#each otherRewards as item (item.item_id)}
			{#if item.kind === 'npc'}
				<p class="reward-line">{npcLabel(item)}</p>
			{:else if item.kind === 'money'}
				{@const money = formatRewardMoney(item)}
				{#if money}
					<p class="reward-line">{money}</p>
				{/if}
			{:else if item.kind === 'note' && item.note_text?.trim()}
				<p class="reward-note">{item.note_text}</p>
			{:else if item.kind === 'map' && item.map_id}
				<StoryMapPreview mapId={item.map_id} label={item.label} />
			{/if}
		{/each}
	</section>
{/if}

<style>
	.reward-section {
		margin-top: 1rem;
		display: grid;
		gap: 0.35rem;
	}

	h4 {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.reward-xp,
	.reward-group,
	.reward-line {
		margin: 0;
		line-height: 1.5;
	}

	.xp-assigned {
		display: grid;
		gap: 0.25rem;
	}

	.xp-assigned-label {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.xp-assigned-list {
		display: grid;
		gap: 0.2rem;
		margin: 0;
	}

	.xp-assigned-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.5rem;
		line-height: 1.45;
	}

	.xp-assigned-name {
		font-weight: 500;
	}

	.xp-assigned-amount {
		font-variant-numeric: tabular-nums;
	}

	.xp-assigned-description {
		color: var(--color-text-muted);
		font-size: 0.95rem;
	}

	.xp-assigned-description::before {
		content: '·';
		margin-right: 0.35rem;
		color: var(--color-text-muted);
	}

	.xp-pending {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.reward-note {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		white-space: pre-wrap;
	}
</style>
