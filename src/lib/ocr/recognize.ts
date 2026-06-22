import { createWorker, type LoggerMessage, type Worker } from 'tesseract.js';

export type OcrProgress = {
	status: string;
	progress: number;
};

let workerPromise: Promise<Worker> | null = null;
let progressCallback: ((progress: OcrProgress) => void) | undefined;

async function getWorker(): Promise<Worker> {
	if (!workerPromise) {
		workerPromise = createWorker('eng', undefined, {
			logger: (message: LoggerMessage) => {
				progressCallback?.({
					status: message.status,
					progress: message.progress ?? 0
				});
			}
		});
	}

	return workerPromise;
}

export async function recognizeImage(
	file: File | Blob,
	onProgress?: (progress: OcrProgress) => void
): Promise<string> {
	progressCallback = onProgress;

	try {
		const worker = await getWorker();
		const result = await worker.recognize(file);
		return result.data.text.trim();
	} finally {
		progressCallback = undefined;
	}
}

export async function terminateOcrWorker(): Promise<void> {
	if (!workerPromise) return;

	const worker = await workerPromise;
	await worker.terminate();
	workerPromise = null;
}
