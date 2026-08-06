import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

export function bumpCampaignCharactersRevision(): void {
	revision.bump();
}

export function trackCampaignCharactersRevision(): number {
	return revision.track();
}
