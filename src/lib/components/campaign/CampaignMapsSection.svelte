<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { persistCampaignMap, removeCampaignMap } from '$lib/data/writes';
	import { getReactiveCampaignMapsForCampaign } from '$lib/stores/campaign-maps.svelte';
	import CampaignMapThumb from '$lib/components/shared/CampaignMapThumb.svelte';
	import ImageUploadDialog from '$lib/components/shared/ImageUploadDialog.svelte';
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
	let previewUrl = $state<string | null>(null);
	let saving = $state(false);
	let deletingMapId = $state<string | null>(null);
	let error = $state<string | null>(null);

	const maps = $derived(getReactiveCampaignMapsForCampaign(campaignId));

	function resetUploadForm() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		mapName = '';
		selectedFile = null;
		imageSource = null;
		previewUrl = null;
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
			error = cause instanceof Error ? cause.message : 'Could not upload map';
		} finally {
			saving = false;
		}
	}

	async function handleUploadConfirm(result: ImageUploadResult) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		selectedFile = result.file;
		imageSource = result.imageSource;
		previewUrl = URL.createObjectURL(result.file);

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
			error = cause instanceof Error ? cause.message : 'Could not delete map';
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

<section class="maps-section" aria-labelledby="campaign-maps-heading">
	<div class="maps-section-header">
		<h2 id="campaign-maps-heading">Maps</h2>
		<Button.Root
			type="button"
			data-variant="icon"
			onclick={toggleUploadForm}
			aria-label={showUploadForm ? 'Cancel add map' : 'Add map'}
		>
			{showUploadForm ? '−' : '+'}
		</Button.Root>
	</div>

	<p class="hint">Upload battle maps here, then attach them to story nodes from the story board.</p>

	{#if maps.length}
		<ul class="map-list list-plain">
			{#each maps as map (map.map_id)}
				<li class="map-list-item">
					<CampaignMapThumb mapId={map.map_id} label={map.name} class="map-list-thumb" />
					<span class="map-title">{map.name}</span>
					<Button.Root
						type="button"
						data-variant="ghost"
						disabled={deletingMapId === map.map_id}
						onclick={() => handleDelete(map)}
						aria-label={`Delete ${map.name}`}
					>
						{deletingMapId === map.map_id ? 'Deleting…' : 'Delete'}
					</Button.Root>
				</li>
			{/each}
		</ul>
	{:else if !showUploadForm}
		<p class="hint">No maps yet.</p>
	{/if}

	{#if showUploadForm}
		<form class="upload-form" onsubmit={handleUpload}>
			<div class="field">
				<Label.Root for="campaign_map_name">Map name</Label.Root>
				<input
					id="campaign_map_name"
					bind:value={mapName}
					placeholder="e.g. Goblin cave — room 2"
					required
				/>
			</div>

			<div class="field">
				<Label.Root>Image</Label.Root>
				{#if previewUrl}
					<img class="upload-preview" src={previewUrl} alt="Upload preview" />
				{/if}
				<Button.Root type="button" disabled={saving} onclick={openUploadDialog}>
					{selectedFile ? 'Change image' : 'Choose image'}
				</Button.Root>
			</div>

			{#if error}
				<p class="hint error">{error}</p>
			{/if}

			<Button.Root type="submit" disabled={saving || !selectedFile}>
				{saving ? 'Uploading…' : 'Upload map'}
			</Button.Root>
		</form>
	{/if}
</section>

<ImageUploadDialog
	bind:open={uploadDialogOpen}
	title="Upload map image"
	onConfirm={handleUploadConfirm}
/>

<style>
	.maps-section {
		display: grid;
		gap: 0.75rem;
	}

	.maps-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.maps-section-header h2 {
		margin: 0;
	}

	.map-list {
		display: grid;
		gap: 0.5rem;
	}

	.map-list-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.map-list-item :global(.map-list-thumb) {
		max-width: 4.5rem;
	}

	.map-list-item :global(.map-list-thumb .map-thumb),
	.map-list-item :global(.map-list-thumb .map-thumb-missing) {
		height: 3.25rem;
	}

	.map-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
	}

	.upload-form {
		display: grid;
		gap: 0.85rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.upload-form .field {
		margin-bottom: 0;
	}

	.upload-preview {
		width: 100%;
		max-height: 12rem;
		object-fit: contain;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
