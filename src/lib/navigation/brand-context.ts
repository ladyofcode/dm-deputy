import { resolve } from '$app/paths';
import { getAdventureById, getCampaignById, getPartById } from '$lib/data';
import { getCampaignDisplayName, getAdventureDisplayName } from '$lib/domain/display-names';

export type BrandContext =
	| { kind: 'app'; href: string; title: 'DM Deputy' }
	| { kind: 'campaign'; href: string; eyebrow: 'Campaign'; title: string }
	| { kind: 'adventure'; href: string; eyebrow: string; title: string }
	| { kind: 'part'; href: string; eyebrow: string; title: string };

export function resolveBrandShellFromRoute(params: {
	campaignId?: string;
	adventureId?: string;
	partId?: string;
}): BrandContext {
	const { campaignId, adventureId, partId } = params;

	if (!campaignId) {
		return { kind: 'app', href: resolve('/'), title: 'DM Deputy' };
	}

	if (partId && adventureId) {
		return {
			kind: 'part',
			href: resolve('/campaigns/[campaignId]/adventures/[adventureId]/parts/[partId]', {
				campaignId,
				adventureId,
				partId
			}),
			eyebrow: '',
			title: ''
		};
	}

	if (adventureId) {
		return {
			kind: 'adventure',
			href: resolve('/campaigns/[campaignId]/adventures/[adventureId]', {
				campaignId,
				adventureId
			}),
			eyebrow: '',
			title: ''
		};
	}

	return {
		kind: 'campaign',
		href: resolve('/campaigns/[campaignId]', { campaignId }),
		eyebrow: 'Campaign',
		title: ''
	};
}

export function resolveBrandContext(params: {
	campaignId?: string;
	adventureId?: string;
	partId?: string;
}): BrandContext {
	const { campaignId, adventureId, partId } = params;

	if (!campaignId) {
		return { kind: 'app', href: resolve('/'), title: 'DM Deputy' };
	}

	const campaign = getCampaignById(campaignId);
	if (!campaign) {
		return resolveBrandShellFromRoute(params);
	}

	if (partId && adventureId) {
		const adventure = getAdventureById(adventureId);
		const part = getPartById(partId);

		if (adventure && part) {
			return {
				kind: 'part',
				href: resolve(
					'/campaigns/[campaignId]/adventures/[adventureId]/parts/[partId]',
					{ campaignId, adventureId, partId }
				),
				eyebrow: getAdventureDisplayName(adventure),
				title: part.title
			};
		}
	}

	if (adventureId) {
		const adventure = getAdventureById(adventureId);

		if (adventure) {
			return {
				kind: 'adventure',
				href: resolve('/campaigns/[campaignId]/adventures/[adventureId]', {
					campaignId,
					adventureId
				}),
				eyebrow: getCampaignDisplayName(campaign),
				title: adventure.name
			};
		}
	}

	return {
		kind: 'campaign',
		href: resolve('/campaigns/[campaignId]', { campaignId }),
		eyebrow: 'Campaign',
		title: campaign.campaign_name
	};
}
