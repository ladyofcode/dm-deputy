import { execSql, selectObjects, bufferFromBytes } from '../bind';
import type { CreateCampaignMapInput } from '../types';
import type { CampaignMap } from '$lib/types/schema';
import type { AppDb } from './context';
import { loadMediaAssetBlob } from './media-assets';

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
		media_id: string | null;
		created_at: string;
	}>(
		database,
		`SELECT map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height,
			image_source, media_id, created_at
		 FROM maps
		 WHERE (thumb_blob IS NOT NULL AND full_blob IS NOT NULL) OR media_id IS NOT NULL
		 ORDER BY name COLLATE NOCASE`
	);
}

export function createCampaignMap(
	database: AppDb,
	input: CreateCampaignMapInput,
	thumbBuffer: ArrayBuffer | null,
	fullBuffer: ArrayBuffer | null
): CampaignMap {
	execSql(database, {
		sql: `INSERT INTO maps (
			map_id, campaign_id, name, mime_type, full_width, full_height, thumb_width, thumb_height,
			thumb_blob, full_blob, created_at, layout_mode, image_source, media_id
		) VALUES (
			$map_id, $campaign_id, $name, $mime_type, $full_width, $full_height, $thumb_width, $thumb_height,
			$thumb_blob, $full_blob, $created_at, 'popup', $image_source, $media_id
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
			thumb_blob: thumbBuffer ? new Uint8Array(thumbBuffer) : null,
			full_blob: fullBuffer ? new Uint8Array(fullBuffer) : null,
			created_at: input.created_at,
			image_source: input.image_source ?? null,
			media_id: input.media_id ?? null
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
		media_id: input.media_id ?? null,
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
	const rows = selectObjects<{
		thumb_blob: Uint8Array | null;
		full_blob: Uint8Array | null;
		media_id: string | null;
	}>(
		database,
		`SELECT thumb_blob, full_blob, media_id FROM maps WHERE map_id = $mapId LIMIT 1`,
		{ mapId }
	);

	const row = rows[0];
	if (!row) return null;

	const column = variant === 'thumb' ? 'thumb_blob' : 'full_blob';
	const bytes = row[column];
	if (bytes?.byteLength) {
		return bufferFromBytes(bytes);
	}

	if (row.media_id) {
		return loadMediaAssetBlob(database, row.media_id, variant === 'thumb' ? 'thumb' : 'full');
	}

	return null;
}
