import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

const crossOriginIsolationHeaders = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp',
	'Cross-Origin-Resource-Policy': 'same-origin'
};

function crossOriginIsolationPlugin(): Plugin {
	return {
		name: 'cross-origin-isolation',
		configureServer(server) {
			server.middlewares.use((_request, response, next) => {
				for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
					response.setHeader(name, value);
				}

				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((_request, response, next) => {
				for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
					response.setHeader(name, value);
				}

				next();
			});
		}
	};
}

export default defineConfig({
	plugins: [
		crossOriginIsolationPlugin(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'DM Deputy',
				short_name: 'DM Deputy',
				description: 'Dungeon master campaign and adventure planner',
				theme_color: '#1a1410',
				background_color: '#1a1410',
				display: 'standalone',
				start_url: '/',
				scope: '/',
				icons: [
					{
						src: '/pwa-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff2}']
			},
			devOptions: {
				enabled: false
			}
		})
	],
	server: {
		headers: crossOriginIsolationHeaders
	},
	preview: {
		headers: crossOriginIsolationHeaders
	},
	optimizeDeps: {
		exclude: ['@sqlite.org/sqlite-wasm']
	},
	worker: {
		format: 'es'
	}
});
