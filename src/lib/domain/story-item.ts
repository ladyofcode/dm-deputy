import type { Character, StoryItem, StoryItemCatalogType, StoryItemKind } from '$lib/types/schema';

export const NOTE_DEFAULT_WIDTH = 160;
export const NOTE_DEFAULT_HEIGHT = 72;
export const NOTE_MIN_WIDTH = 100;
export const NOTE_MIN_HEIGHT = 48;

export const MAP_CARD_WIDTH = 148;
export const MAP_CARD_HEIGHT = 112;

export type StoryArmLine = {
	id: string;
	kind: StoryItemKind;
	xp_amount: number;
	character_id: string;
	gold: number;
	silver: number;
	copper: number;
	is_treasure: boolean;
	is_reward: boolean;
	catalog_type: StoryItemCatalogType | '';
	catalog_id: string;
	note_text: string;
	note_width: number;
	note_height: number;
	map_id: string;
};

export function createEmptyArmLine(): StoryArmLine {
	return {
		id: crypto.randomUUID(),
		kind: 'xp',
		xp_amount: 0,
		character_id: '',
		gold: 0,
		silver: 0,
		copper: 0,
		is_treasure: false,
		is_reward: true,
		catalog_type: '',
		catalog_id: '',
		note_text: '',
		note_width: NOTE_DEFAULT_WIDTH,
		note_height: NOTE_DEFAULT_HEIGHT,
		map_id: ''
	};
}

export function storyItemToArmLine(item: StoryItem): StoryArmLine {
	return {
		id: item.item_id,
		kind: item.kind,
		xp_amount: item.xp_amount ?? 0,
		character_id: item.character_id ?? '',
		gold: item.gold ?? 0,
		silver: item.silver ?? 0,
		copper: item.copper ?? 0,
		is_treasure: item.is_treasure ?? false,
		is_reward: item.kind === 'xp' ? true : (item.is_reward ?? false),
		catalog_type: item.catalog_type ?? '',
		catalog_id: item.catalog_id ?? '',
		note_text: item.note_text ?? '',
		note_width: item.note_width ?? NOTE_DEFAULT_WIDTH,
		note_height: item.note_height ?? NOTE_DEFAULT_HEIGHT,
		map_id: item.map_id ?? ''
	};
}

export function normalizeStoryItemKind(kind: string): StoryItemKind {
	if (kind === 'npc' || kind === 'money' || kind === 'item' || kind === 'note' || kind === 'map') {
		return kind;
	}
	if (kind === 'xp') return 'xp';
	return 'item';
}

export function buildStoryItemLabel(
	item:
		| StoryArmLine
		| Pick<
				StoryItem,
				| 'kind'
				| 'xp_amount'
				| 'character_id'
				| 'gold'
				| 'silver'
				| 'copper'
				| 'catalog_type'
				| 'catalog_id'
				| 'is_treasure'
				| 'is_reward'
				| 'note_text'
		  >,
	npcsById: Map<string, Character>,
	catalogName: string | null
): string {
	switch (item.kind) {
		case 'xp':
			return `${Math.max(0, item.xp_amount ?? 0)} XP`;
		case 'npc': {
			const npc = item.character_id ? npcsById.get(item.character_id) : undefined;
			return npc?.display_name ?? 'NPC';
		}
		case 'money': {
			const parts = [
				item.gold ? `${item.gold} gp` : '',
				item.silver ? `${item.silver} sp` : '',
				item.copper ? `${item.copper} cp` : ''
			].filter(Boolean);
			return parts.length ? parts.join(' ') : '0 cp';
		}
		case 'item':
			return catalogName ?? 'Item';
		case 'note': {
			const text = item.note_text?.trim() ?? '';
			if (!text) return 'Note';
			const firstLine = text.split('\n')[0]?.trim() ?? 'Note';
			return firstLine.length > 48 ? `${firstLine.slice(0, 45)}…` : firstLine;
		}
		case 'map':
			return catalogName ?? 'Map';
		default:
			return 'Arm';
	}
}

