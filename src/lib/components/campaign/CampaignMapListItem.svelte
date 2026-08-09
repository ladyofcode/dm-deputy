<script lang="ts">
	import { Button } from 'bits-ui';
	import MediaThumb from '$lib/components/shared/MediaThumb.svelte';
	import type { CampaignMap } from '$lib/types/schema';

	type Props = {
		map: CampaignMap;
		deleting: boolean;
		onDelete: () => void;
	};

	let { map, deleting, onDelete }: Props = $props();
</script>

<li class="map-list-item entity-list-item">
	<MediaThumb variant="map" mapId={map.map_id} label={map.name} class="map-list-thumb" />
	<span class="map-title">{map.name}</span>
	<Button.Root
		type="button"
		data-variant="ghost"
		disabled={deleting}
		onclick={onDelete}
		aria-label={`Delete ${map.name}`}
	>
		{deleting ? 'Deleting…' : 'Delete'}
	</Button.Root>
</li>

<style>
	.map-list-item {
		grid-template-columns: auto 1fr auto;
	}

	.map-list-item :global(.map-list-thumb) {
		max-width: 4.5rem;
	}

	.map-list-item :global(.map-list-thumb .media-thumb-image),
	.map-list-item :global(.map-list-thumb .media-thumb-placeholder) {
		height: 3.25rem;
	}

	.map-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
	}
</style>
