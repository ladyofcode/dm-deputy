<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import MediaLibraryDetailModal from '$lib/components/library/MediaLibraryDetailModal.svelte';
	import MediaLibraryTile from '$lib/components/library/MediaLibraryTile.svelte';
	import {
		ensureMediaLibraryLoaded,
		getMediaLibraryItems
	} from '$lib/stores/media-library.svelte';
	import type { MediaAsset } from '$lib/domain/media-asset';
	import { database } from '$lib/stores/database.svelte';

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let selectedItem = $state<MediaAsset | null>(null);
	let detailOpen = $state(false);

	const items = $derived(getMediaLibraryItems());

	$effect(() => {
		if (!database.isReady) return;

		loading = true;
		loadError = null;

		void ensureMediaLibraryLoaded()
			.catch((error) => {
				loadError = error instanceof Error ? error.message : String(error);
			})
			.finally(() => {
				loading = false;
			});
	});

	function openDetail(item: MediaAsset) {
		selectedItem = item;
		detailOpen = true;
	}
</script>

<svelte:head>
	<title>Media library · DM Deputy</title>
</svelte:head>

<header class="library-header">
	<h1>Media library</h1>
	<p class="library-intro">
		Portraits, presentation images, and template art you have uploaded.
	</p>
</header>

{#if !database.isReady || loading}
	<LoadingState message="Loading media library…" />
{:else if loadError}
	<EmptyState message={loadError} />
{:else if items.length}
	<ul class="media-grid list-plain">
		{#each items as item (item.media_id)}
			<li>
				<MediaLibraryTile {item} onSelect={openDetail} />
			</li>
		{/each}
	</ul>
{:else}
	<EmptyState
		message="No uploaded images yet. Add portraits, presentation images, or template art from elsewhere in the app."
	/>
{/if}

<MediaLibraryDetailModal item={selectedItem} bind:open={detailOpen} />

<style>
	.library-header h1 {
		margin: 0;
	}

	.library-intro {
		margin: 0.35rem 0 0;
		color: var(--color-text-muted);
		max-width: 42rem;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 0.75rem;
	}
</style>
