import {
	cloneMonsterTemplate,
	getDefaultMonsterTemplate,
	loadStoredMonsterTemplates,
	saveStoredMonsterTemplates
} from '$lib/domain/monster-template-storage';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

let templates = $state.raw<MonsterTemplate[] | null>(null);
let revision = $state(0);

function ensureTemplatesLoaded(): MonsterTemplate[] {
	if (templates === null) {
		templates = loadStoredMonsterTemplates();
	}

	return templates;
}

export function trackMonsterTemplatesRevision(): number {
	return revision;
}

export function getMonsterTemplates(): MonsterTemplate[] {
	trackMonsterTemplatesRevision();
	return ensureTemplatesLoaded();
}

export function getStoredMonsterTemplateById(id: string): MonsterTemplate | undefined {
	trackMonsterTemplatesRevision();
	return ensureTemplatesLoaded().find((template) => template.id === id);
}

export function replaceMonsterTemplate(template: MonsterTemplate): void {
	const loaded = ensureTemplatesLoaded();
	templates = loaded.map((entry) =>
		entry.id === template.id ? cloneMonsterTemplate(template) : entry
	);
	saveStoredMonsterTemplates(templates);
	revision += 1;
}

export function resetMonsterTemplate(id: string): void {
	const defaultTemplate = getDefaultMonsterTemplate(id);
	if (!defaultTemplate) return;

	const loaded = ensureTemplatesLoaded();
	templates = loaded.map((entry) => (entry.id === id ? defaultTemplate : entry));
	saveStoredMonsterTemplates(templates);
	revision += 1;
}
