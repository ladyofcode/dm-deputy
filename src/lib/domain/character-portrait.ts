import {
	computeCoverCropRect,
	cropImageRectToFile,
	type NormalizedCropRect,
	serializeCropRect
} from '$lib/domain/crop-image';
import type { CharacterPortraitUploadPayload } from '$lib/types/image-upload';

export const PORTRAIT_ORIGINAL_MAX_EDGE = 2048;
export const PORTRAIT_FULL_MAX_EDGE = 800;
export const PORTRAIT_THUMB_MAX_EDGE = 160;
export const PORTRAIT_FULL_QUALITY = 0.88;
export const PORTRAIT_THUMB_QUALITY = 0.82;
export const PORTRAIT_THUMB_ASPECT_RATIO = 4 / 5;

export type ProcessedCharacterPortrait = {
	mime_type: 'image/jpeg' | 'image/webp' | 'image/png';
	original_mime_type: 'image/jpeg' | 'image/webp' | 'image/png';
	portrait_width: number;
	portrait_height: number;
	original_width: number;
	original_height: number;
	thumb_width: number;
	thumb_height: number;
	thumb_crop_json: string;
	fullBuffer: ArrayBuffer | null;
	originalBuffer: ArrayBuffer | null;
	thumbBuffer: ArrayBuffer;
};

type OutputMimeType = ProcessedCharacterPortrait['mime_type'];

function isPngFile(file: File): boolean {
	return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Could not read image file'));
		};
		image.src = url;
	});
}

function fitWithin(width: number, height: number, maxEdge: number) {
	const scale = Math.min(1, maxEdge / Math.max(width, height));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	mimeType: OutputMimeType | 'image/webp',
	quality: number
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Could not compress image'));
					return;
				}

				void blob.arrayBuffer().then(resolve).catch(reject);
			},
			mimeType,
			quality
		);
	});
}

function drawScaledImage(image: HTMLImageElement, width: number, height: number) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Could not prepare image canvas');
	}

	context.drawImage(image, 0, 0, width, height);
	return canvas;
}

function outputMimeType(file: File): OutputMimeType {
	if (isPngFile(file)) {
		return 'image/png';
	}

	const canvas = document.createElement('canvas');
	return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

function thumbOutputMimeType(file: File): 'image/png' | 'image/webp' {
	return isPngFile(file) ? 'image/png' : 'image/webp';
}

async function resolveThumbCrop(
	originalFile: File,
	thumbCropFile: File | null,
	thumbCropRect: NormalizedCropRect | null
): Promise<{ file: File; rect: NormalizedCropRect }> {
	if (thumbCropFile && thumbCropRect) {
		return { file: thumbCropFile, rect: thumbCropRect };
	}

	const image = await loadImageFromFile(originalFile);
	const rect = computeCoverCropRect(
		image.naturalWidth,
		image.naturalHeight,
		PORTRAIT_THUMB_ASPECT_RATIO
	);
	const file = await cropImageRectToFile(image, rect, originalFile.name, originalFile.type);

	return { file, rect };
}

export async function processCharacterPortraitUpload(
	payload: CharacterPortraitUploadPayload
): Promise<ProcessedCharacterPortrait> {
	const originalFile = payload.originalFile;
	if (!originalFile) {
		throw new Error('Choose an image file');
	}

	if (!originalFile.type.startsWith('image/') && !isPngFile(originalFile)) {
		throw new Error('Choose an image file');
	}

	const { file: thumbSourceFile, rect: thumbCropRect } = await resolveThumbCrop(
		originalFile,
		payload.thumbCropFile ?? null,
		payload.thumbCropRect ?? null
	);

	const originalImage = await loadImageFromFile(originalFile);
	const thumbImage = await loadImageFromFile(thumbSourceFile);
	const mime_type = outputMimeType(originalFile);
	const original_mime_type = mime_type;
	const originalSize = fitWithin(
		originalImage.naturalWidth,
		originalImage.naturalHeight,
		PORTRAIT_ORIGINAL_MAX_EDGE
	);
	const fullSize = fitWithin(
		originalImage.naturalWidth,
		originalImage.naturalHeight,
		PORTRAIT_FULL_MAX_EDGE
	);
	const thumbSize = fitWithin(
		thumbImage.naturalWidth,
		thumbImage.naturalHeight,
		PORTRAIT_THUMB_MAX_EDGE
	);
	const thumbMime = thumbOutputMimeType(thumbSourceFile);

	const originalCanvas = drawScaledImage(originalImage, originalSize.width, originalSize.height);
	const fullCanvas = drawScaledImage(originalImage, fullSize.width, fullSize.height);
	const thumbCanvas = drawScaledImage(thumbImage, thumbSize.width, thumbSize.height);

	const [originalBuffer, fullBuffer, thumbBuffer] = await Promise.all([
		canvasToBlob(originalCanvas, original_mime_type, PORTRAIT_FULL_QUALITY),
		canvasToBlob(fullCanvas, mime_type, PORTRAIT_FULL_QUALITY),
		canvasToBlob(thumbCanvas, thumbMime, PORTRAIT_THUMB_QUALITY)
	]);

	return {
		mime_type,
		original_mime_type,
		portrait_width: fullSize.width,
		portrait_height: fullSize.height,
		original_width: originalSize.width,
		original_height: originalSize.height,
		thumb_width: thumbSize.width,
		thumb_height: thumbSize.height,
		thumb_crop_json: serializeCropRect(thumbCropRect),
		fullBuffer,
		originalBuffer,
		thumbBuffer
	};
}

export async function processCharacterPortraitReCrop(
	payload: CharacterPortraitUploadPayload
): Promise<
	Pick<
		ProcessedCharacterPortrait,
		'thumb_width' | 'thumb_height' | 'thumb_crop_json' | 'thumbBuffer'
	>
> {
	if (!payload.thumbCropFile || !payload.thumbCropRect) {
		throw new Error('Thumb crop is required');
	}

	const thumbImage = await loadImageFromFile(payload.thumbCropFile);
	const thumbSize = fitWithin(
		thumbImage.naturalWidth,
		thumbImage.naturalHeight,
		PORTRAIT_THUMB_MAX_EDGE
	);
	const thumbMime = thumbOutputMimeType(payload.thumbCropFile);
	const thumbCanvas = drawScaledImage(thumbImage, thumbSize.width, thumbSize.height);
	const thumbBuffer = await canvasToBlob(thumbCanvas, thumbMime, PORTRAIT_THUMB_QUALITY);

	return {
		thumb_width: thumbSize.width,
		thumb_height: thumbSize.height,
		thumb_crop_json: serializeCropRect(payload.thumbCropRect),
		thumbBuffer
	};
}
