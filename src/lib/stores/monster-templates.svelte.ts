import {
	cloneMonsterTemplate,
	getDefaultMonsterTemplate,
	loadStoredMonsterTemplates,
	saveStoredMonsterTemplates
} from '$lib/domain/monster-template-storage';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

let templates = $state<MonsterTemplate[]>(loadStoredMonsterTemplates());
let revision = $state(0);

export function trackMonsterTemplatesRevision(): number {
	return revision;
}

export function getMonsterTemplates(): MonsterTemplate[] {
	trackMonsterTemplatesRevision();
	return templates;
}

export function getStoredMonsterTemplateById(id: string): MonsterTemplate | undefined {
	trackMonsterTemplatesRevision();
	return templates.find((template) => template.id === id);
}

export function replaceMonsterTemplate(template: MonsterTemplate): void {
	templates = templates.map((entry) =>
		entry.id === template.id ? cloneMonsterTemplate(template) : entry
	);
	saveStoredMonsterTemplates(templates);
	revision += 1;
}

export function resetMonsterTemplate(id: string): void {
	const defaultTemplate = getDefaultMonsterTemplate(id);
	if (!defaultTemplate) return;

	templates = templates.map((entry) => (entry.id === id ? defaultTemplate : entry));
	saveStoredMonsterTemplates(templates);
	revision += 1;
}
