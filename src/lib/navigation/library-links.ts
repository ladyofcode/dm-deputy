export const LIBRARY_LINKS = [
	{
		href: '/library/players',
		label: 'Characters',
		hint: 'Players and NPCs'
	},
	{
		href: '/library/rules',
		label: 'Rules',
		hint: 'Spells, weapons, armor, items'
	},
	{
		href: '/library/assets',
		label: 'Assets',
		hint: 'Campaign maps'
	},
	{
		href: '/library/media',
		label: 'Media',
		hint: 'Uploaded images'
	}
] as const;

export type LibraryHref = (typeof LIBRARY_LINKS)[number]['href'];
