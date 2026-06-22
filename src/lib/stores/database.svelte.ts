import { derived, get, writable } from 'svelte/store';
import {
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
	loadPartStory,
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
import { LOCAL_USER_ID } from '$lib/constants/user';
import { getCampaignListForUser } from '$lib/data';
import { workspace } from '$lib/stores/workspace.svelte';

export type DbStatus = 'idle' | 'loading' | 'ready' | 'error';

export const dbStatus = writable<DbStatus>('idle');
export const dbError = writable<string | null>(null);
export const dbIsReady = derived(dbStatus, ($status) => $status === 'ready');

class DatabaseController {
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
		await reloadDatabaseCache(loadCampaignSnapshot, loadPartStory);
		this.ensureWorkspaceUserCanSeeCampaigns();
	}

	private loadCatalogInBackground(): void {
		void loadCatalogSnapshot()
			.then((snapshot) => {
				setCatalogSnapshot(snapshot);
				bumpCatalogRevision();
			})
			.catch(() => {});
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
		if (!forceReload && get(dbStatus) === 'ready' && isDatabaseCacheReady()) {
			return;
		}

		dbStatus.set('loading');
		dbError.set(null);

		try {
			if (forceReload) {
				clearDatabaseCache();
				clearCatalogCache();
				clearCampaignMapObjectUrlCache();
			}

			await this.ensureWorkerInitialized();
			await this.populateCache();

			if (!isDatabaseCacheReady()) {
				throw new Error('Database cache did not initialize');
			}

			dbStatus.set('ready');
			this.loadCatalogInBackground();
		} catch (error) {
			if (forceReload) {
				resetDatabaseWorker();
				dbStatus.set('idle');
				dbError.set(null);

				try {
					await this.ensureWorkerInitialized();
					await this.populateCache();

					if (!isDatabaseCacheReady()) {
						throw new Error('Database cache did not initialize', { cause: error });
					}

					dbStatus.set('ready');
					this.loadCatalogInBackground();
				} catch (retryError) {
					dbStatus.set('error');
					dbError.set(retryError instanceof Error ? retryError.message : String(retryError));
				}

				return;
			}

			dbStatus.set('error');
			dbError.set(error instanceof Error ? error.message : String(error));
		}
	}

	async init(): Promise<void> {
		if (typeof window === 'undefined') return;
		if (get(dbStatus) === 'ready' && isDatabaseCacheReady()) return;

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

	resetForDevHotReload(): void {
		resetDatabaseWorker();
		clearDatabaseCache();
		clearCatalogCache();
		clearCampaignMapObjectUrlCache();
		this.bootstrapInFlight = null;
		dbStatus.set('idle');
		dbError.set(null);
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
