<script lang="ts">
	import { getMediaLibraryThumbUrl } from '$lib/data/media-library-blob-cache';
	import { getMediaAssetLabel, type MediaAsset } from '$lib/domain/media-asset';

	type Props = {
		item: MediaAsset;
		onSelect: (item: MediaAsset) => void;
	};

	let { item, onSelect }: Props = $props();

	let thumbUrl = $state<string | null>(null);
	const itemLabel = $derived(getMediaAssetLabel(item));

	$effect(() => {
		let cancelled = false;

		void getMediaLibraryThumbUrl(item.media_id).then((url) => {
			if (!cancelled) thumbUrl = url;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<button
	type="button"
	class="media-tile"
	aria-label={`View ${itemLabel}`}
	onclick={() => onSelect(item)}
>
	{#if thumbUrl}
		<img class="media-tile-image" src={thumbUrl} alt="" />
	{:else}
		<span class="media-tile-placeholder">…</span>
	{/if}
</button>

<style>
	.media-tile {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-text-muted) 8%, transparent);
		overflow: hidden;
		cursor: pointer;
	}

	.media-tile:hover,
	.media-tile:focus-visible {
		border-color: var(--color-accent);
		outline: none;
	}

	.media-tile-image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.media-tile-placeholder {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: var(--color-text-muted);
		font-size: 1.25rem;
	}
</style>