export function armLineToStoryItem(
	line: StoryArmLine,
	parentNodeId: string,
	label: string
): StoryItem {
	const item: StoryItem = {
		item_id: line.id.startsWith('item-') ? line.id : `item-${line.id}`,
		parent_node_id: parentNodeId,
		kind: line.kind,
		label
	};

	if (line.kind === 'xp' || line.is_reward) {
		item.is_reward = true;
	}

	switch (line.kind) {
		case 'xp':
			item.xp_amount = line.xp_amount > 0 ? line.xp_amount : null;
			break;
		case 'npc':
			item.character_id = line.character_id || null;
			break;
		case 'money':
			item.gold = line.gold > 0 ? line.gold : null;
			item.silver = line.silver > 0 ? line.silver : null;
			item.copper = line.copper > 0 ? line.copper : null;
			item.is_treasure = line.is_treasure || null;
			break;
		case 'item':
			item.catalog_type = line.catalog_type || null;
			item.catalog_id = line.catalog_id || null;
			item.is_treasure = line.is_treasure || null;
			break;
		case 'note':
			item.note_text = line.note_text.trim() || null;
			item.note_width = Math.max(NOTE_MIN_WIDTH, line.note_width || NOTE_DEFAULT_WIDTH);
			item.note_height = Math.max(NOTE_MIN_HEIGHT, line.note_height || NOTE_DEFAULT_HEIGHT);
			break;
		case 'map':
			item.map_id = line.map_id || null;
			break;
	}

	return item;
}

export function normalizeStoryItem(item: StoryItem): StoryItem {
	const kind = normalizeStoryItemKind(item.kind);
	const normalized: StoryItem = {
		...item,
		kind,
		label: item.label.trim() || 'Arm'
	};

	if (kind === 'xp') {
		normalized.xp_amount =
			normalized.xp_amount != null && normalized.xp_amount > 0 ? normalized.xp_amount : null;
		normalized.is_reward = true;
	} else if (kind === 'npc') {
		normalized.character_id = normalized.character_id ?? null;
	} else if (kind === 'money') {
		normalized.gold = normalized.gold != null && normalized.gold > 0 ? normalized.gold : null;
		normalized.silver =
			normalized.silver != null && normalized.silver > 0 ? normalized.silver : null;
		normalized.copper =
			normalized.copper != null && normalized.copper > 0 ? normalized.copper : null;
		normalized.is_treasure = normalized.is_treasure ?? null;
	} else if (kind === 'item') {
		normalized.catalog_type = normalized.catalog_type ?? null;
		normalized.catalog_id = normalized.catalog_id ?? null;
		normalized.is_treasure = normalized.is_treasure ?? null;
	} else if (kind === 'note') {
		normalized.note_text = normalized.note_text?.trim() || null;
		normalized.note_width = Math.max(NOTE_MIN_WIDTH, normalized.note_width ?? NOTE_DEFAULT_WIDTH);
		normalized.note_height = Math.max(
			NOTE_MIN_HEIGHT,
			normalized.note_height ?? NOTE_DEFAULT_HEIGHT
		);
	} else if (kind === 'map') {
		normalized.map_id = normalized.map_id ?? null;
	}

	if (normalized.is_reward) {
		normalized.is_reward = true;
	} else {
		normalized.is_reward = null;
	}

	return normalized;
}

export function isArmLineBlank(line: StoryArmLine): boolean {
	switch (line.kind) {
		case 'xp':
			return line.xp_amount <= 0;
		case 'npc':
			return !line.character_id;
		case 'money':
			return line.gold <= 0 && line.silver <= 0 && line.copper <= 0;
		case 'item':
			return !line.catalog_type || !line.catalog_id;
		case 'note':
			return !line.note_text.trim();
		case 'map':
			return !line.map_id;
		default:
			return true;
	}
}

export function isArmLineValid(line: StoryArmLine): boolean {
	return !isArmLineBlank(line);
}

export function isPersistedStoryItem(item: StoryItem): boolean {
	return isArmLineValid(storyItemToArmLine(item));
}

export function storyItemSize(item: StoryItem): { width: number; height: number } {
	if (item.kind === 'map') {
		return { width: MAP_CARD_WIDTH, height: MAP_CARD_HEIGHT };
	}

	return {
		width: item.kind === 'item' && item.catalog_id ? 220 : 150,
		height: item.kind === 'item' && item.catalog_id ? 120 : 68
	};
}
