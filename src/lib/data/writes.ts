import {
	mergeAdventureIntoCache,
	mergeCampaignMapIntoCache,
	mergeCampaignMemberIntoCache,
	mergeCampaignNpcIntoCache,
	mergeCampaignPlayerIntoCache,
	mergeCharacterIntoCache,
	reloadDatabaseCache,
	removeCampaignMapFromCache,
	removeCampaignNpcFromCache,
	removeCampaignPlayerFromCache,
	softDeleteCampaignInCache,
	softDeleteNpcInCache,
	softDeleteUserInCache,
	syncAdventurePartsInCache,
	touchCampaignInCache,
	updateAdventureInCache,
	updateCampaignInCache,
	updateSessionZeroInCache,
	updateUserInCache
} from '$lib/db/cache';
import {
	addCampaignNpcToCampaignInDb,
	addCampaignPcToCampaignInDb,
	addCampaignPlayerInDb,
	createAdventureInDb,
	createCampaignCharacterInDb,
	createCampaignInDb,
	createCampaignMapInDb,
	deleteCampaignMapInDb,
	loadCampaignSnapshot,
	loadCharacterLoadoutInDb,
	loadPartStory,
	promoteAdventureToCampaignInDb,
	removeCampaignNpcFromCampaignInDb,
	removeCampaignPlayerInDb,
	softDeleteCampaignInDb,
	softDeleteNpcInDb,
	softDeletePlayerInDb,
	syncAdventurePartsInDb,
	touchCampaignInDb,
	updateAdventurePromoteInDb,
	updateCampaignCharacterInDb,
	updateCharacterPortraitInDb,
	updateCharacterStatCacheInDb,
	updateCampaignDetailsInDb,
	updateSessionZeroAnswersInDb,
	updateCampaignThemeInDb,
	updateUserThemeInDb,
	updateUserUsernameInDb
} from '$lib/db/client';
import type {
	OnboardingAdventureDraft,
	CampaignPlayerDraft,
	OnboardingCampaignDraft
} from '$lib/types/convenience-schema';
import type {
	Adventure,
	Campaign,
	CampaignMap,
	CampaignMember,
	CampaignSessionZero,
	Character,
	CharacterKind,
	Part
} from '$lib/types/schema';
import type { CampaignTheme, ThemePreset } from '$lib/themes/types';
import {
	applyPartIdOrder,
	getStoredPartOrder,
	setStoredPartOrder,
	sortPartsByOrder
} from '$lib/data/part-order-storage';
import { getCachedParts } from '$lib/db/cache';
import {
	setStoredCampaignTheme,
	setStoredUserTheme,
	getStoredCampaignTheme,
	getStoredUserTheme
} from '$lib/themes/storage';
import { getCampaignById, getCampaigns, getCharacterById, getPlayerUsernameForCharacter, getPlayerUserIdForCharacter, getUserById } from '$lib/data';
import { persistCharacterSheetStatChanges } from '$lib/data/character-stats-persistence';
import { workspace } from '$lib/stores/workspace.svelte';
import { processMapUpload } from '$lib/domain/map-image';
import { revokeCampaignMapObjectUrls } from '$lib/data/map-blob-cache';
import {
	revokeCharacterPortraitObjectUrls
} from '$lib/data/character-blob-cache';
import { processCharacterPortraitUpload } from '$lib/domain/character-portrait';
import {
	characterToIdentityDraft,
	characterToNpcExtrasDraft,
	type CharacterIdentityDraft,
	type NpcDraftLine,
	type NpcExtrasDraft
} from '$lib/domain/npc-draft';
import { spellcastingDraftToDbFields } from '$lib/domain/spellcasting';
import {
	physicalDraftToDbFields,
	roleplayDraftToDbFields,
	vitalityDraftToDbFields
} from '$lib/domain/pc-sheet';
import type { PromoteAdventureOptions } from '$lib/domain/promote-adventure';

