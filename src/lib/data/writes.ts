import {
	mergeAdventureIntoCache,
	mergeCampaignIntoCache,
	mergeCampaignMapIntoCache,
	mergeCampaignMemberIntoCache,
	mergeCampaignNpcIntoCache,
	mergeCampaignPlayerIntoCache,
	mergeCharacterIntoCache,
	mergePromotedCampaignFromSnapshot,
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
	createMediaAssetInDb,
	deleteCampaignMapInDb,
	loadCampaignSnapshot,
	loadCharacterLoadoutInDb,
	loadMediaAssetByIdInDb,
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
	updateCharacterPortraitSourceInDb,
	updateCharacterPresentationInDb,
	updateCharacterPresentationSourceInDb,
	updateCharacterStatCacheInDb,
	updateCampaignDetailsInDb,
	updateAdventureShorthandInDb,
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
import {
	getCampaignById,
	getCampaigns,
	getCharacterById,
	getPlayerUsernameForCharacter,
	getPlayerUserIdForCharacter,
	getUserById
} from '$lib/data';
import { persistCharacterSheetStatChanges } from '$lib/data/character-stats-persistence';
import { preferences } from '$lib/stores/preferences.svelte';
import { workspace } from '$lib/stores/workspace.svelte';
import { processMapUpload } from '$lib/domain/map-image';
import { buildMediaAssetId } from '$lib/domain/media-asset';
import { revokeCampaignMapObjectUrls } from '$lib/data/map-blob-cache';
import { revokeCharacterPortraitObjectUrls } from '$lib/data/character-blob-cache';
import { revokeCharacterPresentationObjectUrls } from '$lib/data/character-presentation-blob-cache';
import {
	processCharacterPortraitReCrop,
	processCharacterPortraitUpload
} from '$lib/domain/character-portrait';
import {
	characterToIdentityDraft,
	characterToCharacterExtrasDraft,
	type CharacterIdentityDraft,
	type NpcDraftLine,
	type CharacterExtrasDraft
} from '$lib/domain/npc-draft';
import { persistPendingCharacterMedia } from '$lib/domain/character-media';
import {
	extrasDraftToDbFields,
	identityDraftToDbFields
} from '$lib/domain/character-sheet-persistence';
import type { PromoteAdventureOptions } from '$lib/domain/promote-adventure';
import { bumpCampaignCharactersRevision } from '$lib/stores/campaign-characters-revision.svelte';
import { refreshMediaLibrary } from '$lib/stores/media-library.svelte';

function createOnboardingPcCharacter(
	player: { character_id: string; display_name: string },
	campaignId: string,
	ownerUserId: string
): Character {
	return {
		character_id: player.character_id,
		campaign_id: campaignId,
		kind: 'pc',
		created_by_user_id: ownerUserId,
		cloned_from_character_id: null,
		display_name: player.display_name,
		experience_base: 0,
		experience: 0,
		level: 1,
		hp_max_base: 0,
		hp_current_base: 0,
		hp_current: 0,
		hp_max: 0,
		reputation: null,
		notes: null,
		presentation: null,
		race: null,
		creature_type: null,
		alignment: null,
		age: null,
		class_name: null,
		role_label: null,
		background: null,
		height: null,
		weight: null,
		eyes: null,
		skin: null,
		hair: null,
		inspiration: false,
		initiative: null,
		temp_hp: null,
		hit_dice_remaining: null,
		death_save_successes: 0,
		death_save_failures: 0,
		personality_traits: null,
		ideals: null,
		bonds: null,
		flaws: null,
		backstory: null,
		allies: null,
		features: null,
		proficiencies: null,
		treasure: null,
		armor_class: null,
		armor_class_notes: null,
		speed: null,
		hp_dice: null,
		ability_str: null,
		ability_dex: null,
		ability_con: null,
		ability_int: null,
		ability_wis: null,
		ability_cha: null,
		skills: null,
		senses: null,
		languages: null,
		challenge_rating: null,
		traits: null,
		actions: null,
		is_spellcaster: false,
		spellcasting_class: null,
		spellcasting_ability: null,
		spell_slots_total: null,
		spell_slots_expended: null,
		mime_type: null,
		portrait_width: null,
		portrait_height: null,
		thumb_width: null,
		thumb_height: null,
		image_source: null,
		original_mime_type: null,
		original_width: null,
		original_height: null,
		thumb_crop_json: null,
		presentation_mime_type: null,
		presentation_width: null,
		presentation_height: null,
		presentation_thumb_width: null,
		presentation_thumb_height: null,
		presentation_image_source: null,
		presentation_original_mime_type: null,
		presentation_original_width: null,
		presentation_original_height: null,
		presentation_thumb_crop_json: null,
		portrait_media_id: null,
		presentation_media_id: null,
		date_deleted: null
	};
}

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
		nickname: null,
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

	mergeCampaignIntoCache(campaign, membership, {
		users: players.map((player) => ({
			user_id: player.user_id,
			email: '',
			username: player.username,
			theme: 'default',
			date_created: now,
			date_deleted: null
		})),
		members: players.map((player) => ({
			player_id: player.player_id,
			campaign_id: campaignId,
			user_id: player.user_id,
			character_id: player.character_id,
			date_campaign_joined: now,
			role: 'player',
			last_played_at: null
		})),
		characters: players.map((player) =>
			createOnboardingPcCharacter(
				{ character_id: player.character_id, display_name: player.display_name },
				campaignId,
				ownerUserId
			)
		)
	});
	bumpCampaignCharactersRevision();

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
		shorthand: null,
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
	const snapshot = await loadCampaignSnapshot();
	mergePromotedCampaignFromSnapshot(snapshot, result.campaign_id);

	return {
		campaignId: result.campaign_id,
		adventureId: result.adventure_id
	};
}

