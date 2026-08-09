export function pickRandom<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new Error('Cannot pick from an empty list');
	}

	return items[Math.floor(Math.random() * items.length)]!;
}

export function pickRandomExcluding<T>(items: readonly T[], current: T | null): T {
	if (items.length === 0) {
		throw new Error('Cannot pick from an empty list');
	}

	if (items.length === 1) return items[0]!;

	let next = pickRandom(items);
	while (current !== null && next === current) {
		next = pickRandom(items);
	}

	return next;
}

export function cycleName(
	items: readonly string[],
	current: string,
	direction: 'prev' | 'next'
): string {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0]!;

	const index = items.indexOf(current);
	if (index === -1) return pickRandom(items);

	const offset = direction === 'next' ? 1 : -1;
	const nextIndex = (index + offset + items.length) % items.length;
	return items[nextIndex]!;
}
