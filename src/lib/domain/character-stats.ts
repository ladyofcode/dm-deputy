import { getRuleset } from '$lib/games';
import type {
	Character,
	CharacterStatEvent,
	EncounterResolution,
	EncounterXpSplitMode,
	StatKind,
	StatSourceType,
	StoryNode
} from '$lib/types/schema';

const BASE_FIELD = {
	experience: 'experience_base',
	hp_current: 'hp_current_base',
	hp_max: 'hp_max_base'
} as const satisfies Record<StatKind, keyof Character>;

const CACHED_FIELD = {
	experience: 'experience',
	hp_current: 'hp_current',
	hp_max: 'hp_max'
} as const satisfies Record<StatKind, keyof Character>;

export type ApplyStatChangeInput = {
	characterId: string;
	stat: StatKind;
	delta: number;
	sourceType: StatSourceType;
	sourceId?: string | null;
	sourceLabel: string;
	description?: string | null;
	batchId?: string | null;
	actorUserId: string;
	metadata?: Record<string, unknown> | null;
};

export type CreateCharacterInput = {
	campaignId: string;
	kind: Character['kind'];
	createdByUserId: string;
	displayName: string;
	experienceBase?: number;
	hpMaxBase?: number;
	hpCurrentBase?: number;
	reputation?: string | null;
	notes?: string | null;
	clonedFromCharacterId?: string | null;
};

export type EncounterXpContext = {
	adventureId?: string;
	partId?: string;
	adventureName?: string;
	partName?: string;
};

export type AwardEncounterXpInput = {
	node: Pick<StoryNode, 'node_id' | 'title'>;
	totalXp?: number;
	recipientCharacterIds: string[];
	splitMode?: EncounterXpSplitMode;
	customShares?: Record<string, number>;
	shareDescriptions?: Record<string, string>;
	actorUserId: string;
	gameSchema: string;
	context?: EncounterXpContext;
};

export type XpAwardEntry = {
	characterId: string;
	amount: number;
	description: string;
};

export type CharacterStatsRepository = {
	getCharacter(characterId: string): Character | undefined;
	saveCharacter(character: Character): void;
	appendStatEvent(event: CharacterStatEvent): void;
	getStatEvents(characterId: string, stat?: StatKind): CharacterStatEvent[];
	saveEncounterResolution(resolution: EncounterResolution): void;
};

const characters = new Map<string, Character>();
const statEvents: CharacterStatEvent[] = [];
const encounterResolutions = new Map<string, EncounterResolution>();

export const inMemoryCharacterStatsRepository: CharacterStatsRepository = {
	getCharacter(characterId) {
		return characters.get(characterId);
	},
	saveCharacter(character) {
		characters.set(character.character_id, character);
	},
	appendStatEvent(event) {
		statEvents.push(event);
	},
	getStatEvents(characterId, stat) {
		return statEvents.filter(
			(event) => event.character_id === characterId && (stat === undefined || event.stat === stat)
		);
	},
	saveEncounterResolution(resolution) {
		encounterResolutions.set(resolution.resolution_id, resolution);
	}
};

let repository: CharacterStatsRepository = inMemoryCharacterStatsRepository;

export function setCharacterStatsRepository(next: CharacterStatsRepository): void {
	repository = next;
}

export function resetCharacterStatsRepository(): void {
	characters.clear();
	statEvents.length = 0;
	encounterResolutions.clear();
	repository = inMemoryCharacterStatsRepository;
}

export function getCharacterById(characterId: string): Character | undefined {
	return repository.getCharacter(characterId);
}

export function getStatHistory(characterId: string, stat?: StatKind): CharacterStatEvent[] {
	return [...repository.getStatEvents(characterId, stat)].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
}

export function getEncounterResolutionById(resolutionId: string): EncounterResolution | undefined {
	return encounterResolutions.get(resolutionId);
}

export function computeCurrentStat(
	character: Character,
	events: CharacterStatEvent[],
	stat: StatKind
): number {
	const baseField = BASE_FIELD[stat];
	const base = character[baseField];
	const deltaSum = events
		.filter((event) => event.stat === stat)
		.reduce((sum, event) => sum + event.delta, 0);

	return base + deltaSum;
}

export function computeEqualXpShares(
	totalXp: number,
	recipientCharacterIds: string[]
): Map<string, number> {
	if (recipientCharacterIds.length === 0) {
		return new Map();
	}

	const baseShare = Math.floor(totalXp / recipientCharacterIds.length);
	let remainder = totalXp % recipientCharacterIds.length;
	const shares = new Map<string, number>();

	for (const characterId of recipientCharacterIds) {
		const extra = remainder > 0 ? 1 : 0;
		if (remainder > 0) {
			remainder -= 1;
		}

		shares.set(characterId, baseShare + extra);
	}

	return shares;
}

export function computeEncounterXpShares(
	totalXp: number,
	recipientCharacterIds: string[],
	splitMode: EncounterXpSplitMode,
	customShares?: Record<string, number>
): Map<string, number> {
	if (splitMode === 'equal') {
		return computeEqualXpShares(totalXp, recipientCharacterIds);
	}

	if (!customShares) {
		throw new Error('customShares is required when splitMode is "custom".');
	}

	const shares = new Map<string, number>();
	let allocated = 0;

	for (const characterId of recipientCharacterIds) {
		const amount = customShares[characterId] ?? 0;
		if (amount < 0) {
			throw new Error(`XP share for character ${characterId} cannot be negative.`);
		}

		shares.set(characterId, amount);
		allocated += amount;
	}

	if (allocated !== totalXp) {
		throw new Error(
			`Custom XP shares (${allocated}) must sum to the encounter total (${totalXp}).`
		);
	}

	return shares;
}