export async function persistCampaign(
	ownerUserId: string,
	draft: OnboardingCampaignDraft
): Promise<{ campaign: Campaign; membership: CampaignMember }> {
	const campaignId = `cmp-${crypto.randomUUID()}`;
	const now = new Date().toISOString();
	const gmPlayerId = `mbr-${crypto.randomUUID()}`;

	const campaign: Campaign = {
		campaign_id: campaignId,
		owner_user_id: ownerUserId,
		campaign_name: draft.campaign_name.trim(),
		description: draft.description.trim() || null,
		game_schema: draft.game_schema.trim() || 'dnd5e',
		theme: 'default',
		date_created: now,
		date_deleted: null
	};

	const membership: CampaignMember = {
		player_id: gmPlayerId,
		campaign_id: campaignId,
		user_id: ownerUserId,
		character_id: null,
		date_campaign_joined: now,
		role: 'gm',
		last_played_at: null
	};

	const players = draft.players
		.map((entry) => ({
			player_name: entry.player_name.trim(),
			character_name: entry.character_name.trim()
		}))
		.filter((entry) => entry.player_name && entry.character_name)
		.map((entry) => ({
			user_id: `usr-${crypto.randomUUID()}`,
			username: entry.player_name,
			display_name: entry.character_name,
			player_id: `mbr-${crypto.randomUUID()}`,
			character_id: `chr-${crypto.randomUUID()}`
		}));

	await createCampaignInDb({
		campaign_id: campaign.campaign_id,
		owner_user_id: campaign.owner_user_id,
		campaign_name: campaign.campaign_name,
		description: campaign.description,
		game_schema: campaign.game_schema,
		player_id: membership.player_id,
		date_created: now,
		players
	});

	await reloadDatabaseCache(loadCampaignSnapshot, loadPartStory);

	return { campaign, membership };
}

export async function persistAdventure(
	campaignId: string,
	draft: OnboardingAdventureDraft
): Promise<Adventure> {
	const adventureId = `adv-${crypto.randomUUID()}`;
	const now = new Date().toISOString();

	const adventure: Adventure = {
		adventure_id: adventureId,
		campaign_id: campaignId,
		name: draft.name.trim(),
		overview: draft.overview.trim() || null,
		adventure_hook: draft.adventure_hook.trim() || null,
		can_promote_to_campaign: false,
		date_created: now
	};

	await createAdventureInDb({
		adventure_id: adventure.adventure_id,
		campaign_id: adventure.campaign_id,
		name: adventure.name,
		overview: adventure.overview,
		adventure_hook: adventure.adventure_hook,
		can_promote_to_campaign: false,
		date_created: now
	});

	mergeAdventureIntoCache(adventure);

	return adventure;
}

export async function persistAdventurePromoteSetting(
	adventureId: string,
	canPromote: boolean
): Promise<void> {
	await updateAdventurePromoteInDb(adventureId, canPromote);
	updateAdventureInCache(adventureId, { can_promote_to_campaign: canPromote });
}

export async function persistAdventurePromotion(
	adventureId: string,
	ownerUserId: string,
	options: PromoteAdventureOptions
): Promise<{ campaignId: string; adventureId: string }> {
	const result = await promoteAdventureToCampaignInDb({
		adventure_id: adventureId,
		owner_user_id: ownerUserId,
		options
	});

	setStoredPartOrder(result.adventure_id, result.part_ids);
	await reloadDatabaseCache(loadCampaignSnapshot, loadPartStory);

	return {
		campaignId: result.campaign_id,
		adventureId: result.adventure_id
	};
}

export async function persistUserTheme(userId: string, theme: ThemePreset): Promise<void> {
	setStoredUserTheme(userId, theme);
	updateUserInCache(userId, { theme });
	await updateUserThemeInDb(userId, theme);
}

export async function persistCampaignTheme(
	campaignId: string,
	theme: CampaignTheme
): Promise<void> {
	setStoredCampaignTheme(campaignId, theme);
	updateCampaignInCache(campaignId, { theme });
	await updateCampaignThemeInDb(campaignId, theme);
}

export async function persistCampaignDetails(
	campaignId: string,
	draft: { campaign_name: string; description: string }
): Promise<Campaign> {
	const campaign_name = draft.campaign_name.trim();
	if (!campaign_name) {
		throw new Error('Campaign name is required');
	}

	const description = draft.description.trim() || null;
	const campaign = await updateCampaignDetailsInDb({
		campaign_id: campaignId,
		campaign_name,
		description
	});

	updateCampaignInCache(campaignId, { campaign_name, description });
	return campaign;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
	const deletedAt = await softDeleteCampaignInDb(campaignId);
	softDeleteCampaignInCache(campaignId, deletedAt);
}

export async function persistSessionZero(
	campaignId: string,
	state: { answers: Record<string, string>; activeQuestionIds: string[] }
): Promise<CampaignSessionZero> {
	const sessionZero = await updateSessionZeroAnswersInDb({
		campaign_id: campaignId,
		answers: state.answers,
		activeQuestionIds: state.activeQuestionIds
	});

	updateSessionZeroInCache(sessionZero);
	return sessionZero;
}

