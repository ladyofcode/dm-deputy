import { execSql, selectObjects } from '../bind';
import { withTransaction } from '../sql';
import { safeJsonParseObject } from '../json';
import type {
  PersistEncounterXpBatchInput,
  PersistEncounterXpBatchResult,
  UpdateCharacterStatCacheInput
} from '../types';
import type {
  Character,
  CharacterStatEvent,
  EncounterResolution,
  EncounterXpAward,
  StatKind
} from '$lib/types/schema';
import type { AppDb } from './context';
import { loadCharacterById } from './characters';

export function mapStatEventRow(row: {
	stat_event_id: string;
	character_id: string;
	campaign_id: string;
	stat: string;
	delta: number;
	value_after: number;
	source_type: string;
	source_id: string | null;
	source_label: string | null;
	description: string | null;
	batch_id: string | null;
	actor_user_id: string | null;
	metadata: string | null;
	created_at: string;
}): CharacterStatEvent {
	let metadata: Record<string, unknown> | null = null;

	if (row.metadata) {
		metadata = safeJsonParseObject<Record<string, unknown>>(row.metadata, {});
		if (Object.keys(metadata).length === 0 && row.metadata.trim()) {
			metadata = null;
		}
	}

	return {
		stat_event_id: row.stat_event_id,
		character_id: row.character_id,
		campaign_id: row.campaign_id,
		stat: row.stat as StatKind,
		delta: row.delta,
		value_after: row.value_after,
		source_type: row.source_type as CharacterStatEvent['source_type'],
		source_id: row.source_id,
		source_label: row.source_label ?? '',
		description: row.description,
		batch_id: row.batch_id,
		actor_user_id: row.actor_user_id ?? '',
		metadata,
		created_at: row.created_at
	};
}

export function loadCharacterStatEvents(
	database: AppDb,
	characterId: string,
	stat: StatKind | null
): CharacterStatEvent[] {
	const rows = selectObjects<{
		stat_event_id: string;
		character_id: string;
		campaign_id: string;
		stat: string;
		delta: number;
		value_after: number;
		source_type: string;
		source_id: string | null;
		source_label: string | null;
		description: string | null;
		batch_id: string | null;
		actor_user_id: string | null;
		metadata: string | null;
		created_at: string;
	}>(
		database,
		stat
			? `SELECT stat_event_id, character_id, campaign_id, stat, delta, value_after,
					source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
			   FROM character_stat_events
			   WHERE character_id = $characterId AND stat = $stat
			   ORDER BY created_at ASC, stat_event_id ASC`
			: `SELECT stat_event_id, character_id, campaign_id, stat, delta, value_after,
					source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
			   FROM character_stat_events
			   WHERE character_id = $characterId
			   ORDER BY created_at ASC, stat_event_id ASC`,
		stat ? { characterId, stat } : { characterId }
	);

	return rows.map(mapStatEventRow);
}

export function insertCharacterStatEvent(database: AppDb, event: CharacterStatEvent): CharacterStatEvent {
	execSql(database, {
		sql: `INSERT INTO character_stat_events (
			stat_event_id, character_id, campaign_id, stat, delta, value_after,
			source_type, source_id, source_label, description, batch_id, actor_user_id, metadata, created_at
		) VALUES (
			$stat_event_id, $character_id, $campaign_id, $stat, $delta, $value_after,
			$source_type, $source_id, $source_label, $description, $batch_id, $actor_user_id, $metadata, $created_at
		)`,
		bind: {
			stat_event_id: event.stat_event_id,
			character_id: event.character_id,
			campaign_id: event.campaign_id,
			stat: event.stat,
			delta: event.delta,
			value_after: event.value_after,
			source_type: event.source_type,
			source_id: event.source_id,
			source_label: event.source_label,
			description: event.description,
			batch_id: event.batch_id,
			actor_user_id: event.actor_user_id,
			metadata: event.metadata ? JSON.stringify(event.metadata) : null,
			created_at: event.created_at
		}
	});

	return event;
}

export function updateCharacterStatCache(database: AppDb, input: UpdateCharacterStatCacheInput): Character {
	const rows = selectObjects<{
		character_id: string;
		campaign_id: string;
		kind: string;
		created_by_user_id: string;
		cloned_from_character_id: string | null;
		display_name: string;
		experience_base: number;
		hp_max_base: number;
		hp_current_base: number;
		reputation: string | null;
		notes: string | null;
	}>(
		database,
		`SELECT character_id, campaign_id, kind, created_by_user_id, cloned_from_character_id,
			display_name, experience_base, hp_max_base, hp_current_base, reputation, notes
		 FROM characters
		 WHERE character_id = $characterId
		 LIMIT 1`,
		{ characterId: input.character_id }
	);

	const existing = rows[0];
	if (!existing) {
		throw new Error('Character not found');
	}

	execSql(database, {
		sql: `UPDATE characters SET
			experience = $experience,
			level = $level,
			hp_max = $hp_max,
			hp_current = $hp_current
		WHERE character_id = $character_id`,
		bind: {
			character_id: input.character_id,
			experience: input.experience,
			level: input.level,
			hp_max: input.hp_max,
			hp_current: input.hp_current
		}
	});

	return loadCharacterById(database, input.character_id)!;
}

