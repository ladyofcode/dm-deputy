import type { CreateMediaAssetInput, MediaAsset } from '$lib/domain/media-asset';
import { isUploadedTemplateImageUrl } from '$lib/domain/media-library';
import { execSql, selectObjects, bufferFromBytes } from '../bind';
import type { AppDb } from './context';
import { loadStoredMonsterTemplateRows, upsertMonsterTemplate } from './monster-templates';
import { ensureMediaAssetsSchema, tableExists, tableHasColumn } from './schema-repair';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';

type MediaAssetRow = MediaAsset;

function decodeDataUrlToBuffer(dataUrl: string): { mimeType: string; buffer: ArrayBuffer } | null {
	const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
	if (!match) return null;

	const binary = atob(match[2]!);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return { mimeType: match[1] || 'image/png', buffer: bytes.buffer };
}

function loadMapMediaIds(database: AppDb): Set<string> {
	if (!tableExists(database, 'maps') || !tableHasColumn(database, 'maps', 'media_id')) {
		return new Set();
	}

	return new Set(
		selectObjects<{ media_id: string }>(
			database,
			`SELECT media_id FROM maps WHERE media_id IS NOT NULL`
		).map((row) => row.media_id)
	);
}

export function loadMediaAssetsSnapshot(database: AppDb): MediaAsset[] {
	if (!tableExists(database, 'media_assets')) {
		return [];
	}

	return selectObjects<MediaAssetRow>(
		database,
		`SELECT media_id, label, mime_type, original_mime_type, full_width, full_height,
			original_width, original_height, thumb_width, thumb_height, image_source, created_at
		 FROM media_assets
		 ORDER BY created_at DESC`
	);
}

export function loadMediaLibrarySnapshot(
	database: AppDb,
	includeMapMedia: boolean
): MediaAsset[] {
	ensureMediaAssetsSchema(database);

	const mapMediaIds = includeMapMedia ? null : loadMapMediaIds(database);
	return loadMediaAssetsSnapshot(database).filter(
		(asset) => includeMapMedia || !mapMediaIds!.has(asset.media_id)
	);
}

export function loadMediaAssetById(database: AppDb, mediaId: string): MediaAsset | null {
	if (!tableExists(database, 'media_assets')) {
		return null;
	}

	const rows = selectObjects<MediaAssetRow>(
		database,
		`SELECT media_id, label, mime_type, original_mime_type, full_width, full_height,
			original_width, original_height, thumb_width, thumb_height, image_source, created_at
		 FROM media_assets WHERE media_id = $media_id LIMIT 1`,
		{ media_id: mediaId }
	);

	return rows[0] ?? null;
}

export function loadMediaAssetBlob(
	database: AppDb,
	mediaId: string,
	variant: 'thumb' | 'full' | 'original'
): ArrayBuffer | null {
	if (!tableExists(database, 'media_assets')) {
		return null;
	}

	const column =
		variant === 'thumb' ? 'thumb_blob' : variant === 'original' ? 'original_blob' : 'full_blob';
	const rows = selectObjects<Record<string, Uint8Array | null>>(
		database,
		`SELECT ${column} AS blob FROM media_assets WHERE media_id = $media_id LIMIT 1`,
		{ media_id: mediaId }
	);
	const bytes = rows[0]?.blob;
	if (!bytes?.byteLength) {
		if (variant === 'thumb') {
			return loadMediaAssetBlob(database, mediaId, 'full');
		}
		return null;
	}

	return bufferFromBytes(bytes);
}

export function createMediaAsset(
	database: AppDb,
	input: CreateMediaAssetInput,
	thumbBuffer: ArrayBuffer | null,
	fullBuffer: ArrayBuffer,
	originalBuffer: ArrayBuffer | null
): MediaAsset {
	execSql(database, {
		sql: `INSERT INTO media_assets (
			media_id, label, mime_type, original_mime_type, full_width, full_height,
			original_width, original_height, thumb_width, thumb_height, image_source,
			thumb_blob, full_blob, original_blob, created_at
		) VALUES (
			$media_id, $label, $mime_type, $original_mime_type, $full_width, $full_height,
			$original_width, $original_height, $thumb_width, $thumb_height, $image_source,
			$thumb_blob, $full_blob, $original_blob, $created_at
		)`,
		bind: {
			media_id: input.media_id,
			label: input.label ?? null,
			mime_type: input.mime_type,
			original_mime_type: input.original_mime_type ?? null,
			full_width: input.full_width,
			full_height: input.full_height,
			original_width: input.original_width ?? null,
			original_height: input.original_height ?? null,
			thumb_width: input.thumb_width ?? null,
			thumb_height: input.thumb_height ?? null,
			image_source: input.image_source ?? null,
			thumb_blob: thumbBuffer ? new Uint8Array(thumbBuffer) : null,
			full_blob: new Uint8Array(fullBuffer),
			original_blob: originalBuffer ? new Uint8Array(originalBuffer) : null,
			created_at: input.created_at
		}
	});

	return loadMediaAssetById(database, input.media_id)!;
}

