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
import {
	clearDatabaseCache,
	getCachedCampaigns,
	isDatabaseCacheReady,
	reloadDatabaseCache
} from '$lib/db/cache';
import { clearCatalogCache, setCatalogSnapshot } from '$lib/db/catalog-cache';
import { bumpCatalogRevision } from '$lib/stores/catalog.svelte';
import { clearCampaignMapObjectUrlCache } from '$lib/data/map-blob-cache';
import { clearCharacterPortraitObjectUrlCache } from '$lib/data/character-blob-cache';
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
		const templateBuffer = await fetchAppDatabaseTemplate();
		await initDatabaseClient(migrations, templateBuffer);

		if (migrations.length > 0) {
			clearLocalStorageStoryMigration(migrations.map((entry) => entry.partId));
		}
	}

	private async populateCache(): Promise<void> {
		await reloadDatabaseCache(loadCampaignSnapshot);
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
				this.catalogError = cause instanceof Error ? cause.message : String(cause);
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

	private async runBootstrap(forceReload: boolean): Promise<void> {
		if (!forceReload && this.status === 'ready' && isDatabaseCacheReady()) {
			return;
		}

		this.status = 'loading';
		this.error = null;

		try {
			if (forceReload) {
				clearDatabaseCache();
				clearCatalogCache();
				clearCampaignMapObjectUrlCache();
				clearCharacterPortraitObjectUrlCache();
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
					this.error = retryError instanceof Error ? retryError.message : String(retryError);
				}

				return;
			}

			this.status = 'error';
			this.error = error instanceof Error ? error.message : String(error);
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