export async function persistUserTheme(userId: string, theme: ThemePreset): Promise<void> {
	preferences.setUserTheme(userId, theme);
	setStoredUserTheme(userId, theme);
	updateUserInCache(userId, { theme });
	await updateUserThemeInDb(userId, theme);
}

export async function persistCampaignTheme(
	campaignId: string,
	theme: CampaignTheme
): Promise<void> {
	preferences.setCampaignTheme(campaignId, theme);
	setStoredCampaignTheme(campaignId, theme);
	updateCampaignInCache(campaignId, { theme });
	await updateCampaignThemeInDb(campaignId, theme);
}

export async function persistCampaignDetails(
	campaignId: string,
	draft: { campaign_name: string; nickname: string; description: string }
): Promise<Campaign> {
	const campaign_name = draft.campaign_name.trim();
	if (!campaign_name) {
		throw new Error('Campaign name is required');
	}

	const nickname = draft.nickname.trim() || null;
	const description = draft.description.trim() || null;
	const campaign = await updateCampaignDetailsInDb({
		campaign_id: campaignId,
		campaign_name,
		nickname,
		description
	});

	updateCampaignInCache(campaignId, { campaign_name, nickname, description });
	return campaign;
}

export async function persistAdventureShorthand(
	adventureId: string,
	shorthand: string
): Promise<Adventure> {
	const normalized = shorthand.trim() || null;
	const adventure = await updateAdventureShorthandInDb({
		adventure_id: adventureId,
		shorthand: normalized
	});

	updateAdventureInCache(adventureId, { shorthand: normalized });
	return adventure;
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
		preferences.setUserTheme(userId, dbUserTheme);
	} else if (storedUserTheme) {
		preferences.setUserTheme(userId, storedUserTheme);
	}

	for (const campaign of getCampaigns()) {
		const storedCampaignTheme = getStoredCampaignTheme(campaign.campaign_id);

		if (storedCampaignTheme && storedCampaignTheme !== campaign.theme) {
			await persistCampaignTheme(campaign.campaign_id, storedCampaignTheme);
		} else if (!storedCampaignTheme) {
			setStoredCampaignTheme(campaign.campaign_id, campaign.theme);
			preferences.setCampaignTheme(campaign.campaign_id, campaign.theme);
		} else {
			preferences.setCampaignTheme(campaign.campaign_id, storedCampaignTheme);
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
	file: File | null,
	imageSource: string | null = null,
	existingMediaId: string | null = null
): Promise<CampaignMap> {
	const mapId = `map-${crypto.randomUUID()}`;
	const now = new Date().toISOString();

	if (existingMediaId) {
		const asset = await loadMediaAssetByIdInDb(existingMediaId);
		if (!asset) {
			throw new Error('Selected image not found');
		}

		const map = await createCampaignMapInDb(
			{
				map_id: mapId,
				campaign_id: campaignId,
				name: name.trim(),
				mime_type: asset.mime_type,
				full_width: asset.full_width,
				full_height: asset.full_height,
				thumb_width: asset.thumb_width ?? asset.full_width,
				thumb_height: asset.thumb_height ?? asset.full_height,
				image_source: imageSource ?? asset.image_source,
				media_id: existingMediaId,
				created_at: now
			},
			null,
			null
		);

		mergeCampaignMapIntoCache(map);
		void refreshMediaLibrary();
		return map;
	}

	if (!file) {
		throw new Error('No image selected');
	}

	const processed = await processMapUpload(file);
	const mediaId = buildMediaAssetId();

	await createMediaAssetInDb(
		{
			media_id: mediaId,
			label: name.trim(),
			mime_type: processed.mime_type,
			full_width: processed.full_width,
			full_height: processed.full_height,
			thumb_width: processed.thumb_width,
			thumb_height: processed.thumb_height,
			image_source: imageSource,
			created_at: now
		},
		processed.thumbBuffer,
		processed.fullBuffer,
		null
	);

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
			media_id: mediaId,
			created_at: now
		},
		null,
		null
	);

	mergeCampaignMapIntoCache(map);
	void refreshMediaLibrary();
	return map;
}

