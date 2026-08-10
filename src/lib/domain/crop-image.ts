export type CropRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type NormalizedCropRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** Matches `--color-viewer-bg` used in the crop editor letterbox areas. */
export const CROP_LETTERBOX_FILL = '#111111';

/** Maps the crop viewport to source-image coordinates (may extend outside image bounds). */
export function computeCropRect(image: HTMLImageElement, viewport: HTMLElement): CropRect {
	const viewportRect = viewport.getBoundingClientRect();
	const imageRect = image.getBoundingClientRect();

	if (imageRect.width <= 0 || imageRect.height <= 0) {
		throw new Error('Image is not ready to crop');
	}

	const scale = image.naturalWidth / imageRect.width;

	return {
		x: (viewportRect.left - imageRect.left) * scale,
		y: (viewportRect.top - imageRect.top) * scale,
		width: viewportRect.width * scale,
		height: viewportRect.height * scale
	};
}

export function normalizeCropRect(image: HTMLImageElement, rect: CropRect): NormalizedCropRect {
	const width = Math.max(1, image.naturalWidth);
	const height = Math.max(1, image.naturalHeight);

	return {
		x: rect.x / width,
		y: rect.y / height,
		width: rect.width / width,
		height: rect.height / height
	};
}

export function parseCropRect(json: string | null | undefined): NormalizedCropRect | null {
	if (!json) return null;

	try {
		const parsed = JSON.parse(json) as Partial<NormalizedCropRect>;
		if (
			typeof parsed.x === 'number' &&
			typeof parsed.y === 'number' &&
			typeof parsed.width === 'number' &&
			typeof parsed.height === 'number'
		) {
			return parsed as NormalizedCropRect;
		}
	} catch {
		return null;
	}

	return null;
}

export function serializeCropRect(rect: NormalizedCropRect): string {
	return JSON.stringify(rect);
}

function intersectCropWithImage(
	image: HTMLImageElement,
	rect: CropRect
): { srcX: number; srcY: number; srcWidth: number; srcHeight: number; destX: number; destY: number } | null {
	const srcLeft = rect.x;
	const srcTop = rect.y;
	const srcRight = rect.x + rect.width;
	const srcBottom = rect.y + rect.height;

	const clipLeft = Math.max(0, srcLeft);
	const clipTop = Math.max(0, srcTop);
	const clipRight = Math.min(image.naturalWidth, srcRight);
	const clipBottom = Math.min(image.naturalHeight, srcBottom);

	const clipWidth = clipRight - clipLeft;
	const clipHeight = clipBottom - clipTop;

	if (clipWidth <= 0 || clipHeight <= 0) {
		return null;
	}

	return {
		srcX: clipLeft,
		srcY: clipTop,
		srcWidth: clipWidth,
		srcHeight: clipHeight,
		destX: clipLeft - srcLeft,
		destY: clipTop - srcTop
	};
}

function thumbOutputMimeType(preferred?: string): 'image/png' | 'image/webp' {
	if (preferred === 'image/png') return 'image/png';

	return 'image/webp';
}

function outputMimeType(preferred?: string): 'image/jpeg' | 'image/webp' | 'image/png' {
	if (preferred === 'image/png') return 'image/png';

	const canvas = document.createElement('canvas');
	return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

type CropExportOptions = {
	transparentLetterbox?: boolean;
};

export async function cropImageToFile(
	image: HTMLImageElement,
	viewport: HTMLElement,
	fileName: string,
	preferredMimeType?: string,
	options: CropExportOptions = {}
): Promise<File> {
	const rect = computeCropRect(image, viewport);
	const drawRegion = intersectCropWithImage(image, rect);

	if (!drawRegion) {
		throw new Error('Move and zoom the image so it fills the crop area');
	}

	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(rect.width));
	canvas.height = Math.max(1, Math.round(rect.height));

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Could not prepare crop canvas');
	}

	if (!options.transparentLetterbox) {
		context.fillStyle = CROP_LETTERBOX_FILL;
		context.fillRect(0, 0, canvas.width, canvas.height);
	}

	context.drawImage(
		image,
		drawRegion.srcX,
		drawRegion.srcY,
		drawRegion.srcWidth,
		drawRegion.srcHeight,
		drawRegion.destX,
		drawRegion.destY,
		drawRegion.srcWidth,
		drawRegion.srcHeight
	);

	const mimeType = options.transparentLetterbox
		? thumbOutputMimeType(preferredMimeType)
		: outputMimeType(preferredMimeType);
	const quality = mimeType === 'image/png' ? undefined : 0.92;

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(result) => {
				if (!result) {
					reject(new Error('Could not export cropped image'));
					return;
				}

				resolve(result);
			},
			mimeType,
			quality
		);
	});

	const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
	const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';

	return new File([blob], `${baseName}.${extension}`, { type: mimeType });
}

export function computeStartScale(
	cropFrame: HTMLElement,
	image: HTMLImageElement,
	mode: 'cover' | 'contain'
): number {
	const frameWidth = cropFrame.clientWidth;
	const frameHeight = cropFrame.clientHeight;
	const imageWidth = image.naturalWidth;
	const imageHeight = image.naturalHeight;

	if (frameWidth <= 0 || frameHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
		return 1;
	}

	const widthScale = frameWidth / imageWidth;
	const heightScale = frameHeight / imageHeight;

	return mode === 'cover' ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
}

export function computeCoverScale(viewport: HTMLElement, image: HTMLImageElement): number {
	return computeStartScale(viewport, image, 'cover');
}

export function computeContainScale(viewport: HTMLElement, image: HTMLImageElement): number {
	return computeStartScale(viewport, image, 'contain');
}

