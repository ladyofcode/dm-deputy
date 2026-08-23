<script lang="ts">
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import { getMediaAssetLabel, type MediaAsset } from '$lib/domain/media-asset';
	import { formatMediaDimensions, isLikelyHttpUrl } from '$lib/domain/media-library';
	import { getMediaLibraryFullUrl } from '$lib/data/media-library-blob-cache';

	type Props = {
		item: MediaAsset | null;
		open?: boolean;
	};

	let { item = null, open = $bindable(false) }: Props = $props();

	let fullUrl = $state<string | null>(null);
	let loading = $state(false);

	const itemLabel = $derived(item ? getMediaAssetLabel(item) : null);
	const fullDimensions = $derived(
		formatMediaDimensions(item?.full_width, item?.full_height) ??
			formatMediaDimensions(item?.thumb_width, item?.thumb_height)
	);

	$effect(() => {
		if (!open || !item) {
			fullUrl = null;
			return;
		}

		let cancelled = false;
		loading = true;

		void getMediaLibraryFullUrl(item.media_id)
			.then((url) => {
				if (!cancelled) fullUrl = url;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<AppDialog
	bind:open
	variant="viewer"
	wide
	ariaLabel={itemLabel ? `${itemLabel} image details` : undefined}
>
	{#snippet titleContent()}
		{#if itemLabel}
			<span>{itemLabel}</span>
		{/if}
	{/snippet}
	{#if item}
		<div class="media-detail">
			<figure class="media-detail-preview">
				{#if fullUrl}
					<img class="media-detail-image" src={fullUrl} alt="" />
				{:else if loading}
					<p class="media-detail-placeholder">Loading image…</p>
				{:else}
					<p class="media-detail-placeholder">Preview unavailable</p>
				{/if}
			</figure>

			<dl class="media-detail-meta">
				<div>
					<dt>Format</dt>
					<dd>{item.mime_type}</dd>
				</div>
				{#if fullDimensions}
					<div>
						<dt>Dimensions</dt>
						<dd>{fullDimensions}</dd>
					</div>
				{/if}
				<div>
					<dt>Uploaded</dt>
					<dd>{new Date(item.created_at).toLocaleString()}</dd>
				</div>
				{#if item.image_source?.trim()}
					<div>
						<dt>Source</dt>
						<dd>
							{#if isLikelyHttpUrl(item.image_source)}
								<!-- External attribution URL, not a SvelteKit route -->
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={item.image_source} target="_blank" rel="noopener noreferrer">
									{item.image_source}
								</a>
							{:else}
								{item.image_source}
							{/if}
						</dd>
					</div>
				{/if}
			</dl>
		</div>
	{/if}
</AppDialog>

<style>
	.media-detail {
		display: grid;
		gap: 1rem;
	}

	.media-detail-preview {
		margin: 0;
		display: grid;
		place-items: center;
		min-height: 12rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-text-muted) 8%, transparent);
		overflow: hidden;
	}

	.media-detail-image {
		display: block;
		max-width: 100%;
		max-height: min(70vh, 42rem);
		object-fit: contain;
	}

	.media-detail-placeholder {
		margin: 0;
		padding: 1rem;
		color: var(--color-text-muted);
	}

	.media-detail-meta {
		display: grid;
		gap: 0.75rem;
		margin: 0;
	}

	.media-detail-meta div {
		display: grid;
		gap: 0.15rem;
	}

	.media-detail-meta dt {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}

	.media-detail-meta dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.media-detail-meta a {
		color: var(--color-accent);
	}
</style>
