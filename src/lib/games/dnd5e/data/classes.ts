export const DND5E_CLASSES = [
	'Barbarian',
	'Bard',
	'Cleric',
	'Druid',
	'Fighter',
	'Monk',
	'Paladin',
	'Ranger',
	'Rogue',
	'Sorcerer',
	'Warlock',
	'Wizard'
] as const;

export type Dnd5eClass = (typeof DND5E_CLASSES)[number];

export function listSelectableClasses(currentValue = ''): string[] {
	const trimmed = currentValue.trim();
	const options: string[] = [...DND5E_CLASSES];

	if (
		trimmed &&
		!options.some((entry) => entry.localeCompare(trimmed, undefined, { sensitivity: 'base' }) === 0)
	) {
		options.push(trimmed);
	}

	return options.sort((left, right) =>
		left.localeCompare(right, undefined, { sensitivity: 'base' })
	);
}

export function getClassByName(className: string): Dnd5eClass | undefined {
	const trimmed = className.trim();
	if (!trimmed) return undefined;

	return DND5E_CLASSES.find(
		(entry) => entry.localeCompare(trimmed, undefined, { sensitivity: 'base' }) === 0
	);
}
