export const MAP_FULL_MAX_EDGE = 2400;
export const MAP_THUMB_MAX_EDGE = 320;
export const MAP_FULL_QUALITY = 0.88;
export const MAP_THUMB_QUALITY = 0.82;

export type ProcessedMapImage = {
	mime_type: 'image/jpeg' | 'image/webp';
	full_width: number;
	full_height: number;
	thumb_width: number;
	thumb_height: number;
	fullBuffer: ArrayBuffer;
	thumbBuffer: ArrayBuffer;
};

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
	mimeType: 'image/jpeg' | 'image/webp',
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

function outputMimeType(): 'image/jpeg' | 'image/webp' {
	const canvas = document.createElement('canvas');
	return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

export async function processMapUpload(file: File): Promise<ProcessedMapImage> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Choose an image file');
	}

	const image = await loadImageFromFile(file);
	const mime_type = outputMimeType();
	const fullSize = fitWithin(image.naturalWidth, image.naturalHeight, MAP_FULL_MAX_EDGE);
	const thumbSize = fitWithin(image.naturalWidth, image.naturalHeight, MAP_THUMB_MAX_EDGE);

	const fullCanvas = drawScaledImage(image, fullSize.width, fullSize.height);
	const thumbCanvas = drawScaledImage(image, thumbSize.width, thumbSize.height);

	const [fullBuffer, thumbBuffer] = await Promise.all([
		canvasToBlob(fullCanvas, mime_type, MAP_FULL_QUALITY),
		canvasToBlob(thumbCanvas, mime_type, MAP_THUMB_QUALITY)
	]);

	return {
		mime_type,
		full_width: fullSize.width,
		full_height: fullSize.height,
		thumb_width: thumbSize.width,
		thumb_height: thumbSize.height,
		fullBuffer,
		thumbBuffer
	};
}
