import type { StoryItem, StoryNode } from '$lib/types/schema';
import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story';
import type {
	CampaignSnapshot,
	CatalogSnapshot,
	InitResult,
	LocalStorageStoryMigration,
	PartStorySnapshot,
	WorkerRequest,
	WorkerResponse
} from './types';

type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

let worker: Worker | null = null;
let initPromise: Promise<InitResult> | null = null;
let requestId = 0;
const pending = new Map<number, PendingRequest>();

export function resetDatabaseWorker(): void {
	worker?.terminate();
	worker = null;
	initPromise = null;
}

export function isDatabaseClientInitialized(): boolean {
	return initPromise !== null;
}

function nodesStorageKey(partId: string): string {
	return `dm-deputy:part-story-nodes:${partId}`;
}

function layoutStorageKey(partId: string): string {
	return `dm-deputy:part-node-layout:${partId}`;
}

function itemLayoutStorageKey(partId: string): string {
	return `dm-deputy:part-item-layout:${partId}`;
}

function readJson<T>(raw: string | null): T | null {
	if (!raw) return null;

	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export function collectLocalStorageStoryMigration(partIds: string[]): LocalStorageStoryMigration[] {
	if (typeof localStorage === 'undefined') return [];

	return partIds.map((partId) => ({
		partId,
		nodes: readJson<StoryNode[]>(localStorage.getItem(nodesStorageKey(partId))),
		nodeLayout: readJson<PartNodeLayout>(localStorage.getItem(layoutStorageKey(partId))),
		itemLayout: readJson<PartItemLayout>(localStorage.getItem(itemLayoutStorageKey(partId)))
	}));
}

export function collectAllLocalStorageStoryMigration(): LocalStorageStoryMigration[] {
	if (typeof localStorage === 'undefined') return [];

	const partIds = new Set<string>();

	for (let index = 0; index < localStorage.length; index += 1) {
		const key = localStorage.key(index);
		if (!key) continue;

		for (const prefix of [
			'dm-deputy:part-story-nodes:',
			'dm-deputy:part-node-layout:',
			'dm-deputy:part-item-layout:'
		]) {
			if (key.startsWith(prefix)) {
				partIds.add(key.slice(prefix.length));
			}
		}
	}

	return collectLocalStorageStoryMigration([...partIds]).filter(
		(entry) => entry.nodes?.length || entry.nodeLayout || entry.itemLayout
	);
}

export function clearLocalStorageStoryMigration(partIds: string[]): void {
	if (typeof localStorage === 'undefined') return;

	for (const partId of partIds) {
		localStorage.removeItem(nodesStorageKey(partId));
		localStorage.removeItem(layoutStorageKey(partId));
		localStorage.removeItem(itemLayoutStorageKey(partId));
	}
}

function getWorker(): Worker {
	if (!worker) {
		initPromise = null;
		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const data = event.data;
			const request = pending.get(data.id);
			if (!request) return;

			pending.delete(data.id);

			if ('error' in data) {
				request.reject(new Error(data.error));
				return;
			}

			if (data.buffer) {
				request.resolve(data.buffer);
				return;
			}

			request.resolve(data.result);
		};
		worker.onerror = (event) => {
			for (const request of pending.values()) {
				request.reject(new Error(event.message || 'Database worker failed'));
			}
			pending.clear();
			resetDatabaseWorker();
		};
	}

	return worker;
}

function callWorker<T>(method: WorkerRequest['method'], args: unknown[] = []): Promise<T> {
	return new Promise((resolve, reject) => {
		const id = ++requestId;
		pending.set(id, {
			resolve: resolve as PendingRequest['resolve'],
			reject
		});
		getWorker().postMessage({ id, method, args } as WorkerRequest);
	});
}

function callWorkerWithTransfer<T>(
	method: WorkerRequest['method'],
	args: unknown[],
	transfer: Transferable[] = []
): Promise<T> {
	return new Promise((resolve, reject) => {
		const id = ++requestId;
		pending.set(id, {
			resolve: resolve as PendingRequest['resolve'],
			reject
		});
		getWorker().postMessage({ id, method, args } as WorkerRequest, transfer);
	});
}

