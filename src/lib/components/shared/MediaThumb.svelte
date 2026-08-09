<script lang="ts">
	import StoryMapViewer from '$lib/components/part/StoryMapViewer.svelte';
	import { getCampaignMapObjectUrl } from '$lib/data/map-blob-cache';
	import { getCharacterPortraitObjectUrl } from '$lib/data/character-blob-cache';
	import { getReactiveCampaignMapById } from '$lib/stores/campaign-maps.svelte';
	import { characterHasPortrait, type Character } from '$lib/types/schema';

	type MapProps = {
		variant: 'map';
		mapId: string;
		label?: string;
		showCaption?: boolean;
		class?: string;
	};

	type PortraitProps = {
		variant: 'portrait';
		character: Character;
		class?: string;
	};

	type Props = MapProps | PortraitProps;

	let { variant, class: className, ...props }: Props = $props();

	let thumbUrl = $state<string | null>(null);
	let viewerOpen = $state(false);
	let viewerUrl = $state<string | null>(null);
	let viewerLoading = $state(false);

	const mapProps = $derived(
		variant === 'map' ? (props as Omit<MapProps, 'variant' | 'class'>) : null
	);
	const portraitProps = $derived(
		variant === 'portrait' ? (props as Omit<PortraitProps, 'variant' | 'class'>) : null
	);
	const campaignMap = $derived(mapProps ? getReactiveCampaignMapById(mapProps.mapId) : null);
	const displayLabel = $derived(
		mapProps
			? mapProps.label?.trim() || campaignMap?.name || 'Map'
			: (portraitProps?.character.display_name ?? '')
	);

	$effect(() => {
		if (variant === 'map') {
			const currentMapId = mapProps?.mapId;
			if (!currentMapId) {
				thumbUrl = null;
				return;
			}

			let cancelled = false;

			void getCampaignMapObjectUrl(currentMapId, 'thumb').then((url) => {
				if (!cancelled) {
					thumbUrl = url;
				}
			});

			return () => {
				cancelled = true;
			};
		}

		const currentCharacter = portraitProps?.character;
		if (!currentCharacter || !characterHasPortrait(currentCharacter)) {
			thumbUrl = null;
			return;
		}

		let cancelled = false;

		void getCharacterPortraitObjectUrl(currentCharacter.character_id, 'thumb').then((url) => {
			if (!cancelled) {
				thumbUrl = url;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	async function openViewer() {
		if (variant !== 'map' || !mapProps?.mapId || viewerLoading) return;

		viewerLoading = true;

		try {
			const url = await getCampaignMapObjectUrl(mapProps.mapId, 'full');
			if (!url) return;

			viewerUrl = url;
			viewerOpen = true;
		} finally {
			viewerLoading = false;
		}
	}
</script>

{#if variant === 'map'}
	<figure class={['media-thumb media-thumb-map', className].filter(Boolean).join(' ')}>
		<button
			type="button"
			class="media-thumb-button"
			aria-label={`Open map ${displayLabel}`}
			onclick={openViewer}
		>
			{#if thumbUrl}
				<img class="media-thumb-image" src={thumbUrl} alt="" />
			{:else}
				<span class="media-thumb-placeholder">No preview</span>
			{/if}
		</button>
		{#if mapProps?.showCaption && displayLabel}
			<figcaption>{displayLabel}</figcaption>
		{/if}
	</figure>

	<StoryMapViewer
		bind:open={viewerOpen}
		title={displayLabel}
		imageUrl={viewerUrl}
		loading={viewerLoading}
	/>
{:else}
	<div
		class={['media-thumb media-thumb-portrait', className].filter(Boolean).join(' ')}
		aria-hidden="true"
	>
		{#if thumbUrl}
			<img class="media-thumb-image" src={thumbUrl} alt="" />
		{:else}
			<span class="media-thumb-fallback"
				>{portraitProps?.character.display_name.slice(0, 1).toUpperCase()}</span
			>
		{/if}
	</div>
{/if}

<style>
	.media-thumb-map {
		margin: 0;
		display: grid;
		gap: 0.35rem;
		max-width: 12rem;
	}

	.media-thumb-button {
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-text-muted) 8%, transparent);
		overflow: hidden;
		cursor: zoom-in;
	}

	.media-thumb-portrait {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-text-muted) 10%, transparent);
		overflow: hidden;
		flex-shrink: 0;
	}

	.media-thumb-image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.media-thumb-map .media-thumb-image,
	.media-thumb-placeholder {
		height: 5.5rem;
	}

	.media-thumb-placeholder {
		display: grid;
		place-items: center;
		width: 100%;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.media-thumb-fallback {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.media-thumb-map figcaption {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		line-height: 1.35;
	}
</style>
