/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-info' {
	export interface PwaInfo {
		pwaInDevEnvironment: boolean;
		webManifest: {
			href: string;
			useCredentials: boolean;
			linkTag: string;
		};
	}

	export const pwaInfo: PwaInfo | undefined;
}
