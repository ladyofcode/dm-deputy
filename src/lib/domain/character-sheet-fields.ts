import type { CharacterIdentityDraft, CharacterExtrasDraft } from '$lib/domain/npc-draft';
import type { CharacterPhysicalDraft, CharacterRoleplayDraft } from '$lib/domain/pc-sheet';
import type { StatKind } from '$lib/types/schema';
import { CHARACTER_KIND_LABELS, type NpcCharacterKind } from '$lib/types/schema';

type PhysicalKey = keyof CharacterPhysicalDraft;
type RoleplayStoryKey = Exclude<keyof CharacterRoleplayDraft, 'background'>;

export type PhysicalFieldConfig = {
	id: string;
	label: string;
	key: PhysicalKey;
	placeholder?: string;
};

export type StoryFieldConfig = {
	id: string;
	label: string;
	key: RoleplayStoryKey | 'description';
	rows: number;
	placeholder?: string;
};

export type CombatScalarFieldConfig = {
	path:
		| 'combat.armor_class'
		| 'combat.armor_class_notes'
		| 'combat.speed'
		| 'combat.hp_dice'
		| 'combat.challenge_rating';
	label: string;
	idPrefix: string;
	type?: 'number' | 'text';
	min?: number;
	step?: number;
	placeholder?: string;
	layout?: 'inline';
	modes?: Array<'pc' | 'npc'>;
};

export type CombatTextareaFieldConfig = {
	path: 'combat.skills' | 'combat.senses' | 'combat.languages' | 'combat.traits' | 'combat.actions';
	label: string;
	idPrefix: string;
	rows: number;
	placeholder?: string;
	modes?: Array<'pc' | 'npc'>;
};

export type StatHistoryFieldConfig = {
	stat: StatKind;
	label: string;
	idPrefix: string;
	getValue: (extras: CharacterExtrasDraft) => number;
};

export type IdentityDisplayField = {
	key: string;
	label: string;
	show: (ctx: IdentityDisplayContext) => boolean;
	render: (ctx: IdentityDisplayContext) => string | number | null;
	wide?: boolean;
};

export type IdentityDisplayContext = {
	mode: 'npc' | 'pc';
	kind: NpcCharacterKind;
	name: string;
	playerName: string;
	description: string;
	identity: CharacterIdentityDraft;
	extras: CharacterExtrasDraft;
	sizeTypeLabel: string;
	descriptionBeforeNotes: boolean;
	readonlyPresentation: string;
	readonlyNotes: string;
};

export const PHYSICAL_FIELD_CONFIG: PhysicalFieldConfig[] = [
	{ id: 'pc_sheet_height', label: 'Height', key: 'height', placeholder: '5 ft. 8 in.' },
	{ id: 'pc_sheet_weight', label: 'Weight', key: 'weight', placeholder: '145 lb.' },
	{ id: 'pc_sheet_eyes', label: 'Eyes', key: 'eyes' },
	{ id: 'pc_sheet_skin', label: 'Skin', key: 'skin' },
	{ id: 'pc_sheet_hair', label: 'Hair', key: 'hair' }
];

export const STORY_FIELD_CONFIG: StoryFieldConfig[] = [
	{ id: 'pc_sheet_personality', label: 'Personality traits', key: 'personality_traits', rows: 3 },
	{ id: 'pc_sheet_ideals', label: 'Ideals', key: 'ideals', rows: 3 },
	{ id: 'pc_sheet_bonds', label: 'Bonds', key: 'bonds', rows: 3 },
	{ id: 'pc_sheet_flaws', label: 'Flaws', key: 'flaws', rows: 3 },
	{ id: 'pc_sheet_backstory', label: 'Backstory', key: 'backstory', rows: 5 },
	{ id: 'pc_sheet_allies', label: 'Allies & organizations', key: 'allies', rows: 4 },
	{
		id: 'pc_sheet_features',
		label: 'Features & traits',
		key: 'features',
		rows: 5,
		placeholder: 'Racial traits, class features, feats…'
	},
	{
		id: 'pc_sheet_proficiencies',
		label: 'Proficiencies & languages',
		key: 'proficiencies',
		rows: 3,
		placeholder: 'Armor, weapons, tools, languages…'
	},
	{
		id: 'pc_sheet_treasure',
		label: 'Treasure & currency',
		key: 'treasure',
		rows: 3,
		placeholder: '125 gp, ruby pendant, deed to a windmill…'
	},
	{
		id: 'pc_sheet_notes',
		label: 'DM / session notes',
		key: 'description',
		rows: 4,
		placeholder: 'Private notes, reminders, ongoing plot hooks…'
	}
];

