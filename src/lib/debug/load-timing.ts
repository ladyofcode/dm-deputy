/**
 * Dev-only load timing probes. These compile away in production builds because
 * `import.meta.env.DEV` is statically replaced, so the wrappers become direct calls.
 */
const enabled = import.meta.env.DEV;

function log(label: string, durationMs: number, detail: string | undefined): void {
	const suffix = detail ? ` — ${detail}` : '';
	console.info(`[timing] ${label}: ${durationMs.toFixed(1)}ms${suffix}`);
}

export async function timeAsync<T>(label: string, run: () => Promise<T>): Promise<T> {
	if (!enabled) return run();

	const start = performance.now();
	try {
		return await run();
	} finally {
		log(label, performance.now() - start, undefined);
	}
}

export function timeSync<T>(label: string, run: () => T): T {
	if (!enabled) return run();

	const start = performance.now();
	try {
		return run();
	} finally {
		log(label, performance.now() - start, undefined);
	}
}

/** Returns a function that logs the elapsed time, for spans that do not wrap a single call. */
export function startTimer(label: string): (detail?: string) => void {
	if (!enabled) return () => {};

	const start = performance.now();
	return (detail) => log(label, performance.now() - start, detail);
}
