export type MediaAsset = {
	media_id: string;
	label: string | null;
	mime_type: string;
	original_mime_type: string | null;
	full_width: number;
	full_height: number;
	original_width: number | null;
	original_height: number | null;
	thumb_width: number | null;
	thumb_height: number | null;
	image_source: string | null;
	created_at: string;
};

export type CreateMediaAssetInput = {
	media_id: string;
	label?: string | null;
	mime_type: string;
	original_mime_type?: string | null;
	full_width: number;
	full_height: number;
	original_width?: number | null;
	original_height?: number | null;
	thumb_width?: number | null;
	thumb_height?: number | null;
	image_source?: string | null;
	created_at: string;
};

export function buildMediaAssetId(): string {
	return `med-${crypto.randomUUID()}`;
}

export function getMediaAssetLabel(asset: Pick<MediaAsset, 'label'>): string {
	return asset.label?.trim() || 'Untitled image';
}