export const COMBAT_SCALAR_FIELDS: CombatScalarFieldConfig[] = [
	{
		path: 'combat.armor_class',
		label: 'Armor class',
		idPrefix: 'sheet_ac',
		type: 'number',
		min: 0,
		step: 1,
		layout: 'inline'
	},
	{
		path: 'combat.armor_class_notes',
		label: 'AC notes',
		idPrefix: 'sheet_ac_notes',
		layout: 'inline',
		placeholder: 'chain mail, shield'
	},
	{
		path: 'combat.speed',
		label: 'Speed',
		idPrefix: 'sheet_speed',
		layout: 'inline',
		placeholder: '30 ft.'
	},
	{
		path: 'combat.hp_dice',
		label: 'Hit dice',
		idPrefix: 'sheet_hp_dice',
		layout: 'inline',
		placeholder: '1d10',
		modes: ['npc']
	},
	{
		path: 'combat.challenge_rating',
		label: 'Challenge rating',
		idPrefix: 'sheet_cr',
		layout: 'inline',
		placeholder: '1',
		modes: ['npc']
	}
];

export const COMBAT_TEXTAREA_FIELDS: CombatTextareaFieldConfig[] = [
	{
		path: 'combat.skills',
		label: 'Skills',
		idPrefix: 'sheet_skills',
		rows: 3,
		placeholder: 'Perception +3, Stealth +5'
	},
	{
		path: 'combat.senses',
		label: 'Senses',
		idPrefix: 'sheet_senses',
		rows: 3,
		placeholder: 'darkvision 60 ft., passive Perception 13'
	},
	{
		path: 'combat.languages',
		label: 'Languages',
		idPrefix: 'sheet_languages',
		rows: 3,
		placeholder: 'Common, Goblin',
		modes: ['npc']
	},
	{
		path: 'combat.traits',
		label: 'Traits',
		idPrefix: 'sheet_traits',
		rows: 4,
		placeholder: 'Passive abilities and special traits',
		modes: ['npc']
	},
	{
		path: 'combat.actions',
		label: 'Actions',
		idPrefix: 'sheet_actions',
		rows: 4,
		placeholder: 'Attacks and other actions',
		modes: ['npc']
	}
];

export const STAT_HISTORY_FIELDS: StatHistoryFieldConfig[] = [
	{
		stat: 'experience',
		label: 'XP',
		idPrefix: 'sheet_xp',
		getValue: (extras) => extras.experience
	},
	{
		stat: 'hp_max',
		label: 'HP max',
		idPrefix: 'sheet_hp_max',
		getValue: (extras) => extras.hp_max
	},
	{
		stat: 'hp_current',
		label: 'HP current',
		idPrefix: 'sheet_hp_current',
		getValue: (extras) => extras.hp_current
	}
];

export function combatScalarFieldsForMode(mode: 'pc' | 'npc'): CombatScalarFieldConfig[] {
	return COMBAT_SCALAR_FIELDS.filter((field) => !field.modes || field.modes.includes(mode));
}

export function combatTextareaFieldsForMode(mode: 'pc' | 'npc'): CombatTextareaFieldConfig[] {
	return COMBAT_TEXTAREA_FIELDS.filter((field) => !field.modes || field.modes.includes(mode));
}

export function getCombatFieldValue(
	extras: CharacterExtrasDraft,
	path: CombatScalarFieldConfig['path'] | CombatTextareaFieldConfig['path']
): string | number {
	switch (path) {
		case 'combat.armor_class':
			return extras.combat.armor_class;
		case 'combat.armor_class_notes':
			return extras.combat.armor_class_notes;
		case 'combat.speed':
			return extras.combat.speed;
		case 'combat.hp_dice':
			return extras.combat.hp_dice;
		case 'combat.challenge_rating':
			return extras.combat.challenge_rating;
		case 'combat.skills':
			return extras.combat.skills;
		case 'combat.senses':
			return extras.combat.senses;
		case 'combat.languages':
			return extras.combat.languages;
		case 'combat.traits':
			return extras.combat.traits;
		case 'combat.actions':
			return extras.combat.actions;
	}
}

