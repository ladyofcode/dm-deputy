export function createBlobPreview(getFile: () => File | null): {
	readonly url: string | null;
} {
	let previewUrl = $state<string | null>(null);

	$effect(() => {
		const file = getFile();

		if (!file) {
			previewUrl = null;
			return;
		}

		const url = URL.createObjectURL(file);
		previewUrl = url;

		return () => {
			URL.revokeObjectURL(url);
		};
	});

	return {
		get url() {
			return previewUrl;
		}
	};
}

export function revokeBlobPreviewUrl(url: string | null | undefined): void {
	if (url) {
		URL.revokeObjectURL(url);
	}
}
