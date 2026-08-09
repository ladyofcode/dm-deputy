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

export function createBlankMonsterTemplate(): MonsterTemplate {
	return {
		id: `custom-${crypto.randomUUID()}`,
		name: 'New template',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid',
		alignment: 'Unaligned',
		armor_class: 10,
		armor_class_notes: '',
		hp_max: 1,
		hp_dice: '1d4',
		speed: '30 ft.',
		abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
		skills: '',
		senses: 'passive Perception 10',
		languages: '',
		challenge_rating: '0',
		experience: 0,
		traits: '',
		actions: ''
	};
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
	const defaultIds = new Set(MONSTER_TEMPLATES.map((template) => template.id));

	const defaults = MONSTER_TEMPLATES.map((defaultTemplate) => {
		const saved = storedById.get(defaultTemplate.id);
		return saved
			? { ...cloneMonsterTemplate(defaultTemplate), ...saved, id: defaultTemplate.id }
			: cloneMonsterTemplate(defaultTemplate);
	});

	const customs = stored
		.filter((template) => !defaultIds.has(template.id))
		.map(cloneMonsterTemplate);

	return [...defaults, ...customs];
}

export function saveStoredMonsterTemplates(templates: MonsterTemplate[]): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getDefaultMonsterTemplate(id: string): MonsterTemplate | undefined {
	const template = MONSTER_TEMPLATES.find((entry) => entry.id === id);
	return template ? cloneMonsterTemplate(template) : undefined;
}
