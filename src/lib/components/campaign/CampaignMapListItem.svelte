<script lang="ts">
	import MediaThumb from '$lib/components/shared/MediaThumb.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
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
	<RemoveIconButton
		variant="ghost"
		ariaLabel={`Delete ${map.name}`}
		busy={deleting}
		onclick={onDelete}
	/>
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
