type BindableDb = {
	exec: (sql: string | { sql: string; bind?: Record<string, unknown> }) => void;
	selectObjects: (sql: string, bind?: Record<string, unknown>) => unknown[];
};

function asBindableDb(database: object): BindableDb {
	return database as BindableDb;
}

export function prefixBindKeys(
	bind?: Record<string, unknown>
): Record<string, unknown> | undefined {
	if (!bind) return bind;

	const prefixed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(bind)) {
		prefixed[key.startsWith('$') ? key : `$${key}`] = value;
	}

	return prefixed;
}

export function execSql(
	database: object,
	sql: string | { sql: string; bind?: Record<string, unknown> }
): void {
	const db = asBindableDb(database);

	if (typeof sql === 'string') {
		db.exec(sql);
		return;
	}

	db.exec({ sql: sql.sql, bind: prefixBindKeys(sql.bind) });
}

export function selectObjects<T extends Record<string, unknown>>(
	database: object,
	sql: string,
	bind?: Record<string, unknown>
): T[] {
	return asBindableDb(database).selectObjects(sql, prefixBindKeys(bind)) as T[];
}