export function syncDerivedCharacterFields(character: Character, gameSchema: string): Character {
	const ruleset = getRuleset(gameSchema);

	return {
		...character,
		level: ruleset.getLevelForExperience(character.experience)
	};
}

export function formatStatEventSummary(event: CharacterStatEvent): string {
	const sign = event.delta >= 0 ? '+' : '';
	const label = event.description?.trim() || event.source_label;
	const parts = [`${sign}${event.delta}`, label];

	const adventureName =
		typeof event.metadata?.adventure_name === 'string' ? event.metadata.adventure_name : null;
	const partName = typeof event.metadata?.part_name === 'string' ? event.metadata.part_name : null;

	if (adventureName && partName) {
		parts.push(`${adventureName} · ${partName}`);
	} else if (adventureName) {
		parts.push(adventureName);
	} else if (partName) {
		parts.push(partName);
	}

	const date = new Date(event.created_at);
	if (!Number.isNaN(date.getTime())) {
		parts.push(date.toLocaleDateString());
	}

	return parts.join(' · ');
}

function createStatEventId(): string {
	return `stat-event-${crypto.randomUUID()}`;
}

function createResolutionId(): string {
	return `encounter-resolution-${crypto.randomUUID()}`;
}

function createCharacterId(): string {
	return `character-${crypto.randomUUID()}`;
}

export function createCharacter(
	input: CreateCharacterInput,
	gameSchema: string
): { character: Character; creationEvent: CharacterStatEvent } {
	const hpMaxBase = input.hpMaxBase ?? 0;
	const hpCurrentBase = input.hpCurrentBase ?? hpMaxBase;
	const experienceBase = input.experienceBase ?? 0;

	const character: Character = {
		character_id: createCharacterId(),
		campaign_id: input.campaignId,
		kind: input.kind,
		created_by_user_id: input.createdByUserId,
		cloned_from_character_id: input.clonedFromCharacterId ?? null,
		display_name: input.displayName,
		experience_base: experienceBase,
		experience: experienceBase,
		level: getRuleset(gameSchema).getLevelForExperience(experienceBase),
		hp_max_base: hpMaxBase,
		hp_current_base: hpCurrentBase,
		hp_current: hpCurrentBase,
		hp_max: hpMaxBase,
		reputation: input.reputation ?? null,
		notes: input.notes ?? null
	};

	const creationEvents: CharacterStatEvent[] = [];

	if (experienceBase !== 0) {
		creationEvents.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'experience',
			delta: experienceBase,
			value_after: experienceBase,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: input.createdByUserId,
			metadata: null,
			created_at: new Date().toISOString()
		});
	}

	if (hpMaxBase !== 0) {
		creationEvents.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'hp_max',
			delta: hpMaxBase,
			value_after: hpMaxBase,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: input.createdByUserId,
			metadata: null,
			created_at: new Date().toISOString()
		});
	}

	if (hpCurrentBase !== 0) {
		creationEvents.push({
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'hp_current',
			delta: hpCurrentBase,
			value_after: hpCurrentBase,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: input.createdByUserId,
			metadata: null,
			created_at: new Date().toISOString()
		});
	}

	repository.saveCharacter(character);
	for (const event of creationEvents) {
		repository.appendStatEvent(event);
	}

	return {
		character,
		creationEvent: creationEvents[0] ?? {
			stat_event_id: createStatEventId(),
			character_id: character.character_id,
			campaign_id: character.campaign_id,
			stat: 'experience',
			delta: 0,
			value_after: 0,
			source_type: 'creation',
			source_id: null,
			source_label: 'Character created',
			description: null,
			batch_id: null,
			actor_user_id: input.createdByUserId,
			metadata: null,
			created_at: new Date().toISOString()
		}
	};
}

export function applyStatChange(
	input: ApplyStatChangeInput,
	gameSchema: string
): CharacterStatEvent {
	const character = repository.getCharacter(input.characterId);
	if (!character) {
		throw new Error(`Character ${input.characterId} not found.`);
	}

	const history = repository.getStatEvents(input.characterId, input.stat);
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

	repository.appendStatEvent(event);

	const cachedField = CACHED_FIELD[input.stat];
	const updatedCharacter = syncDerivedCharacterFields(
		{
			...character,
			[cachedField]: valueAfter
		},
		gameSchema
	);

	repository.saveCharacter(updatedCharacter);

	return event;
}

export function awardEncounterXp(input: AwardEncounterXpInput): {
	resolution: EncounterResolution;
	events: CharacterStatEvent[];
} {
	const totalXp = input.totalXp ?? 0;
	const sourceLabel = input.node.title;
	if (totalXp <= 0) {
		throw new Error(`Encounter ${input.node.node_id} has no XP to award.`);
	}

	if (input.recipientCharacterIds.length === 0) {
		throw new Error('At least one recipient character is required to award encounter XP.');
	}

	const splitMode = input.splitMode ?? 'equal';
	const shares = computeEncounterXpShares(
		totalXp,
		input.recipientCharacterIds,
		splitMode,
		input.customShares
	);

	const resolution: EncounterResolution = {
		resolution_id: createResolutionId(),
		event_id: input.node.node_id,
		total_xp: totalXp,
		split_mode: splitMode,
		resolved_by_user_id: input.actorUserId,
		resolved_at: new Date().toISOString()
	};

	repository.saveEncounterResolution(resolution);

	const events: CharacterStatEvent[] = [];

	for (const [characterId, amount] of shares) {
		if (amount === 0) continue;

		const description = input.shareDescriptions?.[characterId]?.trim() ?? '';
		if (!description) {
			throw new Error('Each XP award needs a description.');
		}

		events.push(
			applyStatChange(
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
			)
		);
	}

	return { resolution, events };
}