export function setCombatFieldValue(
	extras: CharacterExtrasDraft,
	path: CombatScalarFieldConfig['path'] | CombatTextareaFieldConfig['path'],
	value: string | number
): CharacterExtrasDraft {
	const combat = { ...extras.combat };

	switch (path) {
		case 'combat.armor_class':
			combat.armor_class = typeof value === 'number' ? value : Number(value) || 0;
			break;
		case 'combat.armor_class_notes':
			combat.armor_class_notes = String(value);
			break;
		case 'combat.speed':
			combat.speed = String(value);
			break;
		case 'combat.hp_dice':
			combat.hp_dice = String(value);
			break;
		case 'combat.challenge_rating':
			combat.challenge_rating = String(value);
			break;
		case 'combat.skills':
			combat.skills = String(value);
			break;
		case 'combat.senses':
			combat.senses = String(value);
			break;
		case 'combat.languages':
			combat.languages = String(value);
			break;
		case 'combat.traits':
			combat.traits = String(value);
			break;
		case 'combat.actions':
			combat.actions = String(value);
			break;
	}

	return { ...extras, combat };
}

export function readonlyPresentationText(identity: CharacterIdentityDraft): string {
	return identity.presentation.trim();
}

export function identityDisplayContext(
	input: Omit<IdentityDisplayContext, 'readonlyPresentation' | 'readonlyNotes'> & {
		identity: CharacterIdentityDraft;
		description: string;
	}
): IdentityDisplayContext {
	return {
		...input,
		readonlyPresentation: readonlyPresentationText(input.identity),
		readonlyNotes: input.description.trim()
	};
}

export const IDENTITY_DISPLAY_FIELDS: IdentityDisplayField[] = [
	{
		key: 'playerName',
		label: 'Player name',
		wide: true,
		show: ({ mode, playerName }) => mode === 'pc' && playerName.trim().length > 0,
		render: ({ playerName }) => playerName.trim()
	},
	{
		key: 'name',
		label: 'Name',
		show: ({ name }) => name.trim().length > 0,
		render: ({ name }) => name.trim()
	},
	{
		key: 'age',
		label: 'Age',
		show: ({ identity }) => identity.age.trim().length > 0,
		render: ({ identity }) => identity.age.trim()
	},
	{
		key: 'race',
		label: 'Species',
		show: ({ identity }) => identity.race.trim().length > 0,
		render: ({ identity }) => identity.race.trim()
	},
	{
		key: 'sizeType',
		label: 'Size / type',
		show: ({ sizeTypeLabel }) => sizeTypeLabel !== '—',
		render: ({ sizeTypeLabel }) => sizeTypeLabel
	},
	{
		key: 'class_name',
		label: 'Class',
		show: ({ identity }) => identity.class_name.trim().length > 0,
		render: ({ identity }) => identity.class_name.trim()
	},
	{
		key: 'level',
		label: 'Level',
		show: () => true,
		render: ({ extras }) => extras.level
	},
	{
		key: 'alignment',
		label: 'Alignment',
		show: ({ identity }) => identity.alignment.trim().length > 0,
		render: ({ identity }) => identity.alignment.trim()
	},
	{
		key: 'kind',
		label: 'Type',
		show: ({ mode }) => mode === 'npc',
		render: ({ kind }) => CHARACTER_KIND_LABELS[kind]
	},
	{
		key: 'role_label',
		label: 'Role',
		wide: true,
		show: ({ mode, identity }) => mode === 'npc' && identity.role_label.trim().length > 0,
		render: ({ identity }) => identity.role_label.trim()
	},
	{
		key: 'presentation',
		label: 'Description',
		wide: true,
		show: ({ mode, descriptionBeforeNotes, readonlyPresentation }) =>
			mode === 'npc' && descriptionBeforeNotes && readonlyPresentation.length > 0,
		render: ({ readonlyPresentation }) => readonlyPresentation
	},
	{
		key: 'notes',
		label: 'Notes',
		wide: true,
		show: ({ mode, readonlyNotes }) => mode === 'npc' && readonlyNotes.length > 0,
		render: ({ readonlyNotes }) => readonlyNotes
	}
];
