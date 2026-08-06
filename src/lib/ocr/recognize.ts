import type { LoggerMessage } from 'tesseract.js';

export type OcrProgress = {
	status: string;
	progress: number;
};

type OcrWorker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>;

let workerPromise: Promise<OcrWorker> | null = null;
let progressHandler: ((progress: OcrProgress) => void) | null = null;

function tesseractAssetUrl(relativePath: string): string {
	const base = import.meta.env.BASE_URL.endsWith('/')
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`;
	return `${base}tesseract/${relativePath}`;
}

async function getWorker(onProgress?: (progress: OcrProgress) => void): Promise<OcrWorker> {
	progressHandler = onProgress ?? null;

	if (!workerPromise) {
		workerPromise = (async () => {
			const { createWorker } = await import('tesseract.js');
			return createWorker('eng', undefined, {
				workerPath: tesseractAssetUrl('worker.min.js'),
				corePath: tesseractAssetUrl('tesseract-core.wasm.js'),
				langPath: tesseractAssetUrl('lang'),
				logger: (message: LoggerMessage) => {
					progressHandler?.({
						status: message.status,
						progress: message.progress ?? 0
					});
				}
			});
		})();
	}

	return workerPromise;
}

export async function recognizeImage(
	file: File | Blob,
	onProgress?: (progress: OcrProgress) => void
): Promise<string> {
	const worker = await getWorker(onProgress);
	const result = await worker.recognize(file);
	return result.data.text.trim();
}

export async function terminateOcrWorker(): Promise<void> {
	if (!workerPromise) return;

	const worker = await workerPromise;
	await worker.terminate();
	workerPromise = null;
	progressHandler = null;
}