type LegacyCharacterImageColumns = {
	fullBlob: string;
	thumbBlob: string;
	originalBlob: string;
	mimeType: string;
	width: string;
	height: string;
	originalMimeType: string;
	originalWidth: string;
	originalHeight: string;
	thumbWidth: string;
	thumbHeight: string;
	imageSource: string;
	mediaIdColumn: string;
};

const LEGACY_PORTRAIT_COLUMNS: LegacyCharacterImageColumns = {
	fullBlob: 'full_blob',
	thumbBlob: 'thumb_blob',
	originalBlob: 'original_blob',
	mimeType: 'mime_type',
	width: 'portrait_width',
	height: 'portrait_height',
	originalMimeType: 'original_mime_type',
	originalWidth: 'original_width',
	originalHeight: 'original_height',
	thumbWidth: 'thumb_width',
	thumbHeight: 'thumb_height',
	imageSource: 'image_source',
	mediaIdColumn: 'portrait_media_id'
};

const LEGACY_PRESENTATION_COLUMNS: LegacyCharacterImageColumns = {
	fullBlob: 'presentation_full_blob',
	thumbBlob: 'presentation_thumb_blob',
	originalBlob: 'presentation_original_blob',
	mimeType: 'presentation_mime_type',
	width: 'presentation_width',
	height: 'presentation_height',
	originalMimeType: 'presentation_original_mime_type',
	originalWidth: 'presentation_original_width',
	originalHeight: 'presentation_original_height',
	thumbWidth: 'presentation_thumb_width',
	thumbHeight: 'presentation_thumb_height',
	imageSource: 'presentation_image_source',
	mediaIdColumn: 'presentation_media_id'
};

function importLegacyCharacterImage(
	database: AppDb,
	characterId: string,
	displayName: string,
	suffix: 'portrait' | 'presentation',
	columns: LegacyCharacterImageColumns
): void {
	const rows = selectObjects<Record<string, string | number | Uint8Array | null>>(
		database,
		`SELECT ${columns.mimeType}, ${columns.width}, ${columns.height}, ${columns.originalMimeType},
			${columns.originalWidth}, ${columns.originalHeight}, ${columns.thumbWidth},
			${columns.thumbHeight}, ${columns.imageSource}, ${columns.thumbBlob}, ${columns.fullBlob},
			${columns.originalBlob}
		 FROM characters
		 WHERE character_id = $character_id AND ${columns.fullBlob} IS NOT NULL
		 LIMIT 1`,
		{ character_id: characterId }
	);

	const row = rows[0];
	const fullBuffer = bufferFromBytes(row?.[columns.fullBlob] as Uint8Array | null | undefined);
	if (!row || !fullBuffer) return;

	const mediaId = `med-${characterId}-${suffix}`;
	if (loadMediaAssetById(database, mediaId)) return;

	const label =
		suffix === 'presentation' ? `${displayName} (presentation)` : displayName;

	createMediaAsset(
		database,
		{
			media_id: mediaId,
			label,
			mime_type: (row[columns.mimeType] as string | null) ?? 'image/jpeg',
			original_mime_type: row[columns.originalMimeType] as string | null,
			full_width:
				(row[columns.width] as number | null) ??
				(row[columns.thumbWidth] as number | null) ??
				1,
			full_height:
				(row[columns.height] as number | null) ??
				(row[columns.thumbHeight] as number | null) ??
				1,
			original_width: row[columns.originalWidth] as number | null,
			original_height: row[columns.originalHeight] as number | null,
			thumb_width: row[columns.thumbWidth] as number | null,
			thumb_height: row[columns.thumbHeight] as number | null,
			image_source: row[columns.imageSource] as string | null,
			created_at: new Date().toISOString()
		},
		bufferFromBytes(row[columns.thumbBlob] as Uint8Array | null | undefined),
		fullBuffer,
		bufferFromBytes(row[columns.originalBlob] as Uint8Array | null | undefined)
	);

	execSql(database, {
		sql: `UPDATE characters SET
			${columns.mediaIdColumn} = $media_id,
			${columns.thumbBlob} = NULL,
			${columns.fullBlob} = NULL,
			${columns.originalBlob} = NULL
		 WHERE character_id = $character_id`,
		bind: { character_id: characterId, media_id: mediaId }
	});
}

