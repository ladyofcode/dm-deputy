export const PORTRAIT_FULL_MAX_EDGE = 800;
export const PORTRAIT_THUMB_MAX_EDGE = 160;
export const PORTRAIT_FULL_QUALITY = 0.88;
export const PORTRAIT_THUMB_QUALITY = 0.82;

export type ProcessedCharacterPortrait = {
	mime_type: 'image/jpeg' | 'image/webp' | 'image/png';
	portrait_width: number;
	portrait_height: number;
	thumb_width: number;
	thumb_height: number;
	fullBuffer: ArrayBuffer;
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
	mimeType: OutputMimeType,
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

export async function processCharacterPortraitUpload(
	file: File
): Promise<ProcessedCharacterPortrait> {
	if (!file.type.startsWith('image/') && !isPngFile(file)) {
		throw new Error('Choose an image file');
	}

	const image = await loadImageFromFile(file);
	const mime_type = outputMimeType(file);
	const fullSize = fitWithin(image.naturalWidth, image.naturalHeight, PORTRAIT_FULL_MAX_EDGE);
	const thumbSize = fitWithin(image.naturalWidth, image.naturalHeight, PORTRAIT_THUMB_MAX_EDGE);

	const fullCanvas = drawScaledImage(image, fullSize.width, fullSize.height);
	const thumbCanvas = drawScaledImage(image, thumbSize.width, thumbSize.height);

	const [fullBuffer, thumbBuffer] = await Promise.all([
		canvasToBlob(fullCanvas, mime_type, PORTRAIT_FULL_QUALITY),
		canvasToBlob(thumbCanvas, mime_type, PORTRAIT_THUMB_QUALITY)
	]);

	return {
		mime_type,
		portrait_width: fullSize.width,
		portrait_height: fullSize.height,
		thumb_width: thumbSize.width,
		thumb_height: thumbSize.height,
		fullBuffer,
		thumbBuffer
	};
}