export async function syncThemesWithDatabase(userId: string): Promise<void> {
	const storedUserTheme = getStoredUserTheme(userId);
	const dbUserTheme = getUserById(userId)?.theme;

	if (storedUserTheme && storedUserTheme !== dbUserTheme) {
		await persistUserTheme(userId, storedUserTheme);
	} else if (!storedUserTheme && dbUserTheme) {
		setStoredUserTheme(userId, dbUserTheme);
	}

	for (const campaign of getCampaigns()) {
		const storedCampaignTheme = getStoredCampaignTheme(campaign.campaign_id);

		if (storedCampaignTheme && storedCampaignTheme !== campaign.theme) {
			await persistCampaignTheme(campaign.campaign_id, storedCampaignTheme);
		} else if (!storedCampaignTheme) {
			setStoredCampaignTheme(campaign.campaign_id, campaign.theme);
		}
	}
}

export async function persistAdventureParts(adventureId: string, parts: Part[]): Promise<void> {
	const ordered = sortPartsByOrder(parts).map((part, index) => ({
		...part,
		sort_order: index + 1
	}));

	setStoredPartOrder(
		adventureId,
		ordered.map((part) => part.part_id)
	);
	syncAdventurePartsInCache(adventureId, ordered);
	await syncAdventurePartsInDb(adventureId, ordered);
}

export async function syncAdventurePartOrderWithDatabase(adventureId: string): Promise<void> {
	const storedOrder = getStoredPartOrder(adventureId);
	if (!storedOrder?.length) return;

	const dbParts = sortPartsByOrder(
		getCachedParts().filter((part) => part.adventure_id === adventureId)
	);
	const dbOrder = dbParts.map((part) => part.part_id).join('\n');
	const storedKey = storedOrder.join('\n');

	if (storedKey !== dbOrder) {
		await persistAdventureParts(adventureId, applyPartIdOrder(dbParts, storedOrder));
	}
}

export async function touchCampaign(userId: string, campaignId: string): Promise<void> {
	await touchCampaignInDb(userId, campaignId);
	touchCampaignInCache(userId, campaignId);
}

export async function persistCampaignMap(
	campaignId: string,
	name: string,
	file: File,
	imageSource: string | null = null
): Promise<CampaignMap> {
	const processed = await processMapUpload(file);
	const mapId = `map-${crypto.randomUUID()}`;
	const now = new Date().toISOString();

	const map = await createCampaignMapInDb(
		{
			map_id: mapId,
			campaign_id: campaignId,
			name: name.trim(),
			mime_type: processed.mime_type,
			full_width: processed.full_width,
			full_height: processed.full_height,
			thumb_width: processed.thumb_width,
			thumb_height: processed.thumb_height,
			image_source: imageSource,
			created_at: now
		},
		processed.thumbBuffer,
		processed.fullBuffer
	);

	mergeCampaignMapIntoCache(map);
	return map;
}

export async function removeCampaignMap(mapId: string): Promise<void> {
	await deleteCampaignMapInDb(mapId);
	removeCampaignMapFromCache(mapId);
	revokeCampaignMapObjectUrls(mapId);
}

function identityDraftToDbFields(identity: CharacterIdentityDraft) {
	return {
		race: identity.race.trim() || null,
		creature_type: identity.creature_type.trim() || null,
		alignment: identity.alignment.trim() || null,
		age: identity.age.trim() || null,
		class_name: identity.class_name.trim() || null,
		presentation: identity.presentation.trim() || null
	};
}

function extrasDraftToDbFields(extras: NpcExtrasDraft) {
	const { abilities, combat, spellcasting, physical, roleplay, vitality } = extras;

	return {
		armor_class: combat.armor_class > 0 ? combat.armor_class : null,
		armor_class_notes: combat.armor_class_notes.trim() || null,
		speed: combat.speed.trim() || null,
		hp_dice: combat.hp_dice.trim() || null,
		ability_str: abilities.str,
		ability_dex: abilities.dex,
		ability_con: abilities.con,
		ability_int: abilities.int,
		ability_wis: abilities.wis,
		ability_cha: abilities.cha,
		skills: combat.skills.trim() || null,
		senses: combat.senses.trim() || null,
		languages: combat.languages.trim() || null,
		challenge_rating: combat.challenge_rating.trim() || null,
		traits: combat.traits.trim() || null,
		actions: combat.actions.trim() || null,
		...spellcastingDraftToDbFields(spellcasting),
		...physicalDraftToDbFields(physical),
		...roleplayDraftToDbFields(roleplay),
		...vitalityDraftToDbFields(vitality)
	};
}

