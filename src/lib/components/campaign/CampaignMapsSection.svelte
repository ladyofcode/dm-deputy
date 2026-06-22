<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import { persistCampaignMap, removeCampaignMap } from '$lib/data/writes';
	import { getCampaignMapObjectUrl } from '$lib/data/map-blob-cache';
	import { getReactiveCampaignMapsForCampaign } from '$lib/stores/campaign-maps.svelte';
	import type { CampaignMap } from '$lib/types/schema';

	type Props = {
		campaignId: string;
	};

	let { campaignId }: Props = $props();

	let showUploadForm = $state(false);
	let mapName = $state('');
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let saving = $state(false);
	let deletingMapId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let thumbUrls = $state<Record<string, string>>({});

	const maps = $derived(getReactiveCampaignMapsForCampaign(campaignId));

	$effect(() => {
		if (!campaignId) return;

		let cancelled = false;

		void (async () => {
			const nextUrls: Record<string, string> = {};

			for (const map of maps) {
				const url = await getCampaignMapObjectUrl(map.map_id, 'thumb');
				if (cancelled) return;
				if (url) nextUrls[map.map_id] = url;
			}

			if (!cancelled) {
				thumbUrls = nextUrls;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function resetUploadForm() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		mapName = '';
		selectedFile = null;
		previewUrl = null;
		error = null;

		if (fileInput) {
			fileInput.value = '';
		}
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		selectedFile = file ?? null;
		previewUrl = file ? URL.createObjectURL(file) : null;
		error = null;
	}

	async function handleUpload(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !selectedFile) return;

		const name = mapName.trim();
		if (!name) {
			error = 'Enter a map name';
			return;
		}

		saving = true;
		error = null;

		try {
			await persistCampaignMap(campaignId, name, selectedFile);
			resetUploadForm();
			showUploadForm = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not upload map';
		} finally {
			saving = false;
		}
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
		<Button.Root type="button" onclick={toggleUploadForm}>
			{showUploadForm ? 'Cancel' : 'Add map'}
		</Button.Root>
	</div>

	<p class="hint">Upload battle maps here, then attach them to story nodes from the story board.</p>

	{#if maps.length}
		<ul class="map-list list-plain">
			{#each maps as map (map.map_id)}
				<li class="map-list-item">
					{#if thumbUrls[map.map_id]}
						<img class="map-thumb" src={thumbUrls[map.map_id]} alt="" />
					{:else}
						<div class="map-thumb map-thumb-empty" aria-hidden="true"></div>
					{/if}
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
				<Label.Root for="campaign_map_file">Image</Label.Root>
				<input
					id="campaign_map_file"
					bind:this={fileInput}
					type="file"
					accept="image/*"
					onchange={handleFileChange}
				/>
			</div>

			{#if previewUrl}
				<img class="upload-preview" src={previewUrl} alt="Upload preview" />
			{/if}

			{#if error}
				<p class="hint error">{error}</p>
			{/if}

			<Button.Root type="submit" disabled={saving || !selectedFile}>
				{saving ? 'Uploading…' : 'Upload map'}
			</Button.Root>
		</form>
	{/if}
</section>

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

	.map-thumb {
		width: 4.5rem;
		height: 3.25rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.map-thumb-empty {
		background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
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
