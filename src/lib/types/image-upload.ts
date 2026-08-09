export type ImageUploadResult = {
	file: File;
	imageSource: string | null;
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
