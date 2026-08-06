<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { normalizeImageSource, type ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		file?: File | null;
		onConfirm?: (result: ImageUploadResult) => void | Promise<void>;
		onCancel?: () => void;
	};

	let {
		open = $bindable(false),
		title = 'Upload image',
		description = 'Optionally note where this image came from — a URL, artist name, or other credit.',
		confirmLabel = 'Use image',
		file = null,
		onConfirm,
		onCancel
	}: Props = $props();

	let pickedFile = $state<File | null>(null);
	let imageSource = $state('');
	let previewUrl = $state<string | null>(null);
	let confirmed = $state(false);
	let submitting = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	const fieldId = `image-upload-${crypto.randomUUID()}`;

	const activeFile = $derived(file ?? pickedFile);

	let wasOpen = $state(false);

	$effect(() => {
		if (open && !wasOpen) {
			confirmed = false;
			imageSource = '';
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
		const currentFile = activeFile;
		const isOpen = open;

		if (!isOpen || !currentFile) {
			previewUrl = null;
			return;
		}

		const url = URL.createObjectURL(currentFile);
		previewUrl = url;

		return () => {
			URL.revokeObjectURL(url);
		};
	});

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		pickedFile = input.files?.[0] ?? null;
	}

	async function handleConfirm(event: SubmitEvent) {
		event.preventDefault();
		if (!activeFile || submitting) return;

		confirmed = true;
		submitting = true;

		try {
			await onConfirm?.({
				file: activeFile,
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

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen && !confirmed) {
			onCancel?.();
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-stacked-overlay" />
		<Dialog.Content class="dialog-stacked">
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}

			<form class="upload-form" onsubmit={handleConfirm}>
				{#if !file}
					<div class="field">
						<Label.Root for="{fieldId}_file">Image file</Label.Root>
						<input
							id="{fieldId}_file"
							bind:this={fileInput}
							type="file"
							accept="image/*"
							onchange={handleFileChange}
						/>
					</div>
				{/if}

				{#if previewUrl}
					<figure class="upload-preview">
						<img src={previewUrl} alt="" />
					</figure>
				{/if}

				<div class="field">
					<Label.Root for="{fieldId}_source">Image source (optional)</Label.Root>
					<input
						id="{fieldId}_source"
						bind:value={imageSource}
						placeholder="https://… or artist / book / notes"
						autocomplete="off"
					/>
				</div>

				<div class="dialog-footer">
					<Button.Root type="button" onclick={handleCancel} disabled={submitting}>Cancel</Button.Root>
					<Button.Root type="submit" data-variant="primary" disabled={!activeFile || submitting}>
						{submitting ? 'Uploading…' : confirmLabel}
					</Button.Root>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.upload-form {
		display: grid;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.upload-form .field {
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
