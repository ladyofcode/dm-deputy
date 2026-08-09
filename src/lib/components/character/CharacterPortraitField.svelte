<script lang="ts">
	import { getCharacterById } from '$lib/data';
	import { getCharacterPortraitObjectUrl } from '$lib/data/character-blob-cache';
	import { getCharacterPresentationObjectUrl } from '$lib/data/character-presentation-blob-cache';
	import {
		getCharacterMediaSourcePersist,
		getCharacterMediaUploadPersist
	} from '$lib/domain/character-media';
	import LinkIcon from '$lib/components/icons/LinkIcon.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import ImageUploadDialog from '$lib/components/shared/ImageUploadDialog.svelte';
	import { createBlobPreview } from '$lib/stores/blob-preview.svelte';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { Label } from 'bits-ui';
	import { normalizeImageSource, type ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		variant?: 'portrait' | 'presentation';
		characterId?: string;
		file?: File | null;
		imageSource?: string | null;
		disabled?: boolean;
		readOnly?: boolean;
		onFileChange?: (result: ImageUploadResult) => void;
	};

	let {
		variant = 'portrait',
		characterId,
		file = $bindable(null),
		imageSource = $bindable(null),
		disabled = false,
		readOnly = false,
		onFileChange
	}: Props = $props();

	let savedImageUrl = $state<string | null>(null);
	let uploadDialogOpen = $state(false);
	let sourceDialogOpen = $state(false);
	let sourceDraft = $state('');
	let submittingSource = $state(false);
	let uploading = $state(false);
	let savingSource = $state(false);
	const sourceFieldId = `image-source-${crypto.randomUUID()}`;
	let sourceDialogWasOpen = $state(false);

	const blobPreview = createBlobPreview(() => file);
	const previewUrl = $derived(blobPreview.url);
	const displayUrl = $derived(previewUrl ?? savedImageUrl);
	const uploadTitle = $derived(
		variant === 'presentation' ? 'Upload presentation image' : 'Upload portrait'
	);
	const sourceDialogTitle = $derived(
		variant === 'presentation' ? 'Presentation image source' : 'Portrait image source'
	);
	const emptyLabel = $derived(variant === 'presentation' ? 'Upload image' : 'Upload');
	const changeLabel = $derived(
		variant === 'presentation' ? 'Change presentation image' : 'Change portrait'
	);
	const sourceButtonLabel = $derived(
		imageSource?.trim() ? 'Edit image source' : 'Set image source'
	);
	const hasImageSource = $derived(Boolean(imageSource?.trim()));

	$effect(() => {
		if (!characterId || file) return;

		trackCampaignCharactersRevision();
		const character = getCharacterById(characterId);
		if (!character) return;

		imageSource =
			variant === 'presentation' ? character.presentation_image_source : character.image_source;
	});

	$effect(() => {
		if (!characterId || file) {
			savedImageUrl = null;
			return;
		}

		let cancelled = false;
		const loadUrl =
			variant === 'presentation'
				? getCharacterPresentationObjectUrl(characterId, 'full')
				: getCharacterPortraitObjectUrl(characterId, 'full');

		void loadUrl.then((url) => {
			if (!cancelled) {
				savedImageUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	function openUploadDialog() {
		if (disabled || uploading || savingSource) return;
		uploadDialogOpen = true;
	}

	function openSourceDialog() {
		if (disabled || uploading || savingSource) return;
		sourceDialogOpen = true;
	}

	async function handleUploadConfirm(result: ImageUploadResult) {
		imageSource = result.imageSource;
		onFileChange?.(result);

		if (characterId) {
			uploading = true;
			try {
				await getCharacterMediaUploadPersist(variant)(characterId, result.file, result.imageSource);
				file = null;
				const reloadUrl =
					variant === 'presentation'
						? getCharacterPresentationObjectUrl(characterId, 'full')
						: getCharacterPortraitObjectUrl(characterId, 'full');
				savedImageUrl = await reloadUrl;
			} catch {
				file = result.file;
			} finally {
				uploading = false;
			}
			return;
		}

		file = result.file;
	}

	$effect(() => {
		if (sourceDialogOpen && !sourceDialogWasOpen) {
			sourceDraft = imageSource ?? '';
		}

		sourceDialogWasOpen = sourceDialogOpen;
	});

	async function handleSourceSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submittingSource) return;

		submittingSource = true;
		try {
			await handleSourceConfirm(normalizeImageSource(sourceDraft));
			sourceDialogOpen = false;
		} finally {
			submittingSource = false;
		}
	}

	async function handleSourceConfirm(nextSource: string | null) {
		imageSource = nextSource;

		if (!characterId) return;

		savingSource = true;
		try {
			await getCharacterMediaSourcePersist(variant)(characterId, nextSource);
		} finally {
			savingSource = false;
		}
	}
</script>

<div class="portrait-field">
	<div class="portrait-frame">
		{#if readOnly}
			{#if displayUrl}
				<div class="portrait-preview portrait-preview-readonly">
					<img src={displayUrl} alt="" />
				</div>
			{:else}
				<div
					class="portrait-preview portrait-preview-empty portrait-preview-readonly"
					aria-hidden="true"
				>
					—
				</div>
			{/if}
		{:else if displayUrl}
			<button
				type="button"
				class="portrait-preview"
				disabled={disabled || uploading || savingSource}
				aria-label={changeLabel}
				onclick={openUploadDialog}
			>
				<img src={displayUrl} alt="" />
			</button>
		{:else}
			<button
				type="button"
				class="portrait-preview portrait-preview-empty"
				disabled={disabled || uploading || savingSource}
				aria-label={uploadTitle}
				onclick={openUploadDialog}
			>
				{uploading ? 'Uploading…' : emptyLabel}
			</button>
		{/if}

		{#if !readOnly}
			<div class="portrait-source-row">
				<button
					type="button"
					class="portrait-source-button"
					class:portrait-source-button-set={hasImageSource}
					disabled={disabled || uploading || savingSource}
					aria-label={sourceButtonLabel}
					title={sourceButtonLabel}
					onclick={openSourceDialog}
				>
					<LinkIcon size={14} />
				</button>
			</div>
		{/if}
	</div>
</div>

<ImageUploadDialog
	bind:open={uploadDialogOpen}
	title={uploadTitle}
	cropAspectRatio={4 / 5}
	onConfirm={handleUploadConfirm}
/>

<AppDialog
	bind:open={sourceDialogOpen}
	title={sourceDialogTitle}
	description="Note where this image came from — a URL, artist name, or other credit."
	stacked
>
	<form class="source-form" onsubmit={handleSourceSubmit}>
		<div class="field">
			<Label.Root for={sourceFieldId}>Image source (optional)</Label.Root>
			<input
				id={sourceFieldId}
				bind:value={sourceDraft}
				placeholder="https://… or artist / book / notes"
				autocomplete="off"
			/>
		</div>

		<DialogFormFooter
			submitLabel={submittingSource ? 'Saving…' : 'Save source'}
			pending={submittingSource}
		/>
	</form>
</AppDialog>

<style>
	.portrait-field {
		flex-shrink: 0;
		width: min(100%, 20rem);
	}

	.portrait-frame {
		display: grid;
		gap: 0.35rem;
		width: 100%;
	}

	.portrait-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 20rem;
		aspect-ratio: 4 / 5;
		height: auto;
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

	.portrait-preview-readonly {
		cursor: default;
	}

	.portrait-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.portrait-source-row {
		display: flex;
		justify-content: flex-end;
	}

	.portrait-source-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		padding: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text-muted);
		box-shadow: 0 1px 3px var(--color-shadow);
		cursor: pointer;
	}

	.portrait-source-button::before {
		content: '';
		position: absolute;
		inset: -0.875rem;
	}

	.portrait-source-button:hover:not(:disabled),
	.portrait-source-button-set {
		color: var(--color-accent);
	}

	.portrait-source-button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.portrait-source-button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.source-form {
		display: grid;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.source-form .field {
		margin-bottom: 0;
	}
</style>
