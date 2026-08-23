import {
	clearLocalStorageMonsterTemplates,
	collectLocalStorageMonsterTemplateMigration,
	cloneMonsterTemplate,
	getDefaultMonsterTemplate,
	mergeStoredMonsterTemplates
} from '$lib/domain/monster-template-storage';
import {
	deleteMonsterTemplateInDb,
	loadMonsterTemplatesFromDb,
	migrateMonsterTemplatesInDb,
	upsertMonsterTemplateInDb
} from '$lib/db/client';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

let templates = mergeStoredMonsterTemplates([]);

export function trackMonsterTemplatesRevision(): number {
	return revision.track();
}

export function getMonsterTemplates(): MonsterTemplate[] {
	revision.track();
	return templates;
}

export function getStoredMonsterTemplateById(id: string): MonsterTemplate | undefined {
	revision.track();
	return templates.find((template) => template.id === id);
}

export function clearMonsterTemplatesCache(): void {
	templates = mergeStoredMonsterTemplates([]);
	revision.bump();
}

export async function initMonsterTemplatesFromDatabase(): Promise<void> {
	const migration = collectLocalStorageMonsterTemplateMigration();
	if (migration.length > 0) {
		await migrateMonsterTemplatesInDb(migration);
		clearLocalStorageMonsterTemplates();
	}

	templates = await loadMonsterTemplatesFromDb();
	revision.bump();
}

export async function replaceMonsterTemplate(template: MonsterTemplate): Promise<void> {
	const existing = templates.find((entry) => entry.id === template.id);
	const merged: MonsterTemplate = {
		...template,
		image_url: template.image_url?.trim() || existing?.image_url,
		image_source: template.image_source?.trim() || existing?.image_source
	};

	const index = templates.findIndex((entry) => entry.id === merged.id);
	if (index === -1) {
		templates = [...templates, cloneMonsterTemplate(merged)];
	} else {
		templates = templates.map((entry) =>
			entry.id === merged.id ? cloneMonsterTemplate(merged) : entry
		);
	}

	await upsertMonsterTemplateInDb(merged);
	revision.bump();
}

export async function resetMonsterTemplate(id: string): Promise<void> {
	const defaultTemplate = getDefaultMonsterTemplate(id);
	if (!defaultTemplate) return;

	templates = templates.map((entry) => (entry.id === id ? defaultTemplate : entry));
	await deleteMonsterTemplateInDb(id);
	revision.bump();
}
