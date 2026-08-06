import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

export function bumpCampaignMapsRevision(): void {
	revision.bump();
}

export function trackCampaignMapsRevision(): number {
	return revision.track();
}
