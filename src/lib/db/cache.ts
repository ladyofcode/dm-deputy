import type {
	Adventure,
	Campaign,
	CampaignMap,
	CampaignMember,
	CampaignNpc,
	Character,
	Part,
	User
} from '$lib/types/schema';
import { bumpCampaignMapsRevision } from '$lib/stores/campaign-maps.svelte';
import { bumpCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
import { bumpCampaignListRevision } from '$lib/stores/campaign-list.svelte';
import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story';
import type { StoryItem, StoryNode } from '$lib/types/schema';
import type { CampaignSnapshot, PartStorySnapshot } from './types';

let campaignSnapshot: CampaignSnapshot | null = null;
const partStoryCache = new Map<string, PartStorySnapshot>();
const loadedPartStoryIds = new Set<string>();
const partStoryLoadPromises = new Map<string, Promise<void>>();

const emptyPartStorySnapshot = (): PartStorySnapshot => ({
	nodes: null,
	nodeLayout: null,
	itemLayout: null,
	items: null
});

export function isDatabaseCacheReady(): boolean {
	return campaignSnapshot !== null;
}

export function setCampaignSnapshot(snapshot: CampaignSnapshot): void {
	campaignSnapshot = {
		...snapshot,
		characters: snapshot.characters ?? [],
		campaignNpcs: snapshot.campaignNpcs ?? [],
		maps: snapshot.maps ?? []
	};
}

export function setPartStorySnapshot(partId: string, snapshot: PartStorySnapshot): void {
	partStoryCache.set(partId, snapshot);
}

export function clearDatabaseCache(): void {
	campaignSnapshot = null;
	partStoryCache.clear();
	loadedPartStoryIds.clear();
	partStoryLoadPromises.clear();
	bumpCampaignMapsRevision();
	bumpCampaignCharactersRevision();
	bumpCampaignListRevision();
}

export function isPartStoryLoaded(partId: string): boolean {
	return loadedPartStoryIds.has(partId);
}

export async function ensurePartStoryInCache(
	partId: string,
	loadPartStory: (partId: string) => Promise<PartStorySnapshot>
): Promise<void> {
	if (loadedPartStoryIds.has(partId)) return;

	const existing = partStoryLoadPromises.get(partId);
	if (existing) {
		await existing;
		return;
	}

	const promise = loadPartStory(partId)
		.then((story) => {
			setPartStorySnapshot(partId, story);
			loadedPartStoryIds.add(partId);
		})
		.finally(() => {
			partStoryLoadPromises.delete(partId);
		});

	partStoryLoadPromises.set(partId, promise);
	await promise;
}

export function getCachedUsers(): User[] {
	return campaignSnapshot?.users ?? [];
}

export function getCachedCampaigns(): Campaign[] {
	return (campaignSnapshot?.campaigns ?? []).filter((campaign) => campaign.date_deleted === null);
}

export function getCachedCampaignMembers(): CampaignMember[] {
	return campaignSnapshot?.campaignMembers ?? [];
}

export function getCachedCampaignNpcs(): CampaignNpc[] {
	return campaignSnapshot?.campaignNpcs ?? [];
}

export function getCachedAdventures(): Adventure[] {
	return campaignSnapshot?.adventures ?? [];
}

export function getCachedParts(): Part[] {
	return campaignSnapshot?.parts ?? [];
}

export function getCachedCharacters(): Character[] {
	return campaignSnapshot?.characters ?? [];
}

export function getCachedCampaignMaps(): CampaignMap[] {
	return campaignSnapshot?.maps ?? [];
}

export function mergeCampaignMapIntoCache(map: CampaignMap): void {
	if (!campaignSnapshot) return;

	const existing = campaignSnapshot.maps ?? [];
	campaignSnapshot = {
		...campaignSnapshot,
		maps: [...existing.filter((entry) => entry.map_id !== map.map_id), map].sort((a, b) =>
			a.name.localeCompare(b.name)
		)
	};
	bumpCampaignMapsRevision();
}

export function removeCampaignMapFromCache(mapId: string): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		maps: (campaignSnapshot.maps ?? []).filter((map) => map.map_id !== mapId)
	};
	bumpCampaignMapsRevision();
}

