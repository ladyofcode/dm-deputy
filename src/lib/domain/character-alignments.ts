export const CHARACTER_ALIGNMENTS = [
	'Lawful Good',
	'Neutral Good',
	'Chaotic Good',
	'Lawful Neutral',
	'True Neutral',
	'Chaotic Neutral',
	'Lawful Evil',
	'Neutral Evil',
	'Chaotic Evil'
] as const;

export type CharacterAlignment = (typeof CHARACTER_ALIGNMENTS)[number];