export async function removeCampaignMap(mapId: string): Promise<void> {
	await deleteCampaignMapInDb(mapId);
	removeCampaignMapFromCache(mapId);
	revokeCampaignMapObjectUrls(mapId);
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

	let saved = character;

	if (
		line.portraitFile ||
		line.portraitThumbCropFile ||
		line.portraitExistingMediaId ||
		line.presentationFile ||
		line.presentationThumbCropFile
	) {
		await persistPendingCharacterMedia(character.character_id, {
			portraitOriginalFile: line.portraitFile,
			portraitThumbCropFile: line.portraitThumbCropFile,
			portraitThumbCropRect: line.portraitThumbCropRect,
			portraitImageSource: line.portraitImageSource,
			portraitExistingMediaId: line.portraitExistingMediaId,
			presentationOriginalFile: line.presentationFile,
			presentationThumbCropFile: line.presentationThumbCropFile,
			presentationThumbCropRect: line.presentationThumbCropRect,
			presentationImageSource: line.presentationImageSource
		});
		saved = getCharacterById(character.character_id) ?? character;
	}

	return saved;
}

type CharacterImageVariant = 'portrait' | 'presentation';
type CharacterPortraitUploadPayload = import('$lib/types/image-upload').CharacterPortraitUploadPayload;
type MediaAsset = import('$lib/domain/media-asset').MediaAsset;
type PortraitReCropResult = Awaited<ReturnType<typeof processCharacterPortraitReCrop>>;
type PortraitUploadResult = NonNullable<
	Awaited<ReturnType<typeof processCharacterPortraitUpload>>
>;

function getCharacterImageLabel(
	character: Character | undefined,
	variant: CharacterImageVariant
): string {
	const base = character?.display_name ?? (variant === 'portrait' ? 'Portrait' : 'Character');
	return variant === 'presentation' ? `${base} (presentation)` : base;
}

function buildExistingMediaUpdate(
	variant: CharacterImageVariant,
	characterId: string,
	existingMediaId: string,
	asset: MediaAsset,
	reCrop: PortraitReCropResult,
	imageSource: string | null
): import('$lib/db/types').UpdateCharacterPortraitInput | import('$lib/db/types').UpdateCharacterPresentationInput {
	if (variant === 'portrait') {
		return {
			character_id: characterId,
			portrait_media_id: existingMediaId,
			mime_type: asset.mime_type,
			portrait_width: asset.full_width,
			portrait_height: asset.full_height,
			original_mime_type: asset.original_mime_type ?? asset.mime_type,
			original_width: asset.original_width ?? asset.full_width,
			original_height: asset.original_height ?? asset.full_height,
			thumb_width: reCrop.thumb_width,
			thumb_height: reCrop.thumb_height,
			thumb_crop_json: reCrop.thumb_crop_json,
			image_source: imageSource ?? asset.image_source
		};
	}

	return {
		character_id: characterId,
		presentation_media_id: existingMediaId,
		presentation_mime_type: asset.mime_type,
		presentation_width: asset.full_width,
		presentation_height: asset.full_height,
		presentation_original_mime_type: asset.original_mime_type ?? asset.mime_type,
		presentation_original_width: asset.original_width ?? asset.full_width,
		presentation_original_height: asset.original_height ?? asset.full_height,
		presentation_thumb_width: reCrop.thumb_width,
		presentation_thumb_height: reCrop.thumb_height,
		presentation_thumb_crop_json: reCrop.thumb_crop_json,
		presentation_image_source: imageSource ?? asset.image_source
	};
}

