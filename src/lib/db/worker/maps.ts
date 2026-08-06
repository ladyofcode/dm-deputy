import { execSql, selectObjects } from '../bind';
import type { CreateCampaignMapInput } from '../types';
import type { CampaignMap } from '$lib/types/schema';
import type { AppDb } from './context';

export function loadCampaignMapsMetadata(database: AppDb): CampaignMap[] {
	return selectObjects<{
		map_id: string;
		campaign_id: string;
		name: string;
		mime_type: string;
		full_width: number;
		full_height: number;
		thumb_width: number;
		thumb_height: number;
		image_source: string | null;
		created_at: string;
	}>(
		database,
		`SELECT map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height, image_source, created_at
		 FROM maps
		 WHERE thumb_blob IS NOT NULL AND full_blob IS NOT NULL
		 ORDER BY name COLLATE NOCASE`
	);
}

export function createCampaignMap(
	database: AppDb,
	input: CreateCampaignMapInput,
	thumbBuffer: ArrayBuffer,
	fullBuffer: ArrayBuffer
): CampaignMap {
	execSql(database, {
		sql: `INSERT INTO maps (
			map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height,
			thumb_blob, full_blob, created_at, layout_mode, image_source
		) VALUES (
			$map_id, $campaign_id, $name, $mime_type, $full_width, $full_height, $thumb_width, $thumb_height,
			$thumb_blob, $full_blob, $created_at, 'popup', $image_source
		)`,
		bind: {
			map_id: input.map_id,
			campaign_id: input.campaign_id,
			name: input.name,
			mime_type: input.mime_type,
			full_width: input.full_width,
			full_height: input.full_height,
			thumb_width: input.thumb_width,
			thumb_height: input.thumb_height,
			thumb_blob: new Uint8Array(thumbBuffer),
			full_blob: new Uint8Array(fullBuffer),
			created_at: input.created_at,
			image_source: input.image_source ?? null
		}
	});

	return {
		map_id: input.map_id,
		campaign_id: input.campaign_id,
		name: input.name,
		mime_type: input.mime_type,
		full_width: input.full_width,
		full_height: input.full_height,
		thumb_width: input.thumb_width,
		thumb_height: input.thumb_height,
		image_source: input.image_source ?? null,
		created_at: input.created_at
	};
}

export function deleteCampaignMap(database: AppDb, mapId: string): void {
	execSql(database, {
		sql: 'DELETE FROM maps WHERE map_id = $mapId',
		bind: { mapId }
	});
}

export function loadCampaignMapBlob(
	database: AppDb,
	mapId: string,
	variant: 'thumb' | 'full'
): ArrayBuffer | null {
	const column = variant === 'thumb' ? 'thumb_blob' : 'full_blob';
	const rows = selectObjects<Record<string, Uint8Array | null>>(
		database,
		`SELECT ${column} AS blob FROM maps WHERE map_id = $mapId LIMIT 1`,
		{ mapId }
	);
	const bytes = rows[0]?.blob;
	if (!bytes?.byteLength) return null;

	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
