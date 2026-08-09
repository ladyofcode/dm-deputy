import { getCharacterById } from '$lib/data';
import {
	getEncounterResolutionByEventIdInDb,
	insertCharacterStatEventAndUpdateCacheInDb,
	insertCharacterStatEventsInDb,
	loadCharacterStatEventsInDb,
	loadEncounterXpAwardsByEventIdsInDb,
	persistEncounterXpBatchInDb,
	persistStatChangesBatchInDb
} from '$lib/db/client';
import { mergeCharacterIntoCache } from '$lib/db/cache';
import {
	buildStatChangeResult,
	computeEncounterXpShares,
	type ApplyStatChangeInput,
	type AwardEncounterXpInput
} from '$lib/domain/character-stats';
import type {
	Character,
	CharacterStatEvent,
	EncounterResolution,
	EncounterXpAward,
	StatKind
} from '$lib/types/schema';
import { bumpCampaignCharactersRevision } from '$lib/stores/campaign-characters-revision.svelte';

function createStatEventId(): string {
	return `stat-event-${crypto.randomUUID()}`;
}

export async function loadCharacterStatEvents(
	characterId: string,
	stat?: StatKind
): Promise<CharacterStatEvent[]> {
	return loadCharacterStatEventsInDb(characterId, stat ?? null);
}

export async function getEncounterResolutionByEventId(
	eventId: string
): Promise<EncounterResolution | null> {
	return getEncounterResolutionByEventIdInDb(eventId);
}

export async function loadEncounterXpAwardsByEventIds(
	eventIds: string[]
): Promise<EncounterXpAward[]> {
	return loadEncounterXpAwardsByEventIdsInDb(eventIds);
}

async function persistStatChange(
	input: ApplyStatChangeInput,
	gameSchema: string
): Promise<{ event: CharacterStatEvent; character: Character }> {
	const character = getCharacterById(input.characterId);
	if (!character) {
		throw new Error(`Character ${input.characterId} not found.`);
	}

	const priorEvents = await loadCharacterStatEvents(input.characterId);
	const { event, character: updatedCharacter } = buildStatChangeResult(
		character,
		priorEvents,
		input,
		gameSchema
	);

	const { character: persisted } = await insertCharacterStatEventAndUpdateCacheInDb(event, {
		character_id: updatedCharacter.character_id,
		experience: updatedCharacter.experience,
		level: updatedCharacter.level,
		hp_max: updatedCharacter.hp_max,
		hp_current: updatedCharacter.hp_current
	});

	mergeCharacterIntoCache(persisted);
	bumpCampaignCharactersRevision();

	return { event, character: persisted };
}

export async function persistApplyStatChange(
	input: ApplyStatChangeInput,
	gameSchema: string
): Promise<CharacterStatEvent> {
	const { event } = await persistStatChange(input, gameSchema);
	return event;
}

export async function persistAwardEncounterXp(
	input: AwardEncounterXpInput
): Promise<{ resolution: EncounterResolution; events: CharacterStatEvent[] }> {
	const existing = await getEncounterResolutionByEventId(input.node.node_id);
	if (existing) {
		throw new Error(`XP for "${input.node.title}" was already awarded.`);
	}

	const splitMode = input.splitMode ?? 'equal';
	const totalXp = input.totalXp ?? 0;
	const sourceLabel = input.node.title;
	const shares = computeEncounterXpShares(
		totalXp,
		input.recipientCharacterIds,
		splitMode,
		input.customShares
	);

	const resolution: EncounterResolution = {
		resolution_id: `encounter-resolution-${crypto.randomUUID()}`,
		event_id: input.node.node_id,
		total_xp: totalXp,
		split_mode: splitMode,
		resolved_by_user_id: input.actorUserId,
		resolved_at: new Date().toISOString()
	};

	const awards: Array<{
		event: CharacterStatEvent;
		cache: {
			character_id: string;
			experience: number;
			level: number;
			hp_max: number;
			hp_current: number;
		};
	}> = [];

	for (const [characterId, amount] of shares) {
		if (amount === 0) continue;

		const description = input.shareDescriptions?.[characterId]?.trim() ?? '';
		if (!description) {
			throw new Error('Each XP award needs a description.');
		}

		const character = getCharacterById(characterId);
		if (!character) {
			throw new Error(`Character ${characterId} not found.`);
		}

		const priorEvents = await loadCharacterStatEvents(characterId);
		const { event, character: updatedCharacter } = buildStatChangeResult(
			character,
			priorEvents,
			{
				characterId,
				stat: 'experience',
				delta: amount,
				sourceType: 'encounter_xp',
				sourceId: input.node.node_id,
				sourceLabel,
				description,
				batchId: resolution.resolution_id,
				actorUserId: input.actorUserId,
				metadata: {
					total_xp: totalXp,
					split_mode: splitMode,
					share: amount,
					...(input.context?.adventureId ? { adventure_id: input.context.adventureId } : {}),
					...(input.context?.partId ? { part_id: input.context.partId } : {}),
					...(input.context?.adventureName ? { adventure_name: input.context.adventureName } : {}),
					...(input.context?.partName ? { part_name: input.context.partName } : {})
				}
			},
			input.gameSchema
		);

		awards.push({
			event,
			cache: {
				character_id: updatedCharacter.character_id,
				experience: updatedCharacter.experience,
				level: updatedCharacter.level,
				hp_max: updatedCharacter.hp_max,
				hp_current: updatedCharacter.hp_current
			}
		});
	}

	const result = await persistEncounterXpBatchInDb({ resolution, awards });

	for (const character of result.characters) {
		mergeCharacterIntoCache(character);
	}

	bumpCampaignCharactersRevision();

	return { resolution: result.resolution, events: result.events };
}