function buildProcessedUpdate(
	variant: CharacterImageVariant,
	characterId: string,
	mediaId: string | null,
	processed: PortraitUploadResult,
	imageSource: string | null
): import('$lib/db/types').UpdateCharacterPortraitInput | import('$lib/db/types').UpdateCharacterPresentationInput {
	if (variant === 'portrait') {
		return {
			character_id: characterId,
			portrait_media_id: mediaId,
			mime_type: processed.mime_type,
			portrait_width: processed.portrait_width,
			portrait_height: processed.portrait_height,
			original_mime_type: processed.original_mime_type,
			original_width: processed.original_width,
			original_height: processed.original_height,
			thumb_width: processed.thumb_width,
			thumb_height: processed.thumb_height,
			thumb_crop_json: processed.thumb_crop_json,
			image_source: imageSource
		};
	}

	return {
		character_id: characterId,
		presentation_media_id: mediaId,
		presentation_mime_type: processed.mime_type,
		presentation_width: processed.portrait_width,
		presentation_height: processed.portrait_height,
		presentation_original_mime_type: processed.original_mime_type,
		presentation_original_width: processed.original_width,
		presentation_original_height: processed.original_height,
		presentation_thumb_width: processed.thumb_width,
		presentation_thumb_height: processed.thumb_height,
		presentation_thumb_crop_json: processed.thumb_crop_json,
		presentation_image_source: imageSource
	};
}

function buildReCropUpdate(
	variant: CharacterImageVariant,
	characterId: string,
	reCrop: PortraitReCropResult,
	imageSource: string | null
): import('$lib/db/types').UpdateCharacterPortraitInput | import('$lib/db/types').UpdateCharacterPresentationInput {
	if (variant === 'portrait') {
		return {
			character_id: characterId,
			thumb_width: reCrop.thumb_width,
			thumb_height: reCrop.thumb_height,
			thumb_crop_json: reCrop.thumb_crop_json,
			image_source: imageSource
		};
	}

	return {
		character_id: characterId,
		presentation_thumb_width: reCrop.thumb_width,
		presentation_thumb_height: reCrop.thumb_height,
		presentation_thumb_crop_json: reCrop.thumb_crop_json,
		presentation_image_source: imageSource
	};
}

