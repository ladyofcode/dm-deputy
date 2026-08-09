import type { PartStorySnapshot } from './types';

const INDEX_KEY = 'dm-deputy:part-story-cache-index';
const SNAPSHOT_PREFIX = 'dm-deputy:part-story-snapshot:';
const MAX_ENTRIES = 12;

function snapshotKey(partId: string): string {
	return `${SNAPSHOT_PREFIX}${partId}`;
}

function readIndex(): string[] {
	if (typeof sessionStorage === 'undefined') return [];

	try {
		const raw = sessionStorage.getItem(INDEX_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
	} catch {
		return [];
	}
}

function writeIndex(partIds: string[]): void {
	if (typeof sessionStorage === 'undefined') return;

	try {
		sessionStorage.setItem(INDEX_KEY, JSON.stringify(partIds));
	} catch {
		// sessionStorage may be full or unavailable
	}
}

function touchIndex(partId: string): void {
	const index = readIndex();
	const next = [partId, ...index.filter((id) => id !== partId)].slice(0, MAX_ENTRIES);

	for (const evicted of index) {
		if (!next.includes(evicted)) {
			sessionStorage.removeItem(snapshotKey(evicted));
		}
	}

	writeIndex(next);
}

export function isLoadedPartStorySnapshot(snapshot: PartStorySnapshot): boolean {
	return snapshot.nodes !== null || snapshot.items !== null || snapshot.partNpcs !== null;
}

export function readPartStorySessionCache(partId: string): PartStorySnapshot | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(snapshotKey(partId));
		if (!raw) return null;

		const parsed = JSON.parse(raw) as PartStorySnapshot;
		if (!parsed || typeof parsed !== 'object') return null;
		if (!isLoadedPartStorySnapshot(parsed)) return null;

		return parsed;
	} catch {
		return null;
	}
}

export function writePartStorySessionCache(partId: string, snapshot: PartStorySnapshot): void {
	if (typeof sessionStorage === 'undefined') return;
	if (!isLoadedPartStorySnapshot(snapshot)) return;

	try {
		sessionStorage.setItem(snapshotKey(partId), JSON.stringify(snapshot));
		touchIndex(partId);
	} catch {
		// sessionStorage may be full or unavailable
	}
}

export function clearPartStorySessionCache(partId: string): void {
	if (typeof sessionStorage === 'undefined') return;

	sessionStorage.removeItem(snapshotKey(partId));
	writeIndex(readIndex().filter((id) => id !== partId));
}

export function clearAllPartStorySessionCache(): void {
	if (typeof sessionStorage === 'undefined') return;

	for (const partId of readIndex()) {
		sessionStorage.removeItem(snapshotKey(partId));
	}

	sessionStorage.removeItem(INDEX_KEY);
}
