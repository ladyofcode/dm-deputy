export const crossOriginIsolationHeaders = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp',
	'Cross-Origin-Resource-Policy': 'same-origin'
};

export function applyCrossOriginIsolationHeaders(
	setHeader: (name: string, value: string) => void
) {
	for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
		setHeader(name, value);
	}
}
