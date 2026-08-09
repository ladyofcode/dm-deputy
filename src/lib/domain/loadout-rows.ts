export type LoadoutListField = 'weapons' | 'items' | 'spells';

export function createLoadoutRowKey(field: LoadoutListField): string {
	return `${field}-row-${crypto.randomUUID()}`;
}

export function syncLoadoutRowKeys(
	currentKeys: string[],
	field: LoadoutListField,
	rowCount: number
): string[] {
	if (currentKeys.length === rowCount) return currentKeys;

	const next = currentKeys.slice(0, rowCount);

	while (next.length < rowCount) {
		next.push(createLoadoutRowKey(field));
	}

	return next;
}

export function appendLoadoutRowKey(currentKeys: string[], field: LoadoutListField): string[] {
	return [...currentKeys, createLoadoutRowKey(field)];
}

export function removeLoadoutRowKey(currentKeys: string[], index: number): string[] {
	return currentKeys.filter((_, rowIndex) => rowIndex !== index);
}

export function addLoadoutEntry<T>(entries: T[], emptyEntry: T): T[] {
	return [...entries, emptyEntry];
}

export function removeLoadoutEntry<T>(entries: T[], index: number, emptyEntry: T): T[] {
	const next = entries.filter((_, rowIndex) => rowIndex !== index);
	return next.length ? next : [emptyEntry];
}

export function updateLoadoutEntry<T>(entries: T[], index: number, value: T): T[] {
	const next = [...entries];
	next[index] = value;
	return next;
}