export function insertCharacterStatEventAndUpdateCache(
	database: AppDb,
	event: CharacterStatEvent,
	cache: UpdateCharacterStatCacheInput
): { event: CharacterStatEvent; character: Character } {
	withTransaction(database, () => {
		insertCharacterStatEvent(database, event);
		updateCharacterStatCache(database, cache);
	});

	const character = loadCharacterById(database, cache.character_id);
	if (!character) {
		throw new Error('Character not found');
	}

	return { event, character };
}

export function insertCharacterStatEvents(database: AppDb, events: CharacterStatEvent[]): void {
	if (events.length === 0) return;

	withTransaction(database, () => {
		for (const event of events) {
			insertCharacterStatEvent(database, event);
		}
	});
}

export function insertEncounterResolution(database: AppDb, resolution: EncounterResolution): EncounterResolution {
	execSql(database, {
		sql: `INSERT INTO encounter_resolutions (
			resolution_id, event_id, total_xp, split_mode, resolved_by_user_id, resolved_at
		) VALUES (
			$resolution_id, $event_id, $total_xp, $split_mode, $resolved_by_user_id, $resolved_at
		)`,
		bind: {
			resolution_id: resolution.resolution_id,
			event_id: resolution.event_id,
			total_xp: resolution.total_xp,
			split_mode: resolution.split_mode,
			resolved_by_user_id: resolution.resolved_by_user_id,
			resolved_at: resolution.resolved_at
		}
	});

	return resolution;
}

export function getEncounterResolutionByEventId(
	database: AppDb,
	eventId: string
): EncounterResolution | null {
	const rows = selectObjects<{
		resolution_id: string;
		event_id: string;
		total_xp: number;
		split_mode: string;
		resolved_by_user_id: string;
		resolved_at: string;
	}>(
		database,
		`SELECT resolution_id, event_id, total_xp, split_mode, resolved_by_user_id, resolved_at
		 FROM encounter_resolutions
		 WHERE event_id = $eventId
		 LIMIT 1`,
		{ eventId }
	);

	const row = rows[0];
	if (!row) return null;

	return {
		resolution_id: row.resolution_id,
		event_id: row.event_id,
		total_xp: row.total_xp,
		split_mode: row.split_mode as EncounterResolution['split_mode'],
		resolved_by_user_id: row.resolved_by_user_id,
		resolved_at: row.resolved_at
	};
}

export function getEncounterResolutionEventIds(database: AppDb, eventIds: string[]): string[] {
	if (eventIds.length === 0) return [];

	const placeholders = eventIds.map((_, index) => `$id${index}`).join(', ');
	const bind = Object.fromEntries(eventIds.map((id, index) => [`id${index}`, id]));

	const rows = selectObjects<{ event_id: string }>(
		database,
		`SELECT event_id FROM encounter_resolutions WHERE event_id IN (${placeholders})`,
		bind
	);

	return rows.map((row) => row.event_id);
}

export function loadEncounterXpAwardsByEventIds(
	database: AppDb,
	eventIds: string[]
): EncounterXpAward[] {
	if (eventIds.length === 0) return [];

	const placeholders = eventIds.map((_, index) => `$id${index}`).join(', ');
	const bind = Object.fromEntries(eventIds.map((id, index) => [`id${index}`, id]));

	const rows = selectObjects<{
		event_id: string;
		character_id: string;
		amount: number;
		description: string | null;
		resolved_at: string;
	}>(
		database,
		`SELECT r.event_id, s.character_id, s.delta AS amount, s.description, r.resolved_at
		 FROM encounter_resolutions r
		 INNER JOIN character_stat_events s
		   ON s.batch_id = r.resolution_id
		  AND s.stat = 'experience'
		  AND s.source_type = 'encounter_xp'
		 WHERE r.event_id IN (${placeholders})
		 ORDER BY r.resolved_at ASC, s.character_id ASC`,
		bind
	);

	return rows.map((row) => ({
		event_id: row.event_id,
		character_id: row.character_id,
		amount: row.amount,
		description: row.description,
		resolved_at: row.resolved_at
	}));
}

function applyStatChangesBatch(
	database: AppDb,
	awards: { event: CharacterStatEvent; cache: UpdateCharacterStatCacheInput }[]
): void {
	for (const award of awards) {
		insertCharacterStatEvent(database, award.event);
		updateCharacterStatCache(database, award.cache);
	}
}

export function persistStatChangesBatch(
	database: AppDb,
	awards: { event: CharacterStatEvent; cache: UpdateCharacterStatCacheInput }[]
): Character[] {
	withTransaction(database, () => {
		applyStatChangesBatch(database, awards);
	});

	return awards.map((award) => loadCharacterById(database, award.cache.character_id)!);
}

export function persistEncounterXpBatch(
	database: AppDb,
	input: PersistEncounterXpBatchInput
): PersistEncounterXpBatchResult {
	withTransaction(database, () => {
		insertEncounterResolution(database, input.resolution);
		applyStatChangesBatch(database, input.awards);
	});

  const characters = input.awards.map(
    (award) => loadCharacterById(database, award.cache.character_id)!
  );

  return {
    resolution: input.resolution,
    events: input.awards.map((award) => award.event),
    characters
  };
}
