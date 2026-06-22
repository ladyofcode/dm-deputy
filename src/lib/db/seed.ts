import { LOCAL_USER_ID } from '$lib/constants/user';
import type { DbExec } from './types';

export function ensureDefaultUser(db: DbExec): void {
	const now = new Date().toISOString();

	db.exec({
		sql: `INSERT OR IGNORE INTO users (user_id, email, username, theme, date_created)
			VALUES ($user_id, $email, $username, $theme, $date_created)`,
		bind: {
			user_id: LOCAL_USER_ID,
			email: '',
			username: 'Game Master',
			theme: 'default',
			date_created: now
		}
	});

	db.exec({
		sql: `INSERT INTO schema_meta (key, value) VALUES ('seeded', 'default-v1')
			ON CONFLICT(key) DO UPDATE SET value = excluded.value`
	});
}