/** How far below "contain" users can zoom out for finer repositioning. */
export const MIN_SCALE_BELOW_CONTAIN_FACTOR = 0.85;

export function computeMinScale(viewport: HTMLElement, image: HTMLImageElement): number {
	return computeContainScale(viewport, image) * MIN_SCALE_BELOW_CONTAIN_FACTOR;
}

type PanzoomView = {
	zoom: (scale: number, options?: { animate?: boolean; force?: boolean }) => void;
	pan: (x: number, y: number, options?: { animate?: boolean; force?: boolean }) => void;
	getScale: () => number;
	getPan: () => { x: number; y: number };
	setOptions?: (options: { startX?: number; startY?: number; startScale?: number }) => void;
};

function syncPanzoomDefaults(panzoom: PanzoomView): void {
	const pan = panzoom.getPan();
	panzoom.setOptions?.({
		startX: pan.x,
		startY: pan.y,
		startScale: panzoom.getScale()
	});
}

/** Restore pan/zoom so the crop frame matches a previously saved rect. */
export function applySavedCropView(
	panzoom: PanzoomView,
	image: HTMLImageElement,
	cropFrame: HTMLElement,
	saved: NormalizedCropRect
): void {
	if (saved.width <= 0 || saved.height <= 0 || image.naturalWidth <= 0) {
		return;
	}

	const targetScale = cropFrame.clientWidth / (saved.width * image.naturalWidth);
	panzoom.zoom(targetScale, { animate: false, force: true });

	const cropRect = cropFrame.getBoundingClientRect();
	const imageRect = image.getBoundingClientRect();
	const scale = panzoom.getScale();
	const pan = panzoom.getPan();
	const targetImageLeft = cropRect.left - saved.x * imageRect.width;
	const targetImageTop = cropRect.top - saved.y * imageRect.height;

	panzoom.pan(
		pan.x + (targetImageLeft - imageRect.left) / scale,
		pan.y + (targetImageTop - imageRect.top) / scale,
		{ force: true, animate: false }
	);
}

export function centerImageInCropFrame(
	panzoom: PanzoomView,
	cropFrame: HTMLElement,
	image: HTMLImageElement
): void {
	const scale = panzoom.getScale();
	const cropRect = cropFrame.getBoundingClientRect();
	const imageRect = image.getBoundingClientRect();
	const deltaX = cropRect.left + cropRect.width / 2 - (imageRect.left + imageRect.width / 2);
	const deltaY = cropRect.top + cropRect.height / 2 - (imageRect.top + imageRect.height / 2);
	const pan = panzoom.getPan();
	const nextX = pan.x + deltaX / scale;
	const nextY = pan.y + deltaY / scale;

	panzoom.pan(nextX, nextY, { force: true, animate: false });
}

/** Run after Panzoom's own init timeout so pan/zoom are not reset. */
export function finalizeCropView(
	panzoom: PanzoomView,
	image: HTMLImageElement,
	cropFrame: HTMLElement,
	saved: NormalizedCropRect | null | undefined
): void {
	if (saved) {
		applySavedCropView(panzoom, image, cropFrame, saved);
	} else {
		centerImageInCropFrame(panzoom, cropFrame, image);
	}

	syncPanzoomDefaults(panzoom);
}

export function waitForCropFrameLayout(cropFrame: HTMLElement): Promise<void> {
	return new Promise((resolve) => {
		const check = () => {
			if (cropFrame.clientWidth > 0 && cropFrame.clientHeight > 0) {
				resolve();
				return;
			}

			requestAnimationFrame(check);
		};

		check();
	});
}

export function computeCoverCropRect(
	imageWidth: number,
	imageHeight: number,
	aspectRatio: number
): NormalizedCropRect {
	const imageAspect = imageWidth / imageHeight;

	if (imageAspect > aspectRatio) {
		const cropWidth = imageHeight * aspectRatio;
		return {
			x: (imageWidth - cropWidth) / 2 / imageWidth,
			y: 0,
			width: cropWidth / imageWidth,
			height: 1
		};
	}

	const cropHeight = imageWidth / aspectRatio;
	return {
		x: 0,
		y: (imageHeight - cropHeight) / 2 / imageHeight,
		width: 1,
		height: cropHeight / imageHeight
	};
}

export async function cropImageRectToFile(
	image: HTMLImageElement,
	cropRect: NormalizedCropRect,
	fileName: string,
	preferredMimeType?: string
): Promise<File> {
	const rect: CropRect = {
		x: cropRect.x * image.naturalWidth,
		y: cropRect.y * image.naturalHeight,
		width: cropRect.width * image.naturalWidth,
		height: cropRect.height * image.naturalHeight
	};

	const drawRegion = intersectCropWithImage(image, rect);
	if (!drawRegion) {
		throw new Error('Could not derive thumbnail crop from image');
	}

	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(rect.width));
	canvas.height = Math.max(1, Math.round(rect.height));

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Could not prepare crop canvas');
	}

	context.drawImage(
		image,
		drawRegion.srcX,
		drawRegion.srcY,
		drawRegion.srcWidth,
		drawRegion.srcHeight,
		drawRegion.destX,
		drawRegion.destY,
		drawRegion.srcWidth,
		drawRegion.srcHeight
	);

	const mimeType = thumbOutputMimeType(preferredMimeType);
	const quality = mimeType === 'image/png' ? undefined : 0.92;

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(result) => {
				if (!result) {
					reject(new Error('Could not export cropped image'));
					return;
				}

				resolve(result);
			},
			mimeType,
			quality
		);
	});

	const extension = mimeType === 'image/png' ? 'png' : 'webp';
	const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';

	return new File([blob], `${baseName}.${extension}`, { type: mimeType });
}