export function mergeCharacterIntoCache(character: Character): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		characters: [
			...campaignSnapshot.characters.filter(
				(entry) => entry.character_id !== character.character_id
			),
			character
		].sort((a, b) => a.display_name.localeCompare(b.display_name))
	};
	bumpCampaignCharactersRevision();
}

export function removeCharacterFromCache(characterId: string): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		characters: campaignSnapshot.characters.filter(
			(character) => character.character_id !== characterId
		)
	};
	bumpCampaignCharactersRevision();
}

export function mergeCampaignPlayerIntoCache(
	user: User,
	character: Character,
	member: CampaignMember
): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		users: [...campaignSnapshot.users.filter((entry) => entry.user_id !== user.user_id), user].sort(
			(a, b) => a.username.localeCompare(b.username)
		),
		characters: [
			...campaignSnapshot.characters.filter(
				(entry) => entry.character_id !== character.character_id
			),
			character
		].sort((a, b) => a.display_name.localeCompare(b.display_name)),
		campaignMembers: [
			...campaignSnapshot.campaignMembers.filter((entry) => entry.player_id !== member.player_id),
			member
		]
	};
	bumpCampaignCharactersRevision();
}

export function removeCampaignPlayerFromCache(campaignId: string, characterId: string): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaignMembers: campaignSnapshot.campaignMembers.filter(
			(member) =>
				!(
					member.campaign_id === campaignId &&
					member.character_id === characterId &&
					member.role === 'player'
				)
		)
	};
	bumpCampaignCharactersRevision();
}

export function softDeleteUserInCache(userId: string, dateDeleted: string): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		users: campaignSnapshot.users.map((user) =>
			user.user_id === userId ? { ...user, date_deleted: dateDeleted } : user
		)
	};
	bumpCampaignCharactersRevision();
}

export function mergeCampaignMemberIntoCache(member: CampaignMember): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaignMembers: [
			...campaignSnapshot.campaignMembers.filter((entry) => entry.player_id !== member.player_id),
			member
		]
	};
	bumpCampaignCharactersRevision();
}

export function mergeCampaignNpcIntoCache(campaignNpc: CampaignNpc): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaignNpcs: [
			...campaignSnapshot.campaignNpcs.filter(
				(entry) => entry.campaign_npc_id !== campaignNpc.campaign_npc_id
			),
			campaignNpc
		]
	};
	bumpCampaignCharactersRevision();
}

export function removeCampaignNpcFromCache(campaignId: string, characterId: string): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaignNpcs: campaignSnapshot.campaignNpcs.filter(
			(entry) => !(entry.campaign_id === campaignId && entry.character_id === characterId)
		)
	};
	bumpCampaignCharactersRevision();
}

export function getCachedPartStory(partId: string): PartStorySnapshot | undefined {
	return partStoryCache.get(partId);
}

export function updateCachedPartStoryNodes(partId: string, nodes: StoryNode[]): void {
	const existing = partStoryCache.get(partId) ?? {
		nodes: null,
		nodeLayout: null,
		itemLayout: null,
		items: null
	};
	partStoryCache.set(partId, { ...existing, nodes });
}

export function updateCachedPartStoryItems(partId: string, items: StoryItem[]): void {
	const existing = partStoryCache.get(partId) ?? {
		nodes: null,
		nodeLayout: null,
		itemLayout: null,
		items: null
	};
	partStoryCache.set(partId, { ...existing, items });
}

export function activateCachedStoryNode(partId: string, nodeId: string, activatedAt: string): void {
	const existing = partStoryCache.get(partId);
	if (!existing?.nodes) return;

	updateCachedPartStoryNodes(
		partId,
		existing.nodes.map((node) =>
			node.node_id === nodeId ? { ...node, activated_at: activatedAt } : node
		)
	);
}

export function toggleCachedStoryNodeCompleted(
	partId: string,
	nodeId: string,
	completedAt: string | null
): void {
	const existing = partStoryCache.get(partId);
	if (!existing?.nodes) return;

	updateCachedPartStoryNodes(
		partId,
		existing.nodes.map((node) =>
			node.node_id === nodeId ? { ...node, completed_at: completedAt } : node
		)
	);
}

export function updateCachedPartNodeLayout(partId: string, layout: PartNodeLayout): void {
	const existing = partStoryCache.get(partId) ?? {
		nodes: null,
		nodeLayout: null,
		itemLayout: null,
		items: null
	};
	partStoryCache.set(partId, { ...existing, nodeLayout: layout });
}

