import type { NormalizedCropRect } from '$lib/domain/crop-image';

export type { NormalizedCropRect };

export type ImageUploadResult = {
	/** Thumb crop when cropping, otherwise the uploaded file */
	file?: File;
	imageSource: string | null;
	/** Full upload when replacing the stored original */
	originalFile?: File | null;
	thumbCropRect?: NormalizedCropRect | null;
	/** True when only the thumb crop changed; original stays in storage */
	reCropOnly?: boolean;
	/** Pick an existing shared image instead of uploading a new copy */
	existingMediaId?: string | null;
};

export type CharacterPortraitUploadPayload = {
	originalFile: File | null;
	thumbCropFile?: File | null;
	thumbCropRect?: NormalizedCropRect | null;
	imageSource: string | null;
	existingMediaId?: string | null;
};

export function normalizeImageSource(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error ?? new Error('Could not read image file'));
		reader.readAsDataURL(file);
	});
}
