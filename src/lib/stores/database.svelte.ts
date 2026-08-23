import {
	clearAllLocalAppStorage,
	clearLocalStorageStoryMigration,
	collectAllLocalStorageStoryMigration,
	downloadDatabaseBackup,
	exportDatabaseFile,
	fetchAppDatabaseTemplate,
	importDatabaseFile,
	initDatabaseClient,
	isDatabaseClientInitialized,
	loadCampaignSnapshot,
	loadCatalogSnapshot,
	resetDatabaseWorker
} from '$lib/db/client';
import { formatErrorMessage } from '$lib/domain/errors';
import { timeAsync, timeSync } from '$lib/debug/load-timing';
import {
	clearDatabaseCache,
	applyCampaignSnapshot,
	getCachedCampaigns,
	isDatabaseCacheReady,
	reloadDatabaseCache
} from '$lib/db/cache';
import { readCampaignSessionCache } from '$lib/db/campaign-session-cache';
import { clearCatalogCache, setCatalogSnapshot } from '$lib/db/catalog-cache';
import { bumpCatalogRevision } from '$lib/stores/catalog.svelte';
import {
	clearMonsterTemplatesCache,
	initMonsterTemplatesFromDatabase
} from '$lib/stores/monster-templates.svelte';
import { clearMediaLibraryCache } from '$lib/stores/media-library.svelte';
import { clearMediaLibraryObjectUrlCache } from '$lib/data/media-library-blob-cache';
import { clearCampaignMapObjectUrlCache } from '$lib/data/map-blob-cache';
import { clearCharacterPortraitObjectUrlCache } from '$lib/data/character-blob-cache';
import { clearCharacterPresentationObjectUrlCache } from '$lib/data/character-presentation-blob-cache';
import { LOCAL_USER_ID } from '$lib/constants/user';
import { getCampaignListForUser } from '$lib/data';
import { preferences } from '$lib/stores/preferences.svelte';
import { workspace } from '$lib/stores/workspace.svelte';

export type DbStatus = 'idle' | 'loading' | 'ready' | 'error';

class DatabaseController {
	status = $state<DbStatus>('idle');
	error = $state<string | null>(null);
	catalogError = $state<string | null>(null);

	get isReady(): boolean {
		return this.status === 'ready';
	}

	private bootstrapInFlight: Promise<void> | null = null;

	private ensureWorkspaceUserCanSeeCampaigns(): void {
		if (!isDatabaseCacheReady()) return;
		if (getCampaignListForUser(workspace.currentUserId).length > 0) return;
		if (getCachedCampaigns().length === 0) return;

		workspace.setCurrentUser(LOCAL_USER_ID);
	}

	private async ensureWorkerInitialized(): Promise<void> {
		if (isDatabaseClientInitialized()) return;

		const migrations = collectAllLocalStorageStoryMigration();

		await timeAsync('db: total worker init', () => initDatabaseClient(migrations));

		if (migrations.length > 0) {
			clearLocalStorageStoryMigration(migrations.map((entry) => entry.partId));
		}
	}

	private async populateCache(): Promise<void> {
		await timeAsync('db: load campaign snapshot', () => reloadDatabaseCache(loadCampaignSnapshot));
		await timeAsync('db: load monster templates', () => initMonsterTemplatesFromDatabase());
		this.ensureWorkspaceUserCanSeeCampaigns();
	}

	private loadCatalogInBackground(): void {
		this.catalogError = null;

		void loadCatalogSnapshot()
			.then((snapshot) => {
				setCatalogSnapshot(snapshot);
				bumpCatalogRevision();
			})
			.catch((cause) => {
				this.catalogError = formatErrorMessage(cause, String(cause));
			});
	}

	private async bootstrap(forceReload = false): Promise<void> {
		if (this.bootstrapInFlight) {
			return this.bootstrapInFlight;
		}

		const run = this.runBootstrap(forceReload);
		this.bootstrapInFlight = run;

		try {
			await run;
		} finally {
			if (this.bootstrapInFlight === run) {
				this.bootstrapInFlight = null;
			}
		}
	}