export function updateCachedPartItemLayout(partId: string, layout: PartItemLayout): void {
	const existing = partStoryCache.get(partId) ?? {
		nodes: null,
		nodeLayout: null,
		itemLayout: null,
		items: null
	};
	partStoryCache.set(partId, { ...existing, itemLayout: layout });
}

export function mergeCampaignIntoCache(
	campaign: Campaign,
	gmMembership: CampaignMember,
	extras?: {
		users?: User[];
		members?: CampaignMember[];
		characters?: Character[];
	}
): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaigns: [...campaignSnapshot.campaigns, campaign],
		campaignMembers: [
			...campaignSnapshot.campaignMembers,
			gmMembership,
			...(extras?.members ?? [])
		],
		users: [...campaignSnapshot.users, ...(extras?.users ?? [])],
		characters: [...campaignSnapshot.characters, ...(extras?.characters ?? [])]
	};
	bumpCampaignListRevision();
}

export function mergeAdventureIntoCache(adventure: Adventure): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		adventures: [...campaignSnapshot.adventures, adventure]
	};
}

export function updateAdventureInCache(
	adventureId: string,
	patch: Pick<Adventure, 'can_promote_to_campaign'>
): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		adventures: campaignSnapshot.adventures.map((adventure) =>
			adventure.adventure_id === adventureId ? { ...adventure, ...patch } : adventure
		)
	};
}

export function updateUserInCache(userId: string, patch: Pick<User, 'theme'>): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		users: campaignSnapshot.users.map((user) =>
			user.user_id === userId ? { ...user, ...patch } : user
		)
	};
}

export function updateCampaignInCache(
	campaignId: string,
	patch: Partial<Pick<Campaign, 'theme' | 'campaign_name' | 'description'>>
): void {
	if (!campaignSnapshot) return;

	campaignSnapshot = {
		...campaignSnapshot,
		campaigns: campaignSnapshot.campaigns.map((campaign) =>
			campaign.campaign_id === campaignId ? { ...campaign, ...patch } : campaign
		)
	};

	if ('campaign_name' in patch || 'description' in patch) {
		bumpCampaignListRevision();
	}
}

export function syncAdventurePartsInCache(adventureId: string, parts: Part[]): void {
	if (!campaignSnapshot) return;

	const nextIds = new Set(parts.map((part) => part.part_id));
	const removed = campaignSnapshot.parts.filter(
		(part) => part.adventure_id === adventureId && !nextIds.has(part.part_id)
	);

	for (const part of removed) {
		partStoryCache.delete(part.part_id);
		loadedPartStoryIds.delete(part.part_id);
		partStoryLoadPromises.delete(part.part_id);
	}

	campaignSnapshot = {
		...campaignSnapshot,
		parts: [...campaignSnapshot.parts.filter((part) => part.adventure_id !== adventureId), ...parts]
	};

	for (const part of parts) {
		if (!partStoryCache.has(part.part_id)) {
			partStoryCache.set(part.part_id, {
				nodes: null,
				nodeLayout: null,
				itemLayout: null,
				items: null
			});
		}
	}
}

export function touchCampaignInCache(userId: string, campaignId: string): void {
	if (!campaignSnapshot) return;

	const now = new Date().toISOString();
	campaignSnapshot = {
		...campaignSnapshot,
		campaignMembers: campaignSnapshot.campaignMembers.map((member) =>
			member.user_id === userId && member.campaign_id === campaignId
				? { ...member, last_played_at: now }
				: member
		)
	};
}

export async function reloadDatabaseCache(
	loadCampaign: () => Promise<CampaignSnapshot>,
	loadPartStory: (partId: string) => Promise<PartStorySnapshot>
): Promise<void> {
	const snapshot = await loadCampaign();

	partStoryCache.clear();
	loadedPartStoryIds.clear();
	partStoryLoadPromises.clear();

	setCampaignSnapshot(snapshot);

	for (const part of snapshot.parts) {
		setPartStorySnapshot(part.part_id, emptyPartStorySnapshot());
	}

	bumpCampaignMapsRevision();
	bumpCampaignCharactersRevision();
	bumpCampaignListRevision();

	for (const part of snapshot.parts) {
		void ensurePartStoryInCache(part.part_id, loadPartStory).catch(() => {});
	}
}