function npcDraftToCreateInput(
	campaignId: string,
	createdByUserId: string,
	line: NpcDraftLine
): import('$lib/db/types').CreateCampaignCharacterInput {
	const hpMax = line.extras.hp_max;
	const hpCurrent = line.extras.hp_current || (hpMax > 0 ? hpMax : 0);
	const now = new Date().toISOString();

	return {
		character_id: `chr-${crypto.randomUUID()}`,
		campaign_id: campaignId,
		kind: line.kind,
		created_by_user_id: createdByUserId,
		display_name: line.name.trim(),
		notes: line.description.trim() || null,
		...identityDraftToDbFields(line.identity),
		...extrasDraftToDbFields(line.extras),
		level: line.extras.level,
		experience: line.extras.experience,
		hp_max: hpMax,
		hp_current: hpCurrent,
		reputation: line.extras.reputation.trim() || null,
		loadout: npcExtrasToLoadout(line.extras),
		campaign_npc_id: `cnpc-${crypto.randomUUID()}`,
		date_added: now
	};
}

export async function persistCampaignNpc(
	campaignId: string,
	createdByUserId: string,
	line: NpcDraftLine
): Promise<Character> {
	const input = npcDraftToCreateInput(campaignId, createdByUserId, line);
	const character = await createCampaignCharacterInDb(input);
	mergeCharacterIntoCache(character);

	if (input.campaign_npc_id && input.date_added) {
		mergeCampaignNpcIntoCache({
			campaign_npc_id: input.campaign_npc_id,
			campaign_id: campaignId,
			character_id: character.character_id,
			date_added: input.date_added
		});
	}

	if (line.portraitFile) {
		return persistCharacterPortrait(
			character.character_id,
			line.portraitFile,
			line.portraitImageSource
		);
	}

	return character;
}

export async function persistCharacterPortrait(
	characterId: string,
	file: File,
	imageSource: string | null = null
): Promise<Character> {
	const processed = await processCharacterPortraitUpload(file);
	const character = await updateCharacterPortraitInDb(
		{
			character_id: characterId,
			mime_type: processed.mime_type,
			portrait_width: processed.portrait_width,
			portrait_height: processed.portrait_height,
			thumb_width: processed.thumb_width,
			thumb_height: processed.thumb_height,
			image_source: imageSource
		},
		processed.thumbBuffer,
		processed.fullBuffer
	);

	revokeCharacterPortraitObjectUrls(characterId);
	mergeCharacterIntoCache(character);
	return getCharacterById(characterId) ?? character;
}

export async function persistCampaignNpcs(
	campaignId: string,
	createdByUserId: string,
	lines: NpcDraftLine[]
): Promise<Character[]> {
	const saved: Character[] = [];

	for (const line of lines) {
		if (!line.name.trim()) continue;
		saved.push(await persistCampaignNpc(campaignId, createdByUserId, line));
	}

	return saved;
}

function npcExtrasToLoadout(extras: NpcExtrasDraft) {
	return {
		weapon_ids: extras.loadout.weapons.filter(Boolean),
		armor_ids: extras.loadout.armor ? [extras.loadout.armor] : [],
		item_ids: extras.loadout.items.filter(Boolean),
		spells: extras.loadout.spells.filter((entry) => entry.spell_id)
	};
}

function npcDraftToUpdateInput(
	characterId: string,
	kind: CharacterKind,
	line: Pick<NpcDraftLine, 'name' | 'description' | 'identity' | 'extras'>
): import('$lib/db/types').UpdateCampaignCharacterInput {
	return {
		character_id: characterId,
		kind,
		display_name: line.name.trim(),
		notes: line.description.trim() || null,
		...identityDraftToDbFields(line.identity),
		...extrasDraftToDbFields(line.extras),
		reputation: line.extras.reputation.trim() || null,
		loadout: npcExtrasToLoadout(line.extras)
	};
}

