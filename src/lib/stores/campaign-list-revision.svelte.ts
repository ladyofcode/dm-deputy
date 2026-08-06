import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

export function bumpCampaignListRevision(): void {
	revision.bump();
}

export function trackCampaignListRevision(): number {
	return revision.track();
}
