<script lang="ts">
	import { getCharacterById } from '$lib/data';
	import { getCharacterPortraitObjectUrl } from '$lib/data/character-blob-cache';
	import { formatNpcCampaignListSummary } from '$lib/domain/character-list-summary';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { characterHasPortrait, type Character } from '$lib/types/schema';

	type Props = {
		characterId: string;
		label: string;
	};

	let { characterId, label }: Props = $props();

	let portraitThumbUrl = $state<string | null>(null);

	const character = $derived.by((): Character | undefined => {
		trackCampaignCharactersRevision();
		return getCharacterById(characterId);
	});

	const summary = $derived(
		character ? formatNpcCampaignListSummary(character) : null
	);

	const showPortrait = $derived(Boolean(character && characterHasPortrait(character)));

	$effect(() => {
		if (!showPortrait || !character) {
			portraitThumbUrl = null;
			return;
		}

		let cancelled = false;

		void getCharacterPortraitObjectUrl(character.character_id, 'thumb').then((url) => {
			if (!cancelled) {
				portraitThumbUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="story-npc-canvas-content">
	{#if portraitThumbUrl}
		<img class="story-npc-canvas-portrait" src={portraitThumbUrl} alt="" />
	{/if}
	<p class="npc-canvas-name">{label}</p>
	{#if summary}
		<p class="npc-canvas-meta">{summary}</p>
	{/if}
</div>

<style>
	.story-npc-canvas-content {
		display: grid;
		gap: 0.35rem;
	}

	.story-npc-canvas-portrait {
		display: block;
		width: 7.5rem;
		height: 7.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-text-muted) 10%, transparent);
		object-fit: cover;
	}

	.npc-canvas-name {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-text);
		white-space: pre-wrap;
	}

	.npc-canvas-meta {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.35;
		color: var(--color-text-muted);
	}
</style>