export async function updateCampaignCharacter(
	characterId: string,
	kind: CharacterKind,
	payload: {
		name: string;
		playerName?: string;
		description?: string;
		identity: CharacterIdentityDraft;
		extras: NpcExtrasDraft;
	}
): Promise<Character> {
	const existing = getCharacterById(characterId);
	if (!existing) {
		throw new Error('Character not found');
	}

	if (kind === 'pc' && payload.playerName !== undefined) {
		const userId = getPlayerUserIdForCharacter(characterId);
		if (!userId) {
			throw new Error('Player account not found for this character');
		}

		const username = payload.playerName.trim();
		if (!username) {
			throw new Error('Player name is required');
		}

		const currentUser = getUserById(userId);
		if (currentUser && currentUser.username !== username) {
			await updateUserUsernameInDb(userId, username);
			updateUserInCache(userId, { username });
		}
	}

	const hpMax = payload.extras.hp_max;
	const hpCurrent = payload.extras.hp_current || (hpMax > 0 ? hpMax : 0);
	const campaign = getCampaignById(existing.campaign_id);
	const gameSchema = campaign?.game_schema ?? 'dnd5e';

	await persistCharacterSheetStatChanges(
		existing,
		{
			experience: payload.extras.experience,
			hp_max: hpMax,
			hp_current: hpCurrent
		},
		workspace.currentUserId,
		gameSchema
	);

	let latest = getCharacterById(characterId) ?? existing;
	if (payload.extras.level !== latest.level) {
		const updated = await updateCharacterStatCacheInDb({
			character_id: characterId,
			experience: latest.experience,
			level: payload.extras.level,
			hp_max: latest.hp_max,
			hp_current: latest.hp_current
		});
		mergeCharacterIntoCache(updated);
		latest = updated;
	}

	const character = await updateCampaignCharacterInDb(
		npcDraftToUpdateInput(characterId, kind, {
			name: payload.name,
			description: payload.description ?? '',
			identity: payload.identity,
			extras: payload.extras
		})
	);
	mergeCharacterIntoCache(character);
	return getCharacterById(characterId) ?? character;
}

export async function loadCharacterSheetDraft(character: Character): Promise<{
	kind: CharacterKind;
	name: string;
	playerName: string;
	description: string;
	identity: CharacterIdentityDraft;
	extras: NpcExtrasDraft;
}> {
	const loadout = await loadCharacterLoadoutInDb(character.character_id);

	return {
		kind: character.kind,
		name: character.display_name,
		playerName:
			character.kind === 'pc'
				? (getPlayerUsernameForCharacter(character.character_id) ?? '')
				: '',
		description: character.notes ?? '',
		identity: characterToIdentityDraft(character),
		extras: characterToNpcExtrasDraft(character, loadout)
	};
}

export async function removeCampaignNpc(campaignId: string, characterId: string): Promise<void> {
	await removeCampaignNpcFromCampaignInDb(campaignId, characterId);
	removeCampaignNpcFromCache(campaignId, characterId);
}

export async function addCampaignNpcToCampaign(
	campaignId: string,
	characterId: string
): Promise<Character> {
	const now = new Date().toISOString();
	const result = await addCampaignNpcToCampaignInDb({
		campaign_id: campaignId,
		character_id: characterId,
		campaign_npc_id: `cnpc-${crypto.randomUUID()}`,
		date_added: now
	});

	mergeCharacterIntoCache(result.character);
	mergeCampaignNpcIntoCache(result.campaignNpc);
	return result.character;
}

export async function addCampaignPcToCampaign(
	campaignId: string,
	characterId: string
): Promise<Character> {
	const now = new Date().toISOString();
	const result = await addCampaignPcToCampaignInDb({
		campaign_id: campaignId,
		character_id: characterId,
		player_id: `mbr-${crypto.randomUUID()}`,
		date_campaign_joined: now
	});

	mergeCampaignMemberIntoCache(result.member);
	return result.character;
}

export async function persistCampaignPlayers(
	campaignId: string,
	ownerUserId: string,
	players: CampaignPlayerDraft[]
): Promise<Character[]> {
	const now = new Date().toISOString();
	const saved: Character[] = [];

	for (const entry of players) {
		const username = entry.player_name.trim();
		const displayName = entry.character_name.trim();
		if (!username || !displayName) continue;

		const result = await addCampaignPlayerInDb({
			campaign_id: campaignId,
			owner_user_id: ownerUserId,
			date_created: now,
			user_id: `usr-${crypto.randomUUID()}`,
			username,
			display_name: displayName,
			player_id: `mbr-${crypto.randomUUID()}`,
			character_id: `chr-${crypto.randomUUID()}`
		});

		mergeCampaignPlayerIntoCache(result.user, result.character, result.member);
		saved.push(result.character);
	}

	return saved;
}

export async function softDeletePlayerFromPlayerbase(userId: string): Promise<void> {
	const deletedAt = await softDeletePlayerInDb(userId);
	softDeleteUserInCache(userId, deletedAt);
}

export async function softDeleteNpcFromLibrary(characterId: string): Promise<void> {
	const deletedAt = await softDeleteNpcInDb(characterId);
	softDeleteNpcInCache(characterId, deletedAt);
}

export async function removeCampaignPlayer(
	campaignId: string,
	characterId: string
): Promise<void> {
	await removeCampaignPlayerInDb(campaignId, characterId);
	removeCampaignPlayerFromCache(campaignId, characterId);
}
