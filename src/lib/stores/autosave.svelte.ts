import { preserveViewportAnchor } from '$lib/actions/preserve-viewport-anchor';
import { characterSheetPersistenceKey as buildCharacterSheetPersistenceKey } from '$lib/domain/character-sheet-persistence';
import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';

export const DEFAULT_AUTOSAVE_DELAY_MS = 750;

export type AutoSaveHandle = {
	get saving(): boolean;
	syncKey(): void;
	cancelPending(): void;
	flush(): Promise<void>;
};

export type AutoSaveOptions = {
	getKey: () => string;
	save: () => Promise<void>;
	isEnabled?: () => boolean;
	isBusy?: () => boolean;
	hasSavableChanges?: () => boolean;
	delayMs?: number;
	onError?: (cause: unknown) => void;
};

/** Debounced auto-save: tracks a serialized key and persists when it changes. */
export function setupAutoSave(options: AutoSaveOptions): AutoSaveHandle {
	let persistedKey = $state<string | null>(null);
	let saving = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const isEnabled = options.isEnabled ?? (() => true);
	const isBusy = options.isBusy ?? (() => false);
	const hasSavableChanges = options.hasSavableChanges ?? (() => true);

	function cancelPending() {
		clearTimeout(timer);
	}

	function syncKey() {
		persistedKey = options.getKey();
	}

	async function runSave() {
		saving = true;
		try {
			await options.save();
			syncKey();
		} catch (cause) {
			options.onError?.(cause);
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (!isEnabled()) {
			persistedKey = null;
			return;
		}

		if (isBusy() || saving) {
			return;
		}

		const key = options.getKey();

		if (persistedKey === null) {
			persistedKey = key;
			return;
		}

		if (key === persistedKey || !hasSavableChanges()) {
			return;
		}

		cancelPending();
		timer = setTimeout(() => {
			void runSave();
		}, options.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS);

		return cancelPending;
	});

	return {
		get saving() {
			return saving;
		},
		syncKey,
		cancelPending,
		flush: async () => {
			cancelPending();
			if (!isEnabled() || isBusy() || saving || !hasSavableChanges()) {
				return;
			}

			const key = options.getKey();
			if (persistedKey === key) {
				return;
			}

			await runSave();
		}
	};
}

export function jsonAutoSaveKey(value: unknown): string {
	return JSON.stringify(value);
}

export function fileFingerprint(file: File | null): string | null {
	if (!file) return null;
	return `${file.name}:${file.size}:${file.lastModified}`;
}

export type CharacterSheetAutoSaveOptions = {
	sheet: CharacterSheetStore;
	save: () => Promise<void>;
	isEnabled: () => boolean;
	delayMs?: number;
	extraKey?: () => string;
	onError?: (cause: unknown) => void;
};

function characterSheetAutoSaveKey(sheet: CharacterSheetStore, extraKey?: () => string): string {
	const base = buildCharacterSheetPersistenceKey(sheet.snapshotForPersistence());
	const extra = extraKey?.() ?? '';
	return extra ? `${base}|${extra}` : base;
}

/** Auto-save for in-place character sheet edits. */
export function setupCharacterSheetAutoSave(
	options: CharacterSheetAutoSaveOptions
): AutoSaveHandle {
	return setupAutoSave({
		isEnabled: options.isEnabled,
		isBusy: () => options.sheet.loading || options.sheet.saving,
		getKey: () => {
			void options.sheet.snapshotForPersistence();
			options.extraKey?.();
			return characterSheetAutoSaveKey(options.sheet, options.extraKey);
		},
		save: options.save,
		delayMs: options.delayMs,
		onError: options.onError
	});
}

export type DraftBatchAutoSaveOptions<T extends { id: string }> = {
	getLines: () => T[];
	setLines: (lines: T[]) => void;
	createEmptyLine: () => T;
	getSavableLines: (lines: T[]) => T[];
	serializeSavableLine: (line: T) => unknown;
	persist: (lines: T[]) => Promise<void>;
	isEnabled?: () => boolean;
	delayMs?: number;
	onError?: (cause: unknown) => void;
};

export type DraftBatchAutoSaveHandle<T extends { id: string }> = AutoSaveHandle & {
	commitLines(lines: T[]): Promise<void>;
};

/**
 * Auto-save for draft-line forms that create records and clear saved rows.
 * Typical for "add players/NPCs to campaign" lists.
 */
export function setupDraftBatchAutoSave<T extends { id: string }>(
	options: DraftBatchAutoSaveOptions<T>
): DraftBatchAutoSaveHandle<T> {
	const getSavable = () => options.getSavableLines(options.getLines());

	function removeSavedLines(savedIds: string[]) {
		const remaining = options.getLines().filter((line) => !savedIds.includes(line.id));

		if (remaining.length > 0) {
			options.setLines(remaining);
			return;
		}

		const empty = options.createEmptyLine();
		options.setLines([{ ...empty, id: savedIds[0] ?? empty.id }]);
	}

	async function persistAndClear(lines: T[]) {
		if (lines.length === 0) return;

		await preserveViewportAnchor(async () => {
			await options.persist(lines);
			removeSavedLines(lines.map((line) => line.id));
		});
	}

	async function saveSavable() {
		await persistAndClear(getSavable());
	}

	const autoSave = setupAutoSave({
		isEnabled: options.isEnabled,
		getKey: () => jsonAutoSaveKey(getSavable().map(options.serializeSavableLine)),
		hasSavableChanges: () => getSavable().length > 0,
		save: saveSavable,
		delayMs: options.delayMs,
		onError: options.onError
	});

	return {
		...autoSave,
		commitLines: async (lines: T[]) => {
			const toSave = lines.filter((line) => line.id);
			if (toSave.length === 0 || autoSave.saving) return;

			autoSave.cancelPending();

			try {
				await persistAndClear(toSave);
				autoSave.syncKey();
			} catch (cause) {
				options.onError?.(cause);
			}
		}
	};
}
