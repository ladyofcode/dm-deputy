import {
	cloneMonsterTemplate,
	getDefaultMonsterTemplate,
	loadStoredMonsterTemplates,
	saveStoredMonsterTemplates
} from '$lib/domain/monster-template-storage';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
import { createRevisionSignal } from '$lib/stores/revision.svelte';

const revision = createRevisionSignal();

let templates = loadStoredMonsterTemplates();

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

export function replaceMonsterTemplate(template: MonsterTemplate): void {
	const index = templates.findIndex((entry) => entry.id === template.id);
	if (index === -1) {
		templates = [...templates, cloneMonsterTemplate(template)];
	} else {
		templates = templates.map((entry) =>
			entry.id === template.id ? cloneMonsterTemplate(template) : entry
		);
	}
	saveStoredMonsterTemplates(templates);
	revision.bump();
}

export function resetMonsterTemplate(id: string): void {
	const defaultTemplate = getDefaultMonsterTemplate(id);
	if (!defaultTemplate) return;

	templates = templates.map((entry) => (entry.id === id ? defaultTemplate : entry));
	saveStoredMonsterTemplates(templates);
	revision.bump();
}
