export type ImageUploadResult = {
	file: File;
	imageSource: string | null;
};

export function normalizeImageSource(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}
