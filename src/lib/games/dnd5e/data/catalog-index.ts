export function buildCatalogIdIndex<T>(
	catalog: readonly T[],
	getId: (entry: T) => string
): Map<string, T> {
	return new Map(catalog.map((entry) => [getId(entry), entry]));
}

export function buildCatalogNameIndex<T>(
	catalog: readonly T[],
	getName: (entry: T) => string
): Map<string, T> {
	return new Map(catalog.map((entry) => [getName(entry).toLowerCase(), entry]));
}

export function createCatalogIdIndex<T>(
	getCatalog: () => readonly T[],
	getId: (entry: T) => string
): () => Map<string, T> {
	let cachedCatalog: readonly T[] | null = null;
	let index = new Map<string, T>();

	return () => {
		const catalog = getCatalog();
		if (catalog !== cachedCatalog) {
			cachedCatalog = catalog;
			index = buildCatalogIdIndex(catalog, getId);
		}

		return index;
	};
}

export function createCatalogNameIndex<T>(
	getCatalog: () => readonly T[],
	getName: (entry: T) => string
): () => Map<string, T> {
	let cachedCatalog: readonly T[] | null = null;
	let index = new Map<string, T>();

	return () => {
		const catalog = getCatalog();
		if (catalog !== cachedCatalog) {
			cachedCatalog = catalog;
			index = buildCatalogNameIndex(catalog, getName);
		}

		return index;
	};
}
