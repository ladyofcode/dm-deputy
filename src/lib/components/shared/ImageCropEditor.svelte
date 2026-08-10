<script lang="ts">
	import Panzoom from '@panzoom/panzoom';
	import { Button } from 'bits-ui';
	import {
		computeCropRect,
		computeMinScale,
		computeStartScale,
		cropImageToFile,
		finalizeCropView,
		normalizeCropRect,
		waitForCropFrameLayout,
		type NormalizedCropRect
	} from '$lib/domain/crop-image';

	type Props = {
		imageUrl: string;
		fileName?: string;
		mimeType?: string;
		aspectRatio?: number;
		startScaleMode?: 'cover' | 'contain';
		initialCropRect?: NormalizedCropRect | null;
	};

	let {
		imageUrl,
		fileName = 'image.jpg',
		mimeType,
		aspectRatio = 4 / 5,
		startScaleMode = 'cover',
		initialCropRect = null
	}: Props = $props();

	let stageEl = $state<HTMLDivElement | undefined>();
	let cropFrameEl = $state<HTMLDivElement | undefined>();
	let imageEl = $state<HTMLImageElement | undefined>();
	let panzoomInstance = $state<ReturnType<typeof Panzoom> | null>(null);

	$effect(() => {
		const url = imageUrl;
		const savedCrop = initialCropRect;
		const scaleMode = startScaleMode;
		if (!url || !stageEl || !cropFrameEl || !imageEl) return;

		const stage = stageEl;
		const cropFrame = cropFrameEl;
		const image = imageEl;
		let panzoom: ReturnType<typeof Panzoom> | null = null;
		let cancelled = false;
		let initTimeout: ReturnType<typeof setTimeout> | undefined;

		const handleWheel = (event: WheelEvent) => {
			if (!panzoom) return;
			event.preventDefault();
			panzoom.zoomWithWheel(event);
		};

		const setup = async () => {
			if (cancelled || !image || !cropFrame || image.naturalWidth <= 0) return;

			await waitForCropFrameLayout(cropFrame);
			if (cancelled || !image || !cropFrame) return;

			const startScale = computeStartScale(cropFrame, image, scaleMode);
			const minScale = computeMinScale(cropFrame, image);

			panzoom = Panzoom(image, {
				startScale,
				minScale,
				maxScale: startScale * 8,
				step: 0.25,
				panOnlyWhenZoomed: false,
				pinchAndPan: true,
				canvas: true
			});
			panzoomInstance = panzoom;
			stage.addEventListener('wheel', handleWheel, { passive: false });

			// Panzoom applies startX/startY on the next task; center after that so it sticks.
			initTimeout = setTimeout(() => {
				requestAnimationFrame(() => {
					if (cancelled || !panzoom) return;
					finalizeCropView(panzoom, image, cropFrame, savedCrop);
				});
			}, 0);
		};

		const onImageLoad = () => {
			void setup();
		};

		if (image.complete && image.naturalWidth > 0) {
			void setup();
		} else {
			image.addEventListener('load', onImageLoad, { once: true });
		}

		return () => {
			cancelled = true;
			if (initTimeout) clearTimeout(initTimeout);
			image.removeEventListener('load', onImageLoad);
			stage.removeEventListener('wheel', handleWheel);
			panzoom?.destroy();
			panzoomInstance = null;
		};
	});

	function zoomFromCenter(direction: 'in' | 'out') {
		if (!panzoomInstance || !cropFrameEl) return;

		const currentScale = panzoomInstance.getScale();
		const step = panzoomInstance.getOptions().step ?? 0.25;
		const multiplier = direction === 'in' ? Math.exp(step / 3) : Math.exp(-step / 3);
		const rect = cropFrameEl.getBoundingClientRect();

		panzoomInstance.zoomToPoint(currentScale * multiplier, {
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2
		});
	}

	function handleResetZoom() {
		if (!panzoomInstance || !cropFrameEl || !imageEl) return;

		const startScale = computeStartScale(cropFrameEl, imageEl, startScaleMode);
		panzoomInstance.reset({ animate: false });
		panzoomInstance.zoom(startScale, { animate: false, force: true });
		setTimeout(() => {
			if (!panzoomInstance || !cropFrameEl || !imageEl) return;
			finalizeCropView(panzoomInstance, imageEl, cropFrameEl, null);
		}, 0);
	}

	export async function exportCroppedFile(): Promise<File> {
		if (!cropFrameEl || !imageEl) {
			throw new Error('Crop editor is not ready');
		}

		return cropImageToFile(imageEl, cropFrameEl, fileName, mimeType, {
			transparentLetterbox: true
		});
	}

	export function exportCropRect(): NormalizedCropRect {
		if (!cropFrameEl || !imageEl) {
			throw new Error('Crop editor is not ready');
		}

		return normalizeCropRect(imageEl, computeCropRect(imageEl, cropFrameEl));
	}
</script>

<div class="crop-editor">
	<div
		class="crop-stage"
		bind:this={stageEl}
		aria-label="Crop area — drag the image behind the frame, scroll or pinch to zoom"
	>
		<div class="crop-canvas">
			<img bind:this={imageEl} src={imageUrl} alt="" draggable="false" />
		</div>

		<div class="crop-overlay" aria-hidden="true">
			<div
				class="crop-window"
				bind:this={cropFrameEl}
				style:--crop-aspect={aspectRatio}
			></div>
		</div>
	</div>

	<div class="crop-controls">
		<p class="crop-hint">
			Drag the image behind the frame · zoom to adjust · empty areas use the page background colour
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

	.crop-stage {
		position: relative;
		width: 100%;
		aspect-ratio: 5 / 4;
		max-height: min(70dvh, 30rem);
		overflow: hidden;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		touch-action: none;
		cursor: grab;
	}

	.crop-stage:active {
		cursor: grabbing;
	}

	.crop-canvas {
		position: absolute;
		inset: 0;
	}

	.crop-canvas img {
		display: block;
		max-width: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.crop-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.crop-window {
		--crop-aspect: 4 / 5;
		position: absolute;
		left: 50%;
		top: 50%;
		width: min(68%, 14rem);
		max-height: calc(100% - 2.5rem);
		aspect-ratio: var(--crop-aspect);
		transform: translate(-50%, -50%);
		border: 2px solid rgb(255 255 255 / 0.92);
		border-radius: calc(var(--radius-md) - 2px);
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.52);
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
