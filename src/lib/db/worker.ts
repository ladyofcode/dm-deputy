/// <reference lib="webworker" />

import type { WorkerRequest } from './types';
import { handleRequest } from './worker/dispatch';

let requestQueue: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;

	requestQueue = requestQueue
		.then(async () => {
			const response = await handleRequest(request);
			if ('buffer' in response && response.buffer) {
				self.postMessage(response, [response.buffer]);
			} else {
				self.postMessage(response);
			}
		})
		.catch((error) => {
			const message = error instanceof Error ? error.message : String(error);
			self.postMessage({ id: request.id, error: message });
		});
};

export {};
