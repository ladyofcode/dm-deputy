import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = process.argv[2] ?? join(root, 'static/dm-deputy.sqlite');

if (!existsSync(dbPath)) {
	console.error(`File not found: ${dbPath}`);
	process.exit(1);
}

const sqlite3 = await sqlite3InitModule();
const fileBytes = readFileSync(dbPath);
const bytes = new Uint8Array(fileBytes);
const db = new sqlite3.oo1.DB(':memory:');
const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
const flags =
	sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE;
const result = sqlite3.capi.sqlite3_deserialize(
	db.pointer,
	'main',
	pointer,
	bytes.byteLength,
	bytes.byteLength,
	flags
);

if (result !== sqlite3.capi.SQLITE_OK) {
	throw new Error(`Failed to open database: ${sqlite3.capi.sqlite3_js_rc_str(result)}`);
}

function query(sql) {
	return db.selectObjects(sql);
}

const schemaVersion = query("SELECT value FROM schema_meta WHERE key = 'schema_version' LIMIT 1")[0]
	?.value;

console.log(`\nDM Deputy DB inspection: ${dbPath}`);
console.log(`Schema version: ${schemaVersion ?? 'unknown'}\n`);

const campaigns = query(
	`SELECT campaign_id, owner_user_id, campaign_name, description, date_created, date_deleted
	 FROM campaigns ORDER BY date_created`
);

console.log(`Campaigns (${campaigns.length}):`);
for (const campaign of campaigns) {
	const deleted = campaign.date_deleted ? ' [DELETED]' : '';
	console.log(`  - ${campaign.campaign_name}${deleted}`);
	console.log(`    id: ${campaign.campaign_id}`);
	console.log(`    owner: ${campaign.owner_user_id}`);
	console.log(`    created: ${campaign.date_created}`);
}

const members = query(
	`SELECT player_id, campaign_id, user_id, role, last_played_at FROM campaign_members ORDER BY campaign_id, role`
);

console.log(`\nCampaign members (${members.length}):`);
for (const member of members) {
	console.log(
		`  - ${member.campaign_id}: ${member.user_id} (${member.role}) last_played=${member.last_played_at ?? 'never'}`
	);
}

const adventures = query(
	`SELECT adventure_id, campaign_id, name, can_promote_to_campaign, date_created
	 FROM adventures ORDER BY campaign_id, date_created`
);

console.log(`\nAdventures (${adventures.length}):`);
for (const adventure of adventures) {
	const promote = adventure.can_promote_to_campaign ? ' [promotable]' : '';
	console.log(`  - ${adventure.name}${promote}`);
	console.log(`    id: ${adventure.adventure_id} → campaign ${adventure.campaign_id}`);
}

const parts = query(
	'SELECT part_id, adventure_id, title, sort_order FROM parts ORDER BY adventure_id, sort_order'
);
console.log(`\nParts: ${parts.length}`);

const nodes = query('SELECT COUNT(*) AS count FROM story_nodes')[0]?.count ?? 0;
const clonedCharacters = query(
	`SELECT character_id, campaign_id, kind, display_name, cloned_from_character_id
	 FROM characters WHERE cloned_from_character_id IS NOT NULL`
);

console.log(`Story nodes: ${nodes}`);
console.log(`Cloned characters (promotion copies): ${clonedCharacters.length}`);
for (const character of clonedCharacters) {
	console.log(
		`  - ${character.display_name} (${character.kind}) in ${character.campaign_id} ← ${character.cloned_from_character_id}`
	);
}

const nameMatches = query(`
	SELECT c.campaign_id, c.campaign_name, a.adventure_id, a.campaign_id AS source_campaign_id
	FROM campaigns c
	JOIN adventures a ON a.name = c.campaign_name AND a.campaign_id <> c.campaign_id
`);

if (nameMatches.length) {
	console.log(`\nLikely promotion pairs (adventure name = campaign name, different campaigns):`);
	for (const row of nameMatches) {
		console.log(
			`  - campaign "${row.campaign_name}" (${row.campaign_id}) may be clone of adventure in ${row.source_campaign_id}`
		);
	}
}

db.close();
