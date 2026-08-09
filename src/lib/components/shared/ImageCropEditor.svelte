<script lang="ts">
	import Panzoom from '@panzoom/panzoom';
	import { Button } from 'bits-ui';
	import { computeCoverScale, computeMinScale, cropImageToFile } from '$lib/domain/crop-image';

	type Props = {
		imageUrl: string;
		fileName?: string;
		mimeType?: string;
		aspectRatio?: number;
	};

	let { imageUrl, fileName = 'image.jpg', mimeType, aspectRatio = 4 / 5 }: Props = $props();

	let viewportEl = $state<HTMLDivElement | undefined>();
	let imageEl = $state<HTMLImageElement | undefined>();
	let panzoomInstance = $state<ReturnType<typeof Panzoom> | null>(null);

	function centerCoverView(
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
		const url = imageUrl;
		if (!url || !viewportEl || !imageEl) return;

		const viewport = viewportEl;
		const image = imageEl;
		let panzoom: ReturnType<typeof Panzoom> | null = null;
		let cancelled = false;

		const handleWheel = (event: WheelEvent) => {
			if (!panzoom) return;
			event.preventDefault();
			panzoom.zoomWithWheel(event);
		};

		const setup = () => {
			if (cancelled || !image || !viewport || image.naturalWidth <= 0) return;

			const coverScale = computeCoverScale(viewport, image);
			const minScale = computeMinScale(viewport, image);

			panzoom = Panzoom(image, {
				startScale: coverScale,
				minScale,
				maxScale: coverScale * 8,
				step: 0.25,
				panOnlyWhenZoomed: false,
				pinchAndPan: true,
				canvas: true
			});
			panzoomInstance = panzoom;
			viewport.addEventListener('wheel', handleWheel, { passive: false });

			requestAnimationFrame(() => {
				if (cancelled || !panzoom) return;
				centerCoverView(panzoom, viewport, image);
			});
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
		const step = panzoomInstance.getOptions().step ?? 0.25;
		const multiplier = direction === 'in' ? Math.exp(step / 3) : Math.exp(-step / 3);
		const rect = viewportEl.getBoundingClientRect();

		panzoomInstance.zoomToPoint(currentScale * multiplier, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2
		});
	}

	function handleResetZoom() {
		if (!panzoomInstance || !viewportEl || !imageEl) return;

		const coverScale = computeCoverScale(viewportEl, imageEl);
		panzoomInstance.reset({ animate: false });
		panzoomInstance.zoom(coverScale, { animate: false });
		centerCoverView(panzoomInstance, viewportEl, imageEl);
	}

	export async function exportCroppedFile(): Promise<File> {
		if (!viewportEl || !imageEl) {
			throw new Error('Crop editor is not ready');
		}

		return cropImageToFile(imageEl, viewportEl, fileName, mimeType);
	}
</script>

<div class="crop-editor">
	<div
		class="crop-viewport"
		bind:this={viewportEl}
		style:aspect-ratio={aspectRatio}
		aria-label="Crop area — drag to reposition, scroll or pinch to zoom"
	>
		<img bind:this={imageEl} src={imageUrl} alt="" draggable="false" />
		<div class="crop-frame" aria-hidden="true"></div>
	</div>

	<div class="crop-controls">
		<p class="crop-hint">
			Drag to reposition · zoom out past fit for finer centering, in to fill the frame
		</p>
		<div class="crop-buttons">
			<Button.Root type="button" onclick={() => zoomFromCenter('out')} aria-label="Zoom out">
				−
			</Button.Root>
			<Button.Root type="button" onclick={handleResetZoom}>Reset</Button.Root>
			<Button.Root type="button" onclick={() => zoomFromCenter('in')} aria-label="Zoom in">
				+
			</Button.Root>
		</div>
	</div>
</div>

<style>
	.crop-editor {
		display: grid;
		gap: 0.65rem;
	}

	.crop-viewport {
		position: relative;
		width: 100%;
		max-height: min(70dvh, 28rem);
		overflow: hidden;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-viewer-bg);
		touch-action: none;
		cursor: grab;
	}

	.crop-viewport:active {
		cursor: grabbing;
	}

	.crop-viewport img {
		display: block;
		max-width: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.crop-frame {
		position: absolute;
		inset: 0;
		pointer-events: none;
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.45);
		border: 2px solid rgb(255 255 255 / 0.85);
		border-radius: calc(var(--radius-md) - 1px);
	}

	.crop-controls {
		display: grid;
		gap: 0.45rem;
	}

	.crop-hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.crop-buttons {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}
</style>
