import { getCharacterById } from '$lib/data';
import {
	getEncounterResolutionByEventIdInDb,
	insertCharacterStatEventInDb,
	insertEncounterResolutionInDb,
	loadCharacterStatEventsInDb,
	loadEncounterXpAwardsByEventIdsInDb,
	updateCharacterStatCacheInDb
} from '$lib/db/client';
import { mergeCharacterIntoCache } from '$lib/db/cache';
import {
	computeCurrentStat,
	computeEncounterXpShares,
	syncDerivedCharacterFields,
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
import { campaignCharacters } from '$lib/stores/campaign-characters.svelte';

function createStatEventId(): string {
	return `stat-event-${crypto.randomUUID()}`;
}

export async function loadCharacterStatEvents(
	characterId: string,
	stat?: StatKind
): Promise<CharacterStatEvent[]> {
	const events = await loadCharacterStatEventsInDb(characterId, stat ?? null);
	return events.sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
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

	const history = await loadCharacterStatEvents(input.characterId, input.stat);
	const current = computeCurrentStat(character, history, input.stat);
	const valueAfter = current + input.delta;

	if (input.stat !== 'experience' && valueAfter < 0) {
		throw new Error(`${input.stat} cannot drop below zero.`);
	}

	const event: CharacterStatEvent = {
		stat_event_id: createStatEventId(),
		character_id: character.character_id,
		campaign_id: character.campaign_id,
		stat: input.stat,
		delta: input.delta,
		value_after: valueAfter,
		source_type: input.sourceType,
		source_id: input.sourceId ?? null,
		source_label: input.sourceLabel,
		description: input.description?.trim() || null,
		batch_id: input.batchId ?? null,
		actor_user_id: input.actorUserId,
		metadata: input.metadata ?? null,
		created_at: new Date().toISOString()
	};

	await insertCharacterStatEventInDb(event);

	const allEvents = await loadCharacterStatEvents(input.characterId);
	const experience = computeCurrentStat(character, allEvents, 'experience');
	const hp_current = computeCurrentStat(character, allEvents, 'hp_current');
	const hp_max = computeCurrentStat(character, allEvents, 'hp_max');

	const updatedCharacter = syncDerivedCharacterFields(
		{
			...character,
			experience,
			hp_current,
			hp_max
		},
		gameSchema
	);

	const persisted = await updateCharacterStatCacheInDb({
		character_id: updatedCharacter.character_id,
		experience: updatedCharacter.experience,
		level: updatedCharacter.level,
		hp_max: updatedCharacter.hp_max,
		hp_current: updatedCharacter.hp_current
	});

	mergeCharacterIntoCache(persisted);
	campaignCharacters.bump();

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

	await insertEncounterResolutionInDb(resolution);

	const events: CharacterStatEvent[] = [];

	for (const [characterId, amount] of shares) {
		if (amount === 0) continue;

		const description = input.shareDescriptions?.[characterId]?.trim() ?? '';
		if (!description) {
			throw new Error('Each XP award needs a description.');
		}

		const event = await persistApplyStatChange(
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
					...(input.context?.adventureName
						? { adventure_name: input.context.adventureName }
						: {}),
					...(input.context?.partName ? { part_name: input.context.partName } : {})
				}
			},
			input.gameSchema
		);

		events.push(event);
	}

	return { resolution, events };
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
	const events: CharacterStatEvent[] = [];

	for (const entry of input.entries) {
		if (entry.amount <= 0) continue;

		const description = entry.description.trim();
		if (!description) {
			throw new Error('Each XP award needs a description.');
		}

		const event = await persistApplyStatChange(
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
					...(input.context?.adventureName
						? { adventure_name: input.context.adventureName }
						: {}),
					...(input.context?.partName ? { part_name: input.context.partName } : {})
				}
			},
			input.gameSchema
		);

		events.push(event);
	}

	if (events.length === 0) {
		throw new Error('Give at least one player character some XP.');
	}

	return events;
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
	const seeds: Array<{ stat: StatKind; delta: number }> = [];

	if (values.experience !== 0) {
		seeds.push({ stat: 'experience', delta: values.experience });
	}

	if (values.hp_max !== 0) {
		seeds.push({ stat: 'hp_max', delta: values.hp_max });
	}

	if (values.hp_current !== 0) {
		seeds.push({ stat: 'hp_current', delta: values.hp_current });
	}

	for (const seed of seeds) {
		await insertCharacterStatEventInDb({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: seed.stat,
			delta: seed.delta,
			value_after: seed.delta,
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
}