function importLegacyCharacterPortrait(database: AppDb, characterId: string, displayName: string): void {
	importLegacyCharacterImage(
		database,
		characterId,
		displayName,
		'portrait',
		LEGACY_PORTRAIT_COLUMNS
	);
}

function importLegacyCharacterPresentation(
	database: AppDb,
	characterId: string,
	displayName: string
): void {
	importLegacyCharacterImage(
		database,
		characterId,
		displayName,
		'presentation',
		LEGACY_PRESENTATION_COLUMNS
	);
}

function importLegacyMap(database: AppDb, mapId: string, name: string, createdAt: string): void {
	const rows = selectObjects<{
		mime_type: string;
		full_width: number;
		full_height: number;
		thumb_width: number;
		thumb_height: number;
		image_source: string | null;
		thumb_blob: Uint8Array | null;
		full_blob: Uint8Array | null;
	}>(
		database,
		`SELECT mime_type, full_width, full_height, thumb_width, thumb_height, image_source,
			thumb_blob, full_blob
		 FROM maps WHERE map_id = $map_id LIMIT 1`,
		{ map_id: mapId }
	);

	const row = rows[0];
	const fullBuffer = bufferFromBytes(row?.full_blob);
	if (!row || !fullBuffer) return;

	const mediaId = `med-${mapId}`;
	if (loadMediaAssetById(database, mediaId)) return;

	createMediaAsset(
		database,
		{
			media_id: mediaId,
			label: name,
			mime_type: row.mime_type,
			full_width: row.full_width,
			full_height: row.full_height,
			thumb_width: row.thumb_width,
			thumb_height: row.thumb_height,
			image_source: row.image_source,
			created_at: createdAt
		},
		bufferFromBytes(row.thumb_blob),
		fullBuffer,
		null
	);

	execSql(database, {
		sql: `UPDATE maps SET media_id = $media_id, thumb_blob = NULL, full_blob = NULL WHERE map_id = $map_id`,
		bind: { map_id: mapId, media_id: mediaId }
	});
}

function importLegacyTemplateImage(database: AppDb, template: MonsterTemplate): void {
	const imageUrl = template.image_url?.trim();
	if (!isUploadedTemplateImageUrl(imageUrl)) return;

	const mediaId = `med-template-${template.id}`;
	if (loadMediaAssetById(database, mediaId)) return;

	const decoded = decodeDataUrlToBuffer(imageUrl!);
	if (!decoded) return;

	createMediaAsset(
		database,
		{
			media_id: mediaId,
			label: template.name,
			mime_type: decoded.mimeType,
			full_width: 1,
			full_height: 1,
			image_source: template.image_source ?? null,
			created_at: new Date().toISOString()
		},
		null,
		decoded.buffer,
		decoded.buffer
	);

	upsertMonsterTemplate(database, {
		...template,
		media_id: mediaId,
		image_url: undefined
	});
}

export function backfillMediaAssets(database: AppDb): void {
	ensureMediaAssetsSchema(database);

	if (!tableExists(database, 'media_assets')) return;

	const existing =
		selectObjects<{ count: number }>(database, 'SELECT COUNT(*) AS count FROM media_assets')[0]
			?.count ?? 0;
	if (existing > 0) return;

	const characters = selectObjects<{ character_id: string; display_name: string }>(
		database,
		`SELECT character_id, display_name FROM characters WHERE date_deleted IS NULL`
	);

	for (const character of characters) {
		importLegacyCharacterPortrait(database, character.character_id, character.display_name);
		importLegacyCharacterPresentation(database, character.character_id, character.display_name);
	}

	const maps = selectObjects<{ map_id: string; name: string; created_at: string }>(
		database,
		'SELECT map_id, name, created_at FROM maps'
	);

	for (const map of maps) {
		importLegacyMap(database, map.map_id, map.name, map.created_at);
	}

	if (tableExists(database, 'monster_templates')) {
		for (const template of loadStoredMonsterTemplateRows(database)) {
			importLegacyTemplateImage(database, template);
		}
	}
}

export function loadMediaLibraryBlob(
	database: AppDb,
	mediaId: string,
	variant: 'thumb' | 'full'
): ArrayBuffer | null {
	ensureMediaAssetsSchema(database);
	return loadMediaAssetBlob(database, mediaId, variant === 'thumb' ? 'thumb' : 'full');
}
