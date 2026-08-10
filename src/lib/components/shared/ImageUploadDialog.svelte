<script lang="ts">
	import { Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import ImageAttributionField from '$lib/components/shared/ImageAttributionField.svelte';
	import ImageCropEditor from '$lib/components/shared/ImageCropEditor.svelte';
	import { createBlobPreview } from '$lib/stores/blob-preview.svelte';
	import { normalizeImageSource, type ImageUploadResult } from '$lib/types/image-upload';
	import type { NormalizedCropRect } from '$lib/domain/crop-image';

	type Props = {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		file?: File | null;
		cropSourceUrl?: string | null;
		existingImageSource?: string | null;
		initialCropRect?: NormalizedCropRect | null;
		cropAspectRatio?: number | null;
		onConfirm?: (result: ImageUploadResult) => void | Promise<void>;
		onCancel?: () => void;
	};

	let {
		open = $bindable(false),
		title = 'Upload image',
		description = 'Optionally note where this image came from — a URL, artist name, or other credit.',
		confirmLabel = 'Use image',
		file = null,
		cropSourceUrl = null,
		existingImageSource = null,
		initialCropRect = null,
		cropAspectRatio = null,
		onConfirm,
		onCancel
	}: Props = $props();

	let pickedFile = $state<File | null>(null);
	let imageSource = $state('');
	let confirmed = $state(false);
	let submitting = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let cropEditor = $state<{
		exportCroppedFile: () => Promise<File>;
		exportCropRect: () => import('$lib/domain/crop-image').NormalizedCropRect;
	} | null>(null);
	const fieldId = `image-upload-${crypto.randomUUID()}`;

	const activeFile = $derived(file ?? pickedFile);
	const usesCrop = $derived(Boolean(cropAspectRatio && (activeFile || cropSourceUrl)));
	const blobPreview = createBlobPreview(() => (open && activeFile ? activeFile : null));
	const previewUrl = $derived(blobPreview.url);
	const cropEditorUrl = $derived(previewUrl ?? cropSourceUrl);
	const canSubmit = $derived(Boolean(activeFile || (usesCrop && cropSourceUrl)));
	const cropStartScaleMode = $derived<'cover' | 'contain'>(
		activeFile ? 'cover' : cropSourceUrl ? 'contain' : 'cover'
	);
	const effectiveInitialCropRect = $derived(activeFile ? null : initialCropRect);
	const dialogDescription = $derived(
		usesCrop
			? 'Drag the image behind the frame to choose the thumbnail crop. Pick a new file to replace the original, or zoom to fit the whole image inside the frame.'
			: description
	);

	let wasOpen = $state(false);

	$effect(() => {
		if (open && !wasOpen) {
			confirmed = false;
			imageSource = existingImageSource ?? '';
			if (!file) {
				pickedFile = null;
				if (fileInput) {
					fileInput.value = '';
				}
			}
		}

		wasOpen = open;
	});

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		pickedFile = input.files?.[0] ?? null;
	}

	async function handleConfirm(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit || submitting) return;

		confirmed = true;
		submitting = true;

		try {
			const reCropOnly = !activeFile && Boolean(cropSourceUrl);
			const outputFile =
				usesCrop && cropEditor ? await cropEditor.exportCroppedFile() : activeFile!;
			const thumbCropRect = usesCrop && cropEditor ? cropEditor.exportCropRect() : null;

			await onConfirm?.({
				file: outputFile,
				originalFile: activeFile,
				thumbCropRect,
				reCropOnly,
				imageSource: normalizeImageSource(imageSource)
			});
			open = false;
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<AppDialog
	bind:open
	{title}
	description={dialogDescription}
	stacked
	onOpenChange={(isOpen) => {
		if (!isOpen && !confirmed) {
			onCancel?.();
		}
	}}
>
	<form class="panel-form upload-dialog-form" onsubmit={handleConfirm}>
		<div class="field">
			<Label.Root for="{fieldId}_file">
				{usesCrop && cropSourceUrl ? 'Replace image (optional)' : 'Image file'}
			</Label.Root>
			<input
				id="{fieldId}_file"
				bind:this={fileInput}
				type="file"
				accept="image/*"
				onchange={handleFileChange}
			/>
		</div>

		{#if cropEditorUrl && usesCrop && cropAspectRatio}
			{#key `${cropEditorUrl}:${activeFile ? 'replace' : 'recrop'}`}
				<ImageCropEditor
					bind:this={cropEditor}
					imageUrl={cropEditorUrl}
					fileName={activeFile?.name ?? 'image.jpg'}
					mimeType={activeFile?.type}
					aspectRatio={cropAspectRatio}
					startScaleMode={cropStartScaleMode}
					initialCropRect={effectiveInitialCropRect}
				/>
			{/key}
		{:else if previewUrl}
			<figure class="upload-preview">
				<img src={previewUrl} alt="" />
			</figure>
		{/if}

		<ImageAttributionField id="{fieldId}_source" bind:value={imageSource} />

		<DialogFormFooter
			submitLabel={submitting ? 'Uploading…' : confirmLabel}
			pending={submitting}
			disabled={!canSubmit}
			useDialogClose={false}
			onCancel={handleCancel}
		/>
	</form>
</AppDialog>

<style>
	.upload-dialog-form {
		margin-top: 0.75rem;
	}

	.upload-dialog-form .field {
		margin-bottom: 0;
	}

	.upload-preview {
		margin: 0;
	}

	.upload-preview img {
		display: block;
		width: 100%;
		max-height: 14rem;
		object-fit: contain;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
</style>
