import type { CampaignSnapshot } from './types';

const CAMPAIGN_SNAPSHOT_KEY = 'dm-deputy:campaign-snapshot';

export function readCampaignSessionCache(): CampaignSnapshot | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(CAMPAIGN_SNAPSHOT_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as CampaignSnapshot;
		if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.campaigns)) {
			return null;
		}

		return {
			...parsed,
			characters: parsed.characters ?? [],
			campaignNpcs: parsed.campaignNpcs ?? [],
			maps: parsed.maps ?? [],
			sessionZero: parsed.sessionZero ?? []
		};
	} catch {
		return null;
	}
}

export function writeCampaignSessionCache(snapshot: CampaignSnapshot): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.setItem(CAMPAIGN_SNAPSHOT_KEY, JSON.stringify(snapshot));
	} catch {
		// sessionStorage may be full or unavailable
	}
}

export function clearCampaignSessionCache(): void {
	if (typeof sessionStorage === 'undefined') return;

	sessionStorage.removeItem(CAMPAIGN_SNAPSHOT_KEY);
}
