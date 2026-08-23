<script lang="ts">
	import { Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import ImageAttributionField from '$lib/components/shared/ImageAttributionField.svelte';
	import ImageCropEditor from '$lib/components/shared/ImageCropEditor.svelte';
	import MediaLibraryTile from '$lib/components/library/MediaLibraryTile.svelte';
	import { getMediaLibraryFullUrl } from '$lib/data/media-library-blob-cache';
	import { loadMediaLibrarySnapshot } from '$lib/db/client';
	import { database } from '$lib/stores/database.svelte';
	import { createBlobPreview } from '$lib/stores/blob-preview.svelte';
	import { getMediaAssetLabel, type MediaAsset } from '$lib/domain/media-asset';
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
		allowLibraryPick?: boolean;
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
		allowLibraryPick = true,
		onConfirm,
		onCancel
	}: Props = $props();

	type SourceMode = 'upload' | 'library';

	let pickedFile = $state<File | null>(null);
	let sourceMode = $state<SourceMode>('upload');
	let libraryItems = $state<MediaAsset[]>([]);
	let libraryLoading = $state(false);
	let libraryError = $state<string | null>(null);
	let selectedLibraryItem = $state<MediaAsset | null>(null);
	let libraryPreviewUrl = $state<string | null>(null);
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
	const usesCrop = $derived(
		Boolean(cropAspectRatio && (activeFile || cropSourceUrl || libraryPreviewUrl))
	);
	const blobPreview = createBlobPreview(() => (open && activeFile ? activeFile : null));
	const previewUrl = $derived(blobPreview.url);
	const cropEditorUrl = $derived(previewUrl ?? cropSourceUrl ?? libraryPreviewUrl);
	const canSubmit = $derived(
		Boolean(activeFile || selectedLibraryItem || (usesCrop && cropSourceUrl))
	);
	const cropStartScaleMode = $derived<'cover' | 'contain'>(
		activeFile ? 'cover' : cropSourceUrl || libraryPreviewUrl ? 'contain' : 'cover'
	);
	const effectiveInitialCropRect = $derived(
		activeFile || selectedLibraryItem ? null : initialCropRect
	);
	const dialogDescription = $derived(
		usesCrop
			? 'Drag the image behind the frame to choose the thumbnail crop. Pick a new file to replace the original, or zoom to fit the whole image inside the frame.'
			: description
	);
	const showLibrary = $derived(allowLibraryPick && database.isReady);

	let wasOpen = $state(false);

	$effect(() => {
		if (open && !wasOpen) {
			confirmed = false;
			sourceMode = 'upload';
			selectedLibraryItem = null;
			libraryPreviewUrl = null;
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

	$effect(() => {
		if (!open || !showLibrary || sourceMode !== 'library') return;

		let cancelled = false;
		libraryLoading = true;
		libraryError = null;

		void loadMediaLibrarySnapshot(true)
			.then((items) => {
				if (!cancelled) libraryItems = items;
			})
			.catch((error) => {
				if (!cancelled) {
					libraryError = error instanceof Error ? error.message : String(error);
				}
			})
			.finally(() => {
				if (!cancelled) libraryLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!selectedLibraryItem) {
			libraryPreviewUrl = null;
			return;
		}

		let cancelled = false;

		void getMediaLibraryFullUrl(selectedLibraryItem.media_id).then((url) => {
			if (!cancelled) libraryPreviewUrl = url;
		});

		return () => {
			cancelled = true;
		};
	});

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		pickedFile = input.files?.[0] ?? null;
		selectedLibraryItem = null;
		libraryPreviewUrl = null;
		sourceMode = 'upload';
	}

	function handleLibrarySelect(item: MediaAsset) {
		selectedLibraryItem = item;
		pickedFile = null;
		if (fileInput) {
			fileInput.value = '';
		}

		imageSource = item.image_source?.trim() ?? '';
	}

	function resolveImageSource(): string | null {
		if (selectedLibraryItem) {
			return normalizeImageSource(imageSource.trim() || selectedLibraryItem.image_source);
		}

		return normalizeImageSource(imageSource);
	}

	async function handleConfirm(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit || submitting) return;

		confirmed = true;
		submitting = true;

		try {
			const reCropOnly = !activeFile && !selectedLibraryItem && Boolean(cropSourceUrl);
			const outputFile =
				usesCrop && cropEditor ? await cropEditor.exportCroppedFile() : (activeFile ?? undefined);
			const thumbCropRect = usesCrop && cropEditor ? cropEditor.exportCropRect() : null;

			await onConfirm?.({
				file: outputFile,
				originalFile: activeFile,
				thumbCropRect,
				reCropOnly,
				imageSource: resolveImageSource(),
				existingMediaId: selectedLibraryItem?.media_id ?? null
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
	wide
	onOpenChange={(isOpen) => {
		if (!isOpen && !confirmed) {
			onCancel?.();
		}
	}}
>
	<form class="upload-dialog-form" onsubmit={handleConfirm}>
		{#if showLibrary}
			<div class="source-tabs" role="tablist" aria-label="Image source">
				<button
					type="button"
					class="source-tab"
					class:source-tab-active={sourceMode === 'upload'}
					role="tab"
					aria-selected={sourceMode === 'upload'}
					onclick={() => {
						sourceMode = 'upload';
					}}
				>
					Upload new
				</button>
				<button
					type="button"
					class="source-tab"
					class:source-tab-active={sourceMode === 'library'}
					role="tab"
					aria-selected={sourceMode === 'library'}
					onclick={() => {
						sourceMode = 'library';
					}}
				>
					Choose from library
				</button>
			</div>
		{/if}

		{#if sourceMode === 'library' && showLibrary}
			<div class="library-panel">
				{#if libraryLoading}
					<p class="library-status">Loading library…</p>
				{:else if libraryError}
					<p class="library-status">{libraryError}</p>
				{:else if libraryItems.length === 0}
					<p class="library-status">No images in your library yet. Upload one first.</p>
				{:else}
					<div class="library-grid">
						{#each libraryItems as item (item.media_id)}
							<div class:library-item-selected={selectedLibraryItem?.media_id === item.media_id}>
								<MediaLibraryTile {item} onSelect={handleLibrarySelect} />
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
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
		{/if}

		{#if cropEditorUrl && usesCrop && cropAspectRatio}
			{#key `${cropEditorUrl}:${activeFile ? 'replace' : selectedLibraryItem ? 'library' : 'recrop'}`}
				<ImageCropEditor
					bind:this={cropEditor}
					imageUrl={cropEditorUrl}
					fileName={activeFile?.name ??
						(selectedLibraryItem ? getMediaAssetLabel(selectedLibraryItem) : 'image.jpg')}
					mimeType={activeFile?.type ?? selectedLibraryItem?.mime_type ?? undefined}
					aspectRatio={cropAspectRatio}
					startScaleMode={cropStartScaleMode}
					initialCropRect={effectiveInitialCropRect}
				/>
			{/key}
		{:else if previewUrl}
			<figure class="upload-preview">
				<img src={previewUrl} alt="" />
			</figure>
		{:else if libraryPreviewUrl && selectedLibraryItem && !usesCrop}
			<figure class="upload-preview">
				<img src={libraryPreviewUrl} alt="" />
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

	.source-tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.source-tab {
		flex: 1;
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font: inherit;
	}

	.source-tab-active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
	}

	.library-panel {
		margin-bottom: 0.75rem;
	}

	.library-status {
		margin: 0;
		padding: 0.75rem;
		color: var(--color-text-muted);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
	}

	.library-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 0.5rem;
		max-height: 16rem;
		overflow-y: auto;
		padding: 0.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.library-item-selected :global(.media-tile) {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 35%, transparent);
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
