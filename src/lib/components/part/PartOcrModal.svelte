<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button, Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import ImageUploadDialog from '$lib/components/shared/ImageUploadDialog.svelte';
	import { recognizeImage, terminateOcrWorker, type OcrProgress } from '$lib/ocr/recognize';
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		open?: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	let selectedFile = $state<File | null>(null);
	let imageSource = $state<string | null>(null);
	let pendingFile = $state<File | null>(null);
	let uploadDialogOpen = $state(false);
	let previewUrl = $state<string | null>(null);
	let extractedText = $state('');
	let processing = $state(false);
	let progress = $state<OcrProgress | null>(null);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let resultTextarea = $state<HTMLTextAreaElement | null>(null);
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

	function clearCopiedFeedback() {
		if (copiedTimeout) {
			clearTimeout(copiedTimeout);
			copiedTimeout = null;
		}

		copied = false;
	}

	function resetState() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		selectedFile = null;
		imageSource = null;
		pendingFile = null;
		previewUrl = null;
		extractedText = '';
		processing = false;
		progress = null;
		error = null;
		clearCopiedFeedback();

		if (fileInput) {
			fileInput.value = '';
		}
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		pendingFile = file;
		uploadDialogOpen = true;
	}

	function clearFileInput() {
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function handleUploadConfirm(result: ImageUploadResult) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		selectedFile = result.file;
		imageSource = result.imageSource;
		previewUrl = URL.createObjectURL(result.file);
		pendingFile = null;
		extractedText = '';
		error = null;
		progress = null;
		clearCopiedFeedback();
	}

	function handleUploadCancel() {
		pendingFile = null;
		clearFileInput();
	}

	async function handleRecognize() {
		if (!selectedFile || processing) return;

		processing = true;
		error = null;
		extractedText = '';
		progress = { status: 'loading', progress: 0 };

		try {
			extractedText = await recognizeImage(selectedFile, (nextProgress) => {
				progress = nextProgress;
			});
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not read text from image');
		} finally {
			processing = false;
			progress = null;
		}
	}

	async function handleCopy() {
		if (!extractedText || !resultTextarea) return;

		resultTextarea.focus();
		resultTextarea.select();

		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(extractedText);
			} else {
				document.execCommand('copy');
			}

			clearCopiedFeedback();
			copied = true;
			copiedTimeout = setTimeout(() => {
				copied = false;
				copiedTimeout = null;
			}, 2000);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not copy text');
		}
	}

	const progressLabel = $derived.by(() => {
		if (!progress) return '';

		if (progress.status === 'recognizing text') {
			return `Recognizing text… ${Math.round(progress.progress * 100)}%`;
		}

		return progress.status.replace(/_/g, ' ');
	});
</script>

<AppDialog
	bind:open
	title="Scan text from image"
	wide
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			void terminateOcrWorker();
			resetState();
		}
	}}
>
	<form
		class="ocr-form"
		onsubmit={(event) => {
			event.preventDefault();
			void handleRecognize();
		}}
	>
		<div class="field">
			<Label.Root for="part_ocr_file">Image file</Label.Root>
			<input
				id="part_ocr_file"
				bind:this={fileInput}
				type="file"
				accept="image/*"
				onchange={handleFileChange}
				disabled={processing}
			/>
		</div>

		{#if previewUrl}
			<figure class="ocr-preview">
				<img src={previewUrl} alt="" />
			</figure>
		{/if}

		{#if imageSource}
			<p class="ocr-source">Source: {imageSource}</p>
		{/if}

		{#if progressLabel}
			<p class="ocr-progress" aria-live="polite">{progressLabel}</p>
		{/if}

		{#if error}
			<p class="hint">{error}</p>
		{/if}

		{#if extractedText}
			<div class="field">
				<Label.Root for="part_ocr_result">Extracted text</Label.Root>
				<textarea
					id="part_ocr_result"
					bind:this={resultTextarea}
					bind:value={extractedText}
					rows="10"
					readonly
				></textarea>
			</div>
		{/if}

		<div class="dialog-footer">
			<Button.Root type="button" disabled={processing} onclick={() => (open = false)}>
				Close
			</Button.Root>
			{#if extractedText}
				<Button.Root type="button" onclick={handleCopy}>
					{copied ? 'Copied!' : 'Copy text'}
				</Button.Root>
			{/if}
			<Button.Root type="submit" data-variant="primary" disabled={!selectedFile || processing}>
				{processing ? 'Processing…' : 'Run OCR'}
			</Button.Root>
		</div>
	</form>
</AppDialog>

<ImageUploadDialog
	bind:open={uploadDialogOpen}
	title="Upload image for OCR"
	file={pendingFile}
	onConfirm={handleUploadConfirm}
	onCancel={handleUploadCancel}
/>

<style>
	.ocr-form {
		display: grid;
		gap: var(--space-section);
	}

	.ocr-preview {
		margin: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: color-mix(in srgb, var(--color-bg) 88%, transparent);
	}

	.ocr-preview img {
		display: block;
		width: 100%;
		max-height: 14rem;
		object-fit: contain;
	}

	.ocr-progress {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		text-transform: capitalize;
	}

	.ocr-source {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		word-break: break-word;
	}

	textarea {
		font-family: var(--font-body);
	}
</style>
