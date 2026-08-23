import { mergeStoredMonsterTemplates } from '$lib/domain/monster-template-storage';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
import { execSql, selectObjects } from '../bind';
import type { AppDb } from './context';

function parseMonsterTemplateJson(dataJson: string): MonsterTemplate | null {
	try {
		const parsed: unknown = JSON.parse(dataJson);
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			typeof (parsed as MonsterTemplate).id !== 'string' ||
			typeof (parsed as MonsterTemplate).name !== 'string'
		) {
			return null;
		}

		return parsed as MonsterTemplate;
	} catch {
		return null;
	}
}

export function loadStoredMonsterTemplateRows(database: AppDb): MonsterTemplate[] {
	const rows = selectObjects<{ data_json: string }>(
		database,
		'SELECT data_json FROM monster_templates'
	);

	const stored: MonsterTemplate[] = [];
	for (const row of rows) {
		const template = parseMonsterTemplateJson(row.data_json);
		if (template) {
			stored.push(template);
		}
	}

	return stored;
}

function mergeTemplateMigrationRecords(
	existing: MonsterTemplate | undefined,
	incoming: MonsterTemplate
): MonsterTemplate {
	if (!existing) {
		return incoming;
	}

	return {
		...existing,
		...incoming,
		id: incoming.id,
		image_url: incoming.image_url?.trim() || existing.image_url?.trim() || undefined,
		image_source: incoming.image_source?.trim() || existing.image_source?.trim() || undefined
	};
}

export function loadMonsterTemplates(database: AppDb): MonsterTemplate[] {
	return mergeStoredMonsterTemplates(loadStoredMonsterTemplateRows(database));
}

export function upsertMonsterTemplate(database: AppDb, template: MonsterTemplate): void {
	execSql(database, {
		sql: `INSERT INTO monster_templates (template_id, data_json) VALUES ($template_id, $data_json)
			ON CONFLICT(template_id) DO UPDATE SET data_json = excluded.data_json`,
		bind: {
			template_id: template.id,
			data_json: JSON.stringify(template)
		}
	});
}

export function deleteMonsterTemplate(database: AppDb, templateId: string): void {
	execSql(database, {
		sql: `DELETE FROM monster_templates WHERE template_id = $template_id`,
		bind: { template_id: templateId }
	});
}

export function migrateMonsterTemplatesFromLocalStorage(
	database: AppDb,
	templates: MonsterTemplate[]
): number {
	if (templates.length === 0) return 0;

	const existingById = new Map(
		loadStoredMonsterTemplateRows(database).map((template) => [template.id, template])
	);

	let migrated = 0;

	for (const template of templates) {
		const merged = mergeTemplateMigrationRecords(existingById.get(template.id), template);
		upsertMonsterTemplate(database, merged);
		existingById.set(template.id, merged);
		migrated += 1;
	}

	return migrated;
}
