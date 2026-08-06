import { execSql } from './bind';

type SqlDatabase = Parameters<typeof execSql>[0];

let transactionDepth = 0;

export function withTransaction(database: SqlDatabase, fn: () => void): void {
	if (transactionDepth > 0) {
		fn();
		return;
	}

	transactionDepth += 1;
	execSql(database, { sql: 'BEGIN IMMEDIATE' });

	try {
		fn();
		execSql(database, { sql: 'COMMIT' });
	} catch (error) {
		execSql(database, { sql: 'ROLLBACK' });
		throw error;
	} finally {
		transactionDepth -= 1;
	}
}