async function persistCharacterImage(
	characterId: string,
	variant: CharacterImageVariant,
	payload: CharacterPortraitUploadPayload
): Promise<Character> {
	const character = getCharacterById(characterId);
	const label = getCharacterImageLabel(character, variant);
	const revokeObjectUrls =
		variant === 'presentation'
			? revokeCharacterPresentationObjectUrls
			: revokeCharacterPortraitObjectUrls;

	if (payload.existingMediaId) {
		const asset = await loadMediaAssetByIdInDb(payload.existingMediaId);
		if (!asset) {
			throw new Error('Selected image not found');
		}

		const reCrop = await processCharacterPortraitReCrop({
			originalFile: null,
			thumbCropFile: payload.thumbCropFile ?? null,
			thumbCropRect: payload.thumbCropRect ?? null,
			imageSource: payload.imageSource
		});

		const updated =
			variant === 'presentation'
				? await updateCharacterPresentationInDb(
						buildExistingMediaUpdate(
							variant,
							characterId,
							payload.existingMediaId,
							asset,
							reCrop,
							payload.imageSource
						) as import('$lib/db/types').UpdateCharacterPresentationInput,
						reCrop.thumbBuffer,
						null,
						null
					)
				: await updateCharacterPortraitInDb(
						buildExistingMediaUpdate(
							variant,
							characterId,
							payload.existingMediaId,
							asset,
							reCrop,
							payload.imageSource
						) as import('$lib/db/types').UpdateCharacterPortraitInput,
						reCrop.thumbBuffer,
						null,
						null
					);

		revokeObjectUrls(characterId);
		mergeCharacterIntoCache(updated);
		void refreshMediaLibrary();
		return getCharacterById(characterId) ?? updated;
	}

	const processed = payload.originalFile ? await processCharacterPortraitUpload(payload) : null;
	const reCrop = processed
		? null
		: await processCharacterPortraitReCrop({
				originalFile: null,
				thumbCropFile: payload.thumbCropFile ?? null,
				thumbCropRect: payload.thumbCropRect ?? null,
				imageSource: payload.imageSource
			});

	let mediaId: string | null = null;

	if (processed?.fullBuffer) {
		mediaId = buildMediaAssetId();
		await createMediaAssetInDb(
			{
				media_id: mediaId,
				label,
				mime_type: processed.mime_type,
				original_mime_type: processed.original_mime_type,
				full_width: processed.portrait_width,
				full_height: processed.portrait_height,
				original_width: processed.original_width,
				original_height: processed.original_height,
				thumb_width: processed.thumb_width,
				thumb_height: processed.thumb_height,
				image_source: payload.imageSource,
				created_at: new Date().toISOString()
			},
			processed.thumbBuffer,
			processed.fullBuffer,
			processed.originalBuffer
		);
	}

	const updateInput = processed
		? buildProcessedUpdate(variant, characterId, mediaId, processed, payload.imageSource)
		: buildReCropUpdate(variant, characterId, reCrop!, payload.imageSource);

	const updatedCharacter =
		variant === 'presentation'
			? await updateCharacterPresentationInDb(
					updateInput as import('$lib/db/types').UpdateCharacterPresentationInput,
					processed?.thumbBuffer ?? reCrop!.thumbBuffer,
					null,
					null
				)
			: await updateCharacterPortraitInDb(
					updateInput as import('$lib/db/types').UpdateCharacterPortraitInput,
					processed?.thumbBuffer ?? reCrop!.thumbBuffer,
					null,
					null
				);

	revokeObjectUrls(characterId);
	mergeCharacterIntoCache(updatedCharacter);
	void refreshMediaLibrary();
	return getCharacterById(characterId) ?? updatedCharacter;
}

export async function persistCharacterPortrait(
	characterId: string,
	payload: CharacterPortraitUploadPayload
): Promise<Character> {
	return persistCharacterImage(characterId, 'portrait', payload);
}

export async function persistCharacterPresentation(
	characterId: string,
	payload: CharacterPortraitUploadPayload
): Promise<Character> {
	return persistCharacterImage(characterId, 'presentation', payload);
}

export async function persistCharacterPortraitSource(
	characterId: string,
	imageSource: string | null
): Promise<Character> {
	const character = await updateCharacterPortraitSourceInDb(characterId, imageSource);
	mergeCharacterIntoCache(character);
	return getCharacterById(characterId) ?? character;
}

export async function persistCharacterPresentationSource(
	characterId: string,
	presentationImageSource: string | null
): Promise<Character> {
	const character = await updateCharacterPresentationSourceInDb(
		characterId,
		presentationImageSource
	);
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

function npcExtrasToLoadout(extras: CharacterExtrasDraft) {
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
		extras: CharacterExtrasDraft;
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

	const latest = getCharacterById(characterId) ?? existing;
	if (payload.extras.level !== latest.level) {
		const updated = await updateCharacterStatCacheInDb({
			character_id: characterId,
			experience: latest.experience,
			level: payload.extras.level,
			hp_max: latest.hp_max,
			hp_current: latest.hp_current
		});
		mergeCharacterIntoCache(updated);
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
	extras: CharacterExtrasDraft;
}> {
	const loadout = await loadCharacterLoadoutInDb(character.character_id);

	return {
		kind: character.kind,
		name: character.display_name,
		playerName:
			character.kind === 'pc' ? (getPlayerUsernameForCharacter(character.character_id) ?? '') : '',
		description: character.notes ?? '',
		identity: characterToIdentityDraft(character),
		extras: characterToCharacterExtrasDraft(character, loadout)
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

export async function removeCampaignPlayer(campaignId: string, characterId: string): Promise<void> {
	await removeCampaignPlayerInDb(campaignId, characterId);
	removeCampaignPlayerFromCache(campaignId, characterId);
}
