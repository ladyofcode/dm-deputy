<script lang="ts">
	import CampaignMapThumb from '$lib/components/shared/CampaignMapThumb.svelte';
	import { getReactiveCampaignMapById } from '$lib/stores/campaign-maps.svelte';

	type Props = {
		mapId: string;
		label?: string;
	};

	let { mapId, label = '' }: Props = $props();

	const campaignMap = $derived(getReactiveCampaignMapById(mapId));
	const displayLabel = $derived(label.trim() || campaignMap?.name || 'Map');
</script>

<CampaignMapThumb {mapId} label={displayLabel} showCaption />