function callWorkerWithBuffer(): Promise<ArrayBuffer> {
	return callWorker<ArrayBuffer>('exportDatabase');
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot> {
	return callWorker<CatalogSnapshot>('loadCatalogSnapshot');
}

export async function fetchAppDatabaseTemplate(): Promise<ArrayBuffer> {
	const response = await fetch('/dm-deputy.sqlite');
	if (!response.ok) {
		throw new Error(
			`App database template not found (${response.status}). Run pnpm run build:db first.`
		);
	}

	return response.arrayBuffer();
}

export async function initDatabaseClient(
	migrations: LocalStorageStoryMigration[],
	templateBuffer: ArrayBuffer
): Promise<InitResult> {
	if (!initPromise) {
		initPromise = callWorker<InitResult>('init', [migrations, templateBuffer]).catch((error) => {
			initPromise = null;
			throw error;
		});
	}

	return initPromise;
}

export async function loadCampaignSnapshot(): Promise<CampaignSnapshot> {
	return callWorker<CampaignSnapshot>('loadCampaignSnapshot');
}

export async function loadPartStory(partId: string): Promise<PartStorySnapshot> {
	return callWorker<PartStorySnapshot>('loadPartStory', [partId]);
}

export async function savePartStoryNodes(partId: string, nodes: StoryNode[]): Promise<void> {
	await callWorker('savePartStoryNodes', [partId, nodes]);
}

export async function savePartNodeLayout(partId: string, layout: PartNodeLayout): Promise<void> {
	await callWorker('savePartNodeLayout', [partId, layout]);
}

export async function savePartItemLayout(partId: string, layout: PartItemLayout): Promise<void> {
	await callWorker('savePartItemLayout', [partId, layout]);
}

export async function savePartStoryItems(partId: string, items: StoryItem[]): Promise<void> {
	await callWorker('savePartStoryItems', [partId, items]);
}

export async function createCampaignInDb(
	input: import('./types').CreateCampaignInput
): Promise<void> {
	await callWorker('createCampaign', [input]);
}

export async function createAdventureInDb(
	input: import('./types').CreateAdventureInput
): Promise<void> {
	await callWorker('createAdventure', [input]);
}

export async function syncAdventurePartsInDb(
	adventureId: string,
	parts: import('$lib/types/schema').Part[]
): Promise<void> {
	await callWorker('syncAdventureParts', [adventureId, parts]);
}

export async function activateStoryNodeInDb(partId: string, nodeId: string): Promise<string> {
	return callWorker<string>('activateStoryNode', [partId, nodeId]);
}

export async function toggleStoryNodeCompletedInDb(
	partId: string,
	nodeId: string
): Promise<string | null> {
	return callWorker<string | null>('toggleStoryNodeCompleted', [partId, nodeId]);
}

export async function updateAdventurePromoteInDb(
	adventureId: string,
	canPromote: boolean
): Promise<void> {
	await callWorker('updateAdventurePromote', [adventureId, canPromote]);
}

export async function softDeletePlayerInDb(userId: string): Promise<string> {
	return callWorker<string>('softDeletePlayer', [userId]);
}

export async function updateUserThemeInDb(
	userId: string,
	theme: import('$lib/types/schema').User['theme']
): Promise<void> {
	await callWorker('updateUserTheme', [userId, theme]);
}

export async function updateCampaignThemeInDb(
	campaignId: string,
	theme: import('$lib/types/schema').Campaign['theme']
): Promise<void> {
	await callWorker('updateCampaignTheme', [campaignId, theme]);
}

export async function updateCampaignDetailsInDb(
	input: import('./types').UpdateCampaignDetailsInput
): Promise<import('$lib/types/schema').Campaign> {
	return callWorker('updateCampaignDetails', [input]);
}

export async function touchCampaignInDb(userId: string, campaignId: string): Promise<void> {
	await callWorker('touchCampaign', [userId, campaignId]);
}

export async function exportDatabaseFile(): Promise<Blob> {
	const buffer = await callWorkerWithBuffer();
	return new Blob([buffer], { type: 'application/x-sqlite3' });
}

export async function importDatabaseFile(file: File | Blob): Promise<void> {
	const buffer = await file.arrayBuffer();
	await callWorker('importDatabase', [buffer]);
	initPromise = null;
}

export function downloadDatabaseBackup(blob: Blob, filename = 'dm-deputy-backup.sqlite'): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export async function createCampaignMapInDb(
	input: import('./types').CreateCampaignMapInput,
	thumbBuffer: ArrayBuffer,
	fullBuffer: ArrayBuffer
): Promise<import('$lib/types/schema').CampaignMap> {
	return callWorkerWithTransfer(
		'createCampaignMap',
		[input, thumbBuffer, fullBuffer],
		[thumbBuffer, fullBuffer]
	);
}

export async function deleteCampaignMapInDb(mapId: string): Promise<void> {
	await callWorker('deleteCampaignMap', [mapId]);
}

export async function loadCampaignMapBlobInDb(
	mapId: string,
	variant: 'thumb' | 'full'
): Promise<ArrayBuffer | null> {
	const buffer = await callWorker<ArrayBuffer | null>('loadCampaignMapBlob', [mapId, variant]);
	return buffer ?? null;
}

export async function createCampaignCharacterInDb(
	input: import('./types').CreateCampaignCharacterInput
): Promise<import('$lib/types/schema').Character> {
	return callWorker('createCampaignCharacter', [input]);
}

export async function updateCampaignCharacterInDb(
	input: import('./types').UpdateCampaignCharacterInput
): Promise<import('$lib/types/schema').Character> {
	return callWorker('updateCampaignCharacter', [input]);
}

export async function loadCharacterStatEventsInDb(
	characterId: string,
	stat: import('$lib/types/schema').StatKind | null = null
): Promise<import('$lib/types/schema').CharacterStatEvent[]> {
	return callWorker('loadCharacterStatEvents', [characterId, stat]);
}

export async function insertCharacterStatEventInDb(
	event: import('$lib/types/schema').CharacterStatEvent
): Promise<import('$lib/types/schema').CharacterStatEvent> {
	return callWorker('insertCharacterStatEvent', [event]);
}

export async function insertEncounterResolutionInDb(
	resolution: import('$lib/types/schema').EncounterResolution
): Promise<import('$lib/types/schema').EncounterResolution> {
	return callWorker('insertEncounterResolution', [resolution]);
}

export async function getEncounterResolutionByEventIdInDb(
	eventId: string
): Promise<import('$lib/types/schema').EncounterResolution | null> {
	return callWorker('getEncounterResolutionByEventId', [eventId]);
}

export async function getEncounterResolutionEventIdsInDb(
	eventIds: string[]
): Promise<string[]> {
	return callWorker('getEncounterResolutionEventIds', [eventIds]);
}

export async function loadEncounterXpAwardsByEventIdsInDb(
	eventIds: string[]
): Promise<import('$lib/types/schema').EncounterXpAward[]> {
	return callWorker('loadEncounterXpAwardsByEventIds', [eventIds]);
}

export async function updateCharacterStatCacheInDb(
	input: import('./types').UpdateCharacterStatCacheInput
): Promise<import('$lib/types/schema').Character> {
	return callWorker('updateCharacterStatCache', [input]);
}

export async function loadCharacterLoadoutInDb(
	characterId: string
): Promise<import('./types').CharacterLoadout> {
	return callWorker('loadCharacterLoadout', [characterId]);
}

export async function addCampaignPlayerInDb(
	input: import('./types').AddCampaignPlayerInput
): Promise<import('./types').AddCampaignPlayerResult> {
	return callWorker('addCampaignPlayer', [input]);
}

export async function removeCampaignPlayerInDb(
	campaignId: string,
	characterId: string
): Promise<void> {
	await callWorker('removeCampaignPlayer', [campaignId, characterId]);
}

export async function addCampaignPcToCampaignInDb(
	input: import('./types').AddCampaignPcToCampaignInput
): Promise<import('./types').AddCampaignPcToCampaignResult> {
	return callWorker('addCampaignPcToCampaign', [input]);
}

export async function removeCampaignNpcFromCampaignInDb(
	campaignId: string,
	characterId: string
): Promise<void> {
	await callWorker('removeCampaignNpcFromCampaign', [campaignId, characterId]);
}

export async function addCampaignNpcToCampaignInDb(
	input: import('./types').AddCampaignNpcToCampaignInput
): Promise<import('./types').AddCampaignNpcToCampaignResult> {
	return callWorker('addCampaignNpcToCampaign', [input]);
}

export async function promoteAdventureToCampaignInDb(
	input: import('./types').PromoteAdventureInput
): Promise<import('./types').PromoteAdventureResult> {
	return callWorker('promoteAdventureToCampaign', [input]);
}

export async function upsertSpellInDb(spell: import('$lib/types/schema').Spell): Promise<void> {
	await callWorker('upsertSpell', [spell]);
}

export async function deleteSpellInDb(spellId: string): Promise<void> {
	await callWorker('deleteSpell', [spellId]);
}

export async function upsertWeaponInDb(weapon: import('$lib/types/schema').Weapon): Promise<void> {
	await callWorker('upsertWeapon', [weapon]);
}

export async function deleteWeaponInDb(weaponId: string): Promise<void> {
	await callWorker('deleteWeapon', [weaponId]);
}

export async function upsertArmorInDb(armor: import('$lib/types/schema').Armor): Promise<void> {
	await callWorker('upsertArmor', [armor]);
}

export async function deleteArmorInDb(armorId: string): Promise<void> {
	await callWorker('deleteArmor', [armorId]);
}

export async function upsertItemInDb(item: import('$lib/types/schema').Item): Promise<void> {
	await callWorker('upsertItem', [item]);
}

export async function deleteItemInDb(itemId: string): Promise<void> {
	await callWorker('deleteItem', [itemId]);
}
