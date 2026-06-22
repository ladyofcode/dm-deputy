<script lang="ts">
	import Panzoom from '@panzoom/panzoom';
	import { Button, Dialog } from 'bits-ui';

	type Props = {
		open?: boolean;
		title?: string;
		imageUrl?: string | null;
		loading?: boolean;
	};

	let {
		open = $bindable(false),
		title = 'Map',
		imageUrl = null,
		loading = false
	}: Props = $props();

	let viewportEl = $state<HTMLDivElement | undefined>();
	let imageEl = $state<HTMLImageElement | undefined>();
	let panzoomInstance: ReturnType<typeof Panzoom> | null = null;

	function computeFitScale(viewport: HTMLElement, image: HTMLImageElement): number {
		const viewportWidth = viewport.clientWidth;
		const viewportHeight = viewport.clientHeight;
		const imageWidth = image.naturalWidth;
		const imageHeight = image.naturalHeight;

		if (viewportWidth <= 0 || viewportHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
			return 1;
		}

		return Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
	}

	function centerFitView(
		panzoom: ReturnType<typeof Panzoom>,
		viewport: HTMLElement,
		image: HTMLImageElement
	) {
		const scale = panzoom.getScale();
		const viewportRect = viewport.getBoundingClientRect();
		const imageRect = image.getBoundingClientRect();
		const deltaX =
			viewportRect.left + viewportRect.width / 2 - (imageRect.left + imageRect.width / 2);
		const deltaY =
			viewportRect.top + viewportRect.height / 2 - (imageRect.top + imageRect.height / 2);

		const pan = panzoom.getPan();
		const nextX = pan.x + deltaX / scale;
		const nextY = pan.y + deltaY / scale;

		panzoom.pan(nextX, nextY, { force: true, animate: false });
		panzoom.setOptions({ startX: nextX, startY: nextY, startScale: scale });
	}

	$effect(() => {
		if (!open || !imageUrl || !viewportEl || !imageEl) return;

		const viewport = viewportEl;
		const image = imageEl;
		let panzoom: ReturnType<typeof Panzoom> | null = null;
		let cancelled = false;

		const handleWheel = (event: WheelEvent) => {
			if (!event.ctrlKey || !panzoom) return;
			panzoom.zoomWithWheel(event);
		};

		const setup = () => {
			if (cancelled || !image || !viewport) return;

			const fitScale = computeFitScale(viewport, image);

			panzoom = Panzoom(image, {
				startScale: fitScale,
				minScale: fitScale,
				maxScale: fitScale * 6,
				panOnlyWhenZoomed: true,
				pinchAndPan: true,
				canvas: true
			});
			panzoomInstance = panzoom;
			viewport.addEventListener('wheel', handleWheel, { passive: false });

			setTimeout(() => {
				requestAnimationFrame(() => {
					if (cancelled || !panzoom || !image || !viewport) return;
					centerFitView(panzoom, viewport, image);
				});
			}, 0);
		};

		if (image.complete && image.naturalWidth > 0) {
			setup();
		} else {
			image.addEventListener('load', setup, { once: true });
		}

		return () => {
			cancelled = true;
			image.removeEventListener('load', setup);
			viewport.removeEventListener('wheel', handleWheel);
			panzoom?.destroy();
			panzoomInstance = null;
		};
	});

	function zoomFromCenter(direction: 'in' | 'out') {
		if (!panzoomInstance || !viewportEl) return;

		const currentScale = panzoomInstance.getScale();
		const step = panzoomInstance.getOptions().step ?? 0.3;
		const multiplier = direction === 'in' ? Math.exp(step / 3) : Math.exp(-step / 3);
		const rect = viewportEl.getBoundingClientRect();

		panzoomInstance.zoomToPoint(currentScale * multiplier, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2
		});
	}

	function handleResetZoom() {
		panzoomInstance?.reset({ animate: true });
	}

	function handleZoomIn() {
		zoomFromCenter('in');
	}

	function handleZoomOut() {
		zoomFromCenter('out');
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="map-viewer-overlay" />
		<Dialog.Content class="map-viewer-content" aria-label={title}>
			<header class="map-viewer-header">
				<Dialog.Title>{title}</Dialog.Title>
				<div class="map-viewer-actions">
					<Button.Root
						type="button"
						class="map-viewer-tool-btn"
						onclick={handleZoomOut}
						aria-label="Zoom out"
					>
						−
					</Button.Root>
					<Button.Root
						type="button"
						class="map-viewer-tool-btn"
						onclick={handleZoomIn}
						aria-label="Zoom in"
					>
						+
					</Button.Root>
					<Button.Root type="button" class="map-viewer-tool-btn" onclick={handleResetZoom}>
						Fit
					</Button.Root>
					<Dialog.Close class="map-viewer-tool-btn" aria-label="Close map viewer">✕</Dialog.Close>
				</div>
			</header>

			<div class="map-viewer-body" bind:this={viewportEl}>
				{#if loading}
					<p class="map-viewer-status">Loading map…</p>
				{:else if imageUrl}
					<img bind:this={imageEl} src={imageUrl} alt={title} draggable="false" />
				{:else}
					<p class="map-viewer-status">Map image unavailable.</p>
				{/if}
			</div>

			<p class="map-viewer-hint">Use +/−, pinch, or Ctrl + scroll to zoom, then drag to pan.</p>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.map-viewer-overlay) {
		background: rgb(0 0 0 / 72%);
	}

	:global(.map-viewer-content) {
		display: grid;
		grid-template-rows: auto 1fr auto;
		width: min(100vw, 100%);
		height: min(100dvh, 100%);
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: #111;
		color: #f5f5f5;
		overflow: hidden;
	}

	.map-viewer-header {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgb(255 255 255 / 12%);
		background: #111;
		min-width: 0;
	}

	.map-viewer-header :global([data-dialog-title]) {
		margin: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1.05rem;
		color: #f5f5f5;
	}

	.map-viewer-actions {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.map-viewer-actions :global([data-button-root].map-viewer-tool-btn),
	.map-viewer-actions :global([data-dialog-close].map-viewer-tool-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		padding: 0.35rem 0.55rem;
		border: 1px solid rgb(255 255 255 / 28%);
		border-radius: var(--radius-sm);
		background: rgb(255 255 255 / 10%);
		color: #f5f5f5;
		font: inherit;
		font-weight: 600;
		line-height: 1;
		box-shadow: none;
		cursor: pointer;
	}

	.map-viewer-actions :global([data-button-root].map-viewer-tool-btn:hover:not(:disabled)),
	.map-viewer-actions :global([data-dialog-close].map-viewer-tool-btn:hover:not(:disabled)) {
		background: rgb(255 255 255 / 18%);
		border-color: rgb(255 255 255 / 45%);
		color: #fff;
	}

	.map-viewer-body {
		position: relative;
		z-index: 1;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		background: #0a0a0a;
		isolation: isolate;
	}

	.map-viewer-body img {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		max-width: none;
		max-height: none;
		pointer-events: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.map-viewer-status,
	.map-viewer-hint {
		margin: 0;
		padding: 1rem;
		text-align: center;
		color: rgb(255 255 255 / 72%);
	}

	.map-viewer-hint {
		font-size: 0.875rem;
		border-top: 1px solid rgb(255 255 255 / 12%);
	}
</style>
