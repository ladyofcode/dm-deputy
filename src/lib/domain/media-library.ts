export function isUploadedTemplateImageUrl(imageUrl: string | null | undefined): boolean {
	return Boolean(imageUrl?.trim().startsWith('data:'));
}

export function formatMediaDimensions(
	width: number | null | undefined,
	height: number | null | undefined
): string | null {
	if (!width || !height) return null;
	return `${width}×${height}`;
}

export function isLikelyHttpUrl(value: string): boolean {
	return /^https?:\/\//i.test(value.trim());
}
