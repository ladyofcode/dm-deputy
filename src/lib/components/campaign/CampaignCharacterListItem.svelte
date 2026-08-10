<script lang="ts">
	import MediaThumb from '$lib/components/shared/MediaThumb.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import {
		formatNpcCampaignListSummary,
		formatPcCampaignListSummary
	} from '$lib/domain/character-list-summary';
	import { resolve } from '$app/paths';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import type { Character } from '$lib/types/schema';

	type Props = {
		characterId: string;
		character: Character;
		campaignId?: string;
		subtitle?: string | null;
		defaultLevel?: number;
		listVariant?: 'pc' | 'npc';
		removing: boolean;
		removeAriaLabel: string;
		onRemove: () => void;
	};

	let {
		characterId,
		character,
		campaignId,
		subtitle = null,
		defaultLevel = 0,
		listVariant = 'pc',
		removing,
		removeAriaLabel,
		onRemove
	}: Props = $props();

	const summary = $derived.by(() => {
		if (listVariant === 'npc') {
			return formatNpcCampaignListSummary(character, { defaultLevel });
		}

		return formatPcCampaignListSummary(character, { defaultLevel });
	});

	const showPortrait = $derived(listVariant === 'npc');
</script>

<li class="character-list-item entity-list-item" class:character-list-item-npc={showPortrait}>
	{#if showPortrait}
		<MediaThumb variant="portrait" {character} class="character-list-thumb" />
	{/if}
	{#if campaignId}
		<a
			class="character-main"
			href="{resolve('/library/characters/[characterId]', {
				characterId
			})}?from={encodeURIComponent(resolveCampaignHref(campaignId))}"
		>
			<span class="character-name">{character.display_name}</span>
			{#if subtitle}
				<p class="character-subtitle">{subtitle}</p>
			{/if}
			{#if summary}
				<p class="character-summary">{summary}</p>
			{/if}
		</a>
	{:else}
		<a class="character-main" href={resolve('/library/characters/[characterId]', { characterId })}>
			<span class="character-name">{character.display_name}</span>
			{#if subtitle}
				<p class="character-subtitle">{subtitle}</p>
			{/if}
			{#if summary}
				<p class="character-summary">{summary}</p>
			{/if}
		</a>
	{/if}
	<RemoveIconButton
		variant="ghost"
		ariaLabel={removeAriaLabel}
		busy={removing}
		onclick={onRemove}
	/>
</li>

<style>
	.character-list-item {
		grid-template-columns: 1fr auto;
		align-items: start;
		padding: 0.65rem 0.75rem;
	}

	.character-list-item-npc {
		grid-template-columns: auto 1fr auto;
		align-items: center;
	}

	.character-list-item-npc :global(.character-list-thumb) {
		flex-shrink: 0;
	}

	.character-main {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
		padding: 0;
		text-decoration: none;
		color: inherit;
	}

	.character-main:hover .character-name,
	.character-main:focus-visible .character-name {
		color: var(--color-accent);
	}

	.character-main:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.character-name {
		font-weight: 600;
	}

	.character-subtitle,
	.character-summary {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
