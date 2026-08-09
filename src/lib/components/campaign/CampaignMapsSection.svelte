<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { Button } from 'bits-ui';
	import AddIcon from '$lib/components/icons/AddIcon.svelte';
	import CampaignMapListItem from '$lib/components/campaign/CampaignMapListItem.svelte';
	import EntitySection from '$lib/components/shared/EntitySection.svelte';
	import FormField from '$lib/components/shared/FormField.svelte';
	import ImageUploadDialog from '$lib/components/shared/ImageUploadDialog.svelte';
	import { persistCampaignMap, removeCampaignMap } from '$lib/data/writes';
	import { createBlobPreview, revokeBlobPreviewUrl } from '$lib/stores/blob-preview.svelte';
	import { getReactiveCampaignMapsForCampaign } from '$lib/stores/campaign-maps.svelte';
	import type { ImageUploadResult } from '$lib/types/image-upload';
	import type { CampaignMap } from '$lib/types/schema';

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	let showUploadForm = $state(false);
	let mapName = $state('');
	let selectedFile = $state<File | null>(null);
	let imageSource = $state<string | null>(null);
	let uploadDialogOpen = $state(false);
	let saving = $state(false);
	let deletingMapId = $state<string | null>(null);
	let error = $state<string | null>(null);

	const maps = $derived(getReactiveCampaignMapsForCampaign(campaignId));
	const blobPreview = createBlobPreview(() => selectedFile);
	const previewUrl = $derived(blobPreview.url);

	function resetUploadForm() {
		revokeBlobPreviewUrl(previewUrl);
		mapName = '';
		selectedFile = null;
		imageSource = null;
		error = null;
	}

	function openUploadDialog() {
		if (saving) return;
		uploadDialogOpen = true;
		error = null;
	}

	async function persistSelectedMap(name: string) {
		if (!selectedFile) return;

		saving = true;
		error = null;

		try {
			await persistCampaignMap(campaignId, name, selectedFile, imageSource);
			resetUploadForm();
			showUploadForm = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not upload map');
		} finally {
			saving = false;
		}
	}

	async function handleUploadConfirm(result: ImageUploadResult) {
		revokeBlobPreviewUrl(previewUrl);
		selectedFile = result.file;
		imageSource = result.imageSource;

		const name = mapName.trim();
		if (name) {
			await persistSelectedMap(name);
		}
	}

	async function handleUpload(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !selectedFile) return;

		const name = mapName.trim();
		if (!name) {
			error = 'Enter a map name';
			return;
		}

		await persistSelectedMap(name);
	}

	async function handleDelete(map: CampaignMap) {
		if (deletingMapId) return;

		const confirmed = confirm(
			`Delete map “${map.name}”? Story nodes using it will show a missing map.`
		);
		if (!confirmed) return;

		deletingMapId = map.map_id;
		error = null;

		try {
			await removeCampaignMap(map.map_id);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not delete map');
		} finally {
			deletingMapId = null;
		}
	}

	function toggleUploadForm() {
		showUploadForm = !showUploadForm;
		if (!showUploadForm) {
			resetUploadForm();
		}
	}
</script>

<EntitySection
	headingId="campaign-maps-heading"
	title="Maps"
	hint="Upload battle maps here, then attach them to story nodes from the story board."
	emptyMessage="No maps yet."
	showEmpty={maps.length === 0 && !showUploadForm}
	{error}
>
	{#snippet list()}
		{#if maps.length}
			<ul class="map-list list-plain">
				{#each maps as map (map.map_id)}
					<CampaignMapListItem
						{map}
						deleting={deletingMapId === map.map_id}
						onDelete={() => handleDelete(map)}
					/>
				{/each}
			</ul>
		{/if}
	{/snippet}
	{#snippet headerAction()}
		<Button.Root
			type="button"
			data-variant="icon"
			onclick={toggleUploadForm}
			aria-label={showUploadForm ? 'Cancel add map' : 'Add map'}
		>
			{#if showUploadForm}
				−
			{:else}
				<AddIcon />
			{/if}
		</Button.Root>
	{/snippet}
	{#snippet addForm()}
		{#if showUploadForm}
			<form class="panel-form" onsubmit={handleUpload}>
				<FormField label="Map name" id="campaign_map_name">
					<input
						id="campaign_map_name"
						bind:value={mapName}
						placeholder="e.g. Goblin cave — room 2"
						required
					/>
				</FormField>

				<FormField label="Image">
					{#if previewUrl}
						<img class="upload-preview" src={previewUrl} alt="Upload preview" />
					{/if}
					<Button.Root type="button" disabled={saving} onclick={openUploadDialog}>
						{selectedFile ? 'Change image' : 'Choose image'}
					</Button.Root>
				</FormField>

				<Button.Root type="submit" disabled={saving || !selectedFile}>
					{saving ? 'Uploading…' : 'Upload map'}
				</Button.Root>
			</form>
		{/if}
	{/snippet}
</EntitySection>

<ImageUploadDialog
	bind:open={uploadDialogOpen}
	title="Upload map image"
	onConfirm={handleUploadConfirm}
/>

<style>
	.map-list {
		display: grid;
		gap: 0.5rem;
	}

	.upload-preview {
		width: 100%;
		max-height: 12rem;
		object-fit: contain;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}
</style>
