import { MONSTER_TEMPLATES, type MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

const STORAGE_KEY = 'dm-deputy:monster-templates';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isMonsterTemplate(value: unknown): value is MonsterTemplate {
	return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function parseStoredMonsterTemplates(raw: string): MonsterTemplate[] | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed) || !parsed.every(isMonsterTemplate)) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

export function cloneMonsterTemplate(template: MonsterTemplate): MonsterTemplate {
	return structuredClone(template);
}

export function loadStoredMonsterTemplates(): MonsterTemplate[] {
	if (typeof localStorage === 'undefined') {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}

	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}

	const stored = parseStoredMonsterTemplates(raw);
	if (!stored) {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}

	const storedById = new Map(stored.map((template) => [template.id, template]));

	return MONSTER_TEMPLATES.map((defaultTemplate) => {
		const saved = storedById.get(defaultTemplate.id);
		return saved
			? { ...cloneMonsterTemplate(defaultTemplate), ...saved, id: defaultTemplate.id }
			: cloneMonsterTemplate(defaultTemplate);
	});
}

export function saveStoredMonsterTemplates(templates: MonsterTemplate[]): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getDefaultMonsterTemplate(id: string): MonsterTemplate | undefined {
	const template = MONSTER_TEMPLATES.find((entry) => entry.id === id);
	return template ? cloneMonsterTemplate(template) : undefined;
}
