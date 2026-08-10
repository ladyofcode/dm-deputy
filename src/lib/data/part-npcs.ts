import {
	getCachedPartStory,
	isDatabaseCacheReady,
	mergePartNpcIntoCache,
	removePartNpcFromCache
} from '$lib/db/cache';
import { addPartNpcInDb, removePartNpcInDb } from '$lib/db/client';
import { getCharacterById } from '$lib/data';
import type { Character, PartNpc, StoryItem } from '$lib/types/schema';

function assertStoryReady(): void {
	if (!isDatabaseCacheReady()) {
		throw new Error('Database is not ready yet');
	}
}

export function getInitialPartNpcs(partId: string): PartNpc[] {
	const saved = getCachedPartStory(partId)?.partNpcs;
	return saved ?? [];
}

export function collectPartNpcCharacterIds(storyItems: StoryItem[], partNpcs: PartNpc[]): string[] {
	const ids = new Set<string>();

	for (const item of storyItems) {
		if (item.kind === 'npc' && item.character_id) {
			ids.add(item.character_id);
		}
	}

	for (const partNpc of partNpcs) {
		ids.add(partNpc.character_id);
	}

	return [...ids];
}

export function getPartNpcCharacterIdSet(storyItems: StoryItem[], partNpcs: PartNpc[]): Set<string> {
	return new Set(collectPartNpcCharacterIds(storyItems, partNpcs));
}

export function getExcludedCharacterIdsForPartNpcSelection(
	storyItems: StoryItem[],
	partNpcs: PartNpc[],
	draftCharacterIds: string[],
	currentLineCharacterId = ''
): Set<string> {
	const excluded = getPartNpcCharacterIdSet(storyItems, partNpcs);

	for (const characterId of draftCharacterIds) {
		if (characterId && characterId !== currentLineCharacterId) {
			excluded.add(characterId);
		}
	}

	return excluded;
}

export function filterSelectablePartNpcs(
	npcs: Character[],
	excludedCharacterIds: Set<string>,
	currentCharacterId = ''
): Character[] {
	return npcs.filter(
		(npc) => npc.character_id === currentCharacterId || !excludedCharacterIds.has(npc.character_id)
	);
}

export function getPartViewerNpcs(storyItems: StoryItem[], partNpcs: PartNpc[]): Character[] {
	const characterIds = collectPartNpcCharacterIds(storyItems, partNpcs);

	return characterIds
		.map((characterId) => getCharacterById(characterId))
		.filter((character): character is Character => character != null)
		.sort((left, right) => left.display_name.localeCompare(right.display_name));
}

export function isUnassignedPartNpc(partNpcs: PartNpc[], characterId: string): boolean {
	return partNpcs.some((entry) => entry.character_id === characterId);
}

export function getNpcFirstName(displayName: string): string {
	const trimmed = displayName.trim();
	if (!trimmed) return 'Unknown';

	const spaceIndex = trimmed.indexOf(' ');
	return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
}

export function formatNpcCardSubtitle(character: Character): string | null {
	const className = character.class_name?.trim() ?? '';
	const race = character.race?.trim() ?? '';

	if (className && race) {
		return `${className} \u2022 ${race}`;
	}

	if (race) return race;
	if (className) return className;
	return null;
}

export async function addPartNpc(partId: string, characterId: string): Promise<PartNpc> {
	assertStoryReady();

	const now = new Date().toISOString();
	const result = await addPartNpcInDb({
		part_id: partId,
		character_id: characterId,
		part_npc_id: `pnpc-${crypto.randomUUID()}`,
		date_added: now
	});

	mergePartNpcIntoCache(result.partNpc);
	return result.partNpc;
}

export async function removePartNpc(partId: string, characterId: string): Promise<void> {
	assertStoryReady();
	await removePartNpcInDb(partId, characterId);
	removePartNpcFromCache(partId, characterId);
}