export async function persistFreeformXpAwards(input: {
	entries: Array<{ characterId: string; amount: number; description: string }>;
	sourceLabel: string;
	actorUserId: string;
	gameSchema: string;
	context?: AwardEncounterXpInput['context'];
}): Promise<CharacterStatEvent[]> {
	const sourceLabel = input.sourceLabel.trim() || 'XP award';
	const batchId = `xp-batch-${crypto.randomUUID()}`;
	const awards: Array<{
		event: CharacterStatEvent;
		cache: {
			character_id: string;
			experience: number;
			level: number;
			hp_max: number;
			hp_current: number;
		};
	}> = [];

	for (const entry of input.entries) {
		if (entry.amount <= 0) continue;

		const description = entry.description.trim();
		if (!description) {
			throw new Error('Each XP award needs a description.');
		}

		const character = getCharacterById(entry.characterId);
		if (!character) {
			throw new Error(`Character ${entry.characterId} not found.`);
		}

		const priorEvents = await loadCharacterStatEvents(entry.characterId);
		const { event, character: updatedCharacter } = buildStatChangeResult(
			character,
			priorEvents,
			{
				characterId: entry.characterId,
				stat: 'experience',
				delta: entry.amount,
				sourceType: 'story_event',
				sourceLabel,
				description,
				batchId,
				actorUserId: input.actorUserId,
				metadata: {
					share: entry.amount,
					...(input.context?.adventureId ? { adventure_id: input.context.adventureId } : {}),
					...(input.context?.partId ? { part_id: input.context.partId } : {}),
					...(input.context?.adventureName ? { adventure_name: input.context.adventureName } : {}),
					...(input.context?.partName ? { part_name: input.context.partName } : {})
				}
			},
			input.gameSchema
		);

		awards.push({
			event,
			cache: {
				character_id: updatedCharacter.character_id,
				experience: updatedCharacter.experience,
				level: updatedCharacter.level,
				hp_max: updatedCharacter.hp_max,
				hp_current: updatedCharacter.hp_current
			}
		});
	}

	if (awards.length === 0) {
		throw new Error('Give at least one player character some XP.');
	}

	const characters = await persistStatChangesBatchInDb(awards);

	for (const character of characters) {
		mergeCharacterIntoCache(character);
	}

	bumpCampaignCharactersRevision();

	return awards.map((award) => award.event);
}

export async function persistCharacterSheetStatChanges(
	character: Character,
	next: { experience: number; hp_max: number; hp_current: number },
	actorUserId: string,
	gameSchema: string
): Promise<Character> {
	const statChanges: ApplyStatChangeInput[] = [];

	if (next.experience !== character.experience) {
		statChanges.push({
			characterId: character.character_id,
			stat: 'experience',
			delta: next.experience - character.experience,
			sourceType: 'manual',
			sourceLabel: 'Manual sheet edit',
			actorUserId
		});
	}

	if (next.hp_max !== character.hp_max) {
		statChanges.push({
			characterId: character.character_id,
			stat: 'hp_max',
			delta: next.hp_max - character.hp_max,
			sourceType: 'manual',
			sourceLabel: 'Manual sheet edit',
			actorUserId
		});
	}

	if (next.hp_current !== character.hp_current) {
		statChanges.push({
			characterId: character.character_id,
			stat: 'hp_current',
			delta: next.hp_current - character.hp_current,
			sourceType: 'manual',
			sourceLabel: 'Manual sheet edit',
			actorUserId
		});
	}

	let latest = character;

	for (const change of statChanges) {
		if (change.delta === 0) continue;
		const result = await persistStatChange(change, gameSchema);
		latest = result.character;
	}

	return latest;
}

export async function seedCharacterCreationStatEvents(
	character: Character,
	values: { experience: number; hp_max: number; hp_current: number },
	actorUserId: string
): Promise<void> {
	const createdAt = new Date().toISOString();
	const seeds: CharacterStatEvent[] = [];

	if (values.experience !== 0) {
		seeds.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'experience',
			delta: values.experience,
			value_after: values.experience,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: actorUserId,
			metadata: null,
			created_at: createdAt
		});
	}

	if (values.hp_max !== 0) {
		seeds.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'hp_max',
			delta: values.hp_max,
			value_after: values.hp_max,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: actorUserId,
			metadata: null,
			created_at: createdAt
		});
	}

	if (values.hp_current !== 0) {
		seeds.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'hp_current',
			delta: values.hp_current,
			value_after: values.hp_current,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: actorUserId,
			metadata: null,
			created_at: createdAt
		});
	}

	await insertCharacterStatEventsInDb(seeds);
}