	private async syncFromWorker(): Promise<void> {
		try {
			await this.ensureWorkerInitialized();
			await this.populateCache();

			if (!isDatabaseCacheReady()) {
				throw new Error('Database cache did not initialize');
			}

			this.loadCatalogInBackground();
		} catch (error) {
			this.error = formatErrorMessage(error, String(error));
		}
	}

	private async runBootstrap(forceReload: boolean): Promise<void> {
		if (!forceReload && this.status === 'ready' && isDatabaseCacheReady()) {
			return;
		}

		if (!forceReload) {
			const cachedSnapshot = timeSync('db: read campaign session cache', readCampaignSessionCache);
			if (cachedSnapshot) {
				timeSync('db: apply cached campaign snapshot', () => applyCampaignSnapshot(cachedSnapshot));
				this.ensureWorkspaceUserCanSeeCampaigns();
				this.status = 'ready';
				this.error = null;
				void this.syncFromWorker();
				return;
			}
		}

		this.status = 'loading';
		this.error = null;

		try {
			if (forceReload) {
				clearDatabaseCache();
				clearCatalogCache();
				clearCampaignMapObjectUrlCache();
				clearCharacterPortraitObjectUrlCache();
				clearCharacterPresentationObjectUrlCache();
				clearMonsterTemplatesCache();
				clearMediaLibraryCache();
				clearMediaLibraryObjectUrlCache();
			}

			await this.ensureWorkerInitialized();
			await this.populateCache();

			if (!isDatabaseCacheReady()) {
				throw new Error('Database cache did not initialize');
			}

			this.status = 'ready';
			this.loadCatalogInBackground();
		} catch (error) {
			if (forceReload) {
				resetDatabaseWorker();
				this.status = 'idle';
				this.error = null;

				try {
					await this.ensureWorkerInitialized();
					await this.populateCache();

					if (!isDatabaseCacheReady()) {
						throw new Error('Database cache did not initialize', { cause: error });
					}

					this.status = 'ready';
					this.loadCatalogInBackground();
				} catch (retryError) {
					this.status = 'error';
					this.error = formatErrorMessage(retryError, String(retryError));
				}

				return;
			}

			this.status = 'error';
			this.error = formatErrorMessage(error, String(error));
		}
	}

	async init(): Promise<void> {
		if (typeof window === 'undefined') return;
		if (this.status === 'ready' && isDatabaseCacheReady()) return;

		return this.bootstrap(false);
	}

	async reload(): Promise<void> {
		return this.bootstrap(true);
	}

	async exportBackup(): Promise<void> {
		const blob = await exportDatabaseFile();
		const stamp = new Date().toISOString().slice(0, 10);
		downloadDatabaseBackup(blob, `dm-deputy-backup-${stamp}.sqlite`);
	}

	async importBackup(file: File): Promise<void> {
		await importDatabaseFile(file);
		await this.reload();
	}

	async wipeLocalBackup(): Promise<void> {
		const templateBuffer = await fetchAppDatabaseTemplate();
		await importDatabaseFile(new Blob([templateBuffer], { type: 'application/x-sqlite3' }));
		clearAllLocalAppStorage();
		preferences.userThemes = {};
		preferences.campaignThemes = {};
		workspace.setCurrentUser(LOCAL_USER_ID);
		await this.reload();
	}

	resetForDevHotReload(): void {
		resetDatabaseWorker();
		clearDatabaseCache();
		clearCatalogCache();
		clearCampaignMapObjectUrlCache();
		clearCharacterPortraitObjectUrlCache();
		clearCharacterPresentationObjectUrlCache();
		clearMonsterTemplatesCache();
		clearMediaLibraryCache();
		clearMediaLibraryObjectUrlCache();
		this.bootstrapInFlight = null;
		this.status = 'idle';
		this.error = null;
		this.catalogError = null;
		void this.init();
	}
}

export const database = new DatabaseController();

if (import.meta.hot) {
	import.meta.hot.on('vite:beforeUpdate', (payload) => {
		const touchedPath = payload.updates.some((update) =>
			update.path.includes('/src/lib/stores/database.svelte')
		);

		if (touchedPath) {
			database.resetForDevHotReload();
		}
	});
}
