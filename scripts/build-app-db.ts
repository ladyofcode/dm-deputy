import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFreshInstallSql, SCHEMA_VERSION } from '../src/lib/db/migrations.ts';
import { seedCatalogDatabase } from './catalog-seed/insert.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(root, 'static/dm-deputy.sqlite');

mkdirSync(dirname(outputPath), { recursive: true });
rmSync(outputPath, { force: true });

const sqlite3 = await sqlite3InitModule();
const db = new sqlite3.oo1.DB(':memory:');

db.exec(getFreshInstallSql());

const counts = seedCatalogDatabase(db);

const now = new Date().toISOString();

db.exec({
	sql: `INSERT OR IGNORE INTO users (user_id, email, username, theme, date_created)
		VALUES (?, ?, ?, ?, ?)`,
	bind: ['usr-local', '', 'Game Master', 'default', now]
});

db.exec({
	sql: `INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
	bind: [String(SCHEMA_VERSION)]
});

db.exec({
	sql: `INSERT INTO schema_meta (key, value) VALUES ('seeded', 'default-v1')
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`
});

const bytes = sqlite3.capi.sqlite3_js_db_export(db);
writeFileSync(outputPath, Buffer.from(bytes));
db.close();

console.log(`Built ${outputPath} (schema v${SCHEMA_VERSION}) using @sqlite.org/sqlite-wasm`);
console.log(`  schema source: src/lib/db/migrations.ts`);
console.log(
	`  tables: campaigns, adventures, parts, story_nodes, characters, spells, weapons, armor, items, …`
);
if (counts.seededFromJson) {
	console.log(
		`  rules seed: spells ${counts.spellCount}, weapons ${counts.weaponCount}, armor ${counts.armorCount}, items ${counts.itemCount}`
	);
} else {
	console.log('  rules seed: empty (add JSON under ignorable/catalog-seed/dnd5e/)');
}
