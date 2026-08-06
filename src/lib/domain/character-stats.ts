import { getRuleset } from '$lib/games';
import type {
	Character,
	CharacterStatEvent,
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

export function buildStatChangeResult(
	character: Character,
	priorEvents: CharacterStatEvent[],
	input: ApplyStatChangeInput,
	gameSchema: string
): { event: CharacterStatEvent; character: Character } {
	const history = priorEvents.filter((entry) => entry.stat === input.stat);
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

	const allEvents = [...priorEvents, event];
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

	return { event, character: updatedCharacter };
}
