import { MONSTER_TEMPLATES, type MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

const STORAGE_KEY = 'dm-deputy:monster-templates';

export function cloneMonsterTemplate(template: MonsterTemplate): MonsterTemplate {
	return JSON.parse(JSON.stringify(template)) as MonsterTemplate;
}

export function loadStoredMonsterTemplates(): MonsterTemplate[] {
	if (typeof localStorage === 'undefined') {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}

	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}

	try {
		const stored = JSON.parse(raw) as MonsterTemplate[];
		const storedById = new Map(stored.map((template) => [template.id, template]));

		return MONSTER_TEMPLATES.map((defaultTemplate) => {
			const saved = storedById.get(defaultTemplate.id);
			return saved
				? { ...cloneMonsterTemplate(defaultTemplate), ...saved, id: defaultTemplate.id }
				: cloneMonsterTemplate(defaultTemplate);
		});
	} catch {
		return MONSTER_TEMPLATES.map(cloneMonsterTemplate);
	}
}

export function saveStoredMonsterTemplates(templates: MonsterTemplate[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getDefaultMonsterTemplate(id: string): MonsterTemplate | undefined {
	const template = MONSTER_TEMPLATES.find((entry) => entry.id === id);
	return template ? cloneMonsterTemplate(template) : undefined;
}
