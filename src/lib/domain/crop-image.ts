export type CropRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function computeCropRect(image: HTMLImageElement, viewport: HTMLElement): CropRect {
	const viewportRect = viewport.getBoundingClientRect();
	const imageRect = image.getBoundingClientRect();

	if (imageRect.width <= 0 || imageRect.height <= 0) {
		throw new Error('Image is not ready to crop');
	}

	const scaleX = image.naturalWidth / imageRect.width;
	const scaleY = image.naturalHeight / imageRect.height;

	const left = Math.max(viewportRect.left, imageRect.left);
	const top = Math.max(viewportRect.top, imageRect.top);
	const right = Math.min(viewportRect.right, imageRect.right);
	const bottom = Math.min(viewportRect.bottom, imageRect.bottom);

	const cropDisplayWidth = right - left;
	const cropDisplayHeight = bottom - top;

	if (cropDisplayWidth <= 0 || cropDisplayHeight <= 0) {
		throw new Error('Move and zoom the image so it fills the crop area');
	}

	return {
		x: (left - imageRect.left) * scaleX,
		y: (top - imageRect.top) * scaleY,
		width: cropDisplayWidth * scaleX,
		height: cropDisplayHeight * scaleY
	};
}

function outputMimeType(preferred?: string): 'image/jpeg' | 'image/webp' | 'image/png' {
	if (preferred === 'image/png') return 'image/png';

	const canvas = document.createElement('canvas');
	return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

export async function cropImageToFile(
	image: HTMLImageElement,
	viewport: HTMLElement,
	fileName: string,
	preferredMimeType?: string
): Promise<File> {
	const rect = computeCropRect(image, viewport);
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(rect.width));
	canvas.height = Math.max(1, Math.round(rect.height));

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Could not prepare crop canvas');
	}

	context.drawImage(
		image,
		rect.x,
		rect.y,
		rect.width,
		rect.height,
		0,
		0,
		canvas.width,
		canvas.height
	);

	const mimeType = outputMimeType(preferredMimeType);
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

export function computeCoverScale(viewport: HTMLElement, image: HTMLImageElement): number {
	const viewportWidth = viewport.clientWidth;
	const viewportHeight = viewport.clientHeight;
	const imageWidth = image.naturalWidth;
	const imageHeight = image.naturalHeight;

	if (viewportWidth <= 0 || viewportHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
		return 1;
	}

	return Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

export function computeContainScale(viewport: HTMLElement, image: HTMLImageElement): number {
	const viewportWidth = viewport.clientWidth;
	const viewportHeight = viewport.clientHeight;
	const imageWidth = image.naturalWidth;
	const imageHeight = image.naturalHeight;

	if (viewportWidth <= 0 || viewportHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
		return 1;
	}

	return Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

/** How far below "contain" users can zoom out for finer repositioning. */
export const MIN_SCALE_BELOW_CONTAIN_FACTOR = 0.85;

export function computeMinScale(viewport: HTMLElement, image: HTMLImageElement): number {
	return computeContainScale(viewport, image) * MIN_SCALE_BELOW_CONTAIN_FACTOR;
}
