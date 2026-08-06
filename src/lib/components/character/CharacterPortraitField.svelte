<script lang="ts">
	import { getCharacterPortraitObjectUrl } from '$lib/data/character-blob-cache';
	import { persistCharacterPortrait } from '$lib/data/writes';
	import ImageUploadDialog from '$lib/components/shared/ImageUploadDialog.svelte';
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		characterId?: string;
		portraitFile?: File | null;
		portraitImageSource?: string | null;
		disabled?: boolean;
		onPortraitFileChange?: (result: ImageUploadResult) => void;
	};

	let {
		characterId,
		portraitFile = $bindable(null),
		portraitImageSource = $bindable(null),
		disabled = false,
		onPortraitFileChange
	}: Props = $props();

	let previewUrl = $state<string | null>(null);
	let savedPortraitUrl = $state<string | null>(null);
	let uploadDialogOpen = $state(false);
	let uploading = $state(false);

	const displayUrl = $derived(previewUrl ?? savedPortraitUrl);

	$effect(() => {
		const file = portraitFile;

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

	$effect(() => {
		if (!characterId || portraitFile) {
			savedPortraitUrl = null;
			return;
		}

		let cancelled = false;

		void getCharacterPortraitObjectUrl(characterId, 'full').then((url) => {
			if (!cancelled) {
				savedPortraitUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	function openUploadDialog() {
		if (disabled || uploading) return;
		uploadDialogOpen = true;
	}

	async function handleUploadConfirm(result: ImageUploadResult) {
		portraitImageSource = result.imageSource;
		onPortraitFileChange?.(result);

		if (characterId) {
			uploading = true;
			try {
				await persistCharacterPortrait(characterId, result.file, result.imageSource);
				portraitFile = null;
				savedPortraitUrl = await getCharacterPortraitObjectUrl(characterId, 'full');
			} catch {
				portraitFile = result.file;
			} finally {
				uploading = false;
			}
			return;
		}

		portraitFile = result.file;
	}
</script>

<div class="portrait-field">
	{#if displayUrl}
		<button
			type="button"
			class="portrait-preview"
			disabled={disabled || uploading}
			aria-label="Change portrait"
			onclick={openUploadDialog}
		>
			<img src={displayUrl} alt="" />
		</button>
	{:else}
		<button
			type="button"
			class="portrait-preview portrait-preview-empty"
			disabled={disabled || uploading}
			aria-label="Upload portrait"
			onclick={openUploadDialog}
		>
			{uploading ? 'Uploading…' : 'Upload'}
		</button>
	{/if}
</div>

<ImageUploadDialog
	bind:open={uploadDialogOpen}
	title="Upload portrait"
	onConfirm={handleUploadConfirm}
/>

<style>
	.portrait-field {
		flex-shrink: 0;
	}

	.portrait-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 8rem;
		height: 10rem;
		padding: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		overflow: hidden;
		cursor: pointer;
		font: inherit;
		color: var(--color-text-muted);
	}

	.portrait-preview-empty {
		border-style: dashed;
	}

	.portrait-preview:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.portrait-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
