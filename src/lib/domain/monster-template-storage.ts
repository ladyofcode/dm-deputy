import { MONSTER_TEMPLATES, type MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

export const MONSTER_TEMPLATES_STORAGE_KEY = 'dm-deputy:monster-templates';

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

export function getDefaultMonsterTemplate(id: string): MonsterTemplate | undefined {
	const template = MONSTER_TEMPLATES.find((entry) => entry.id === id);
	return template ? cloneMonsterTemplate(template) : undefined;
}

function isMonsterTemplate(value: unknown): value is MonsterTemplate {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as MonsterTemplate).id === 'string' &&
		typeof (value as MonsterTemplate).name === 'string'
	);
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

/** One-time migration helper: read templates saved before SQLite storage existed. */
export function collectLocalStorageMonsterTemplateMigration(): MonsterTemplate[] {
	if (typeof localStorage === 'undefined') return [];

	const raw = localStorage.getItem(MONSTER_TEMPLATES_STORAGE_KEY);
	if (!raw) return [];

	return parseStoredMonsterTemplates(raw) ?? [];
}

export function clearLocalStorageMonsterTemplates(): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.removeItem(MONSTER_TEMPLATES_STORAGE_KEY);
}

export function mergeStoredMonsterTemplates(stored: MonsterTemplate[]): MonsterTemplate[] {
	const storedById = new Map(stored.map((template) => [template.id, template]));
	const defaultIds = new Set(MONSTER_TEMPLATES.map((template) => template.id));

	const defaults = MONSTER_TEMPLATES.map((defaultTemplate) => {
		const saved = storedById.get(defaultTemplate.id);
		if (!saved) {
			return cloneMonsterTemplate(defaultTemplate);
		}

		const merged = { ...cloneMonsterTemplate(defaultTemplate), ...saved, id: defaultTemplate.id };

		if (!saved.media_id && !saved.image_url?.trim()) {
			merged.image_url = defaultTemplate.image_url;
		}

		if (!saved.image_source?.trim()) {
			merged.image_source = defaultTemplate.image_source;
		}

		return merged;
	});

	const customs = stored
		.filter((template) => !defaultIds.has(template.id))
		.map(cloneMonsterTemplate);

	return [...defaults, ...customs];
}
