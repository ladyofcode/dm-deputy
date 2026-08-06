import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

import { crossOriginIsolationHeaders, applyCrossOriginIsolationHeaders } from './cross-origin-isolation-headers.ts';

function crossOriginIsolationPlugin(): Plugin {
	return {
		name: 'cross-origin-isolation',
		configureServer(server) {
			server.middlewares.use((_request, response, next) => {
				applyCrossOriginIsolationHeaders(response.setHeader.bind(response));
				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((_request, response, next) => {
				applyCrossOriginIsolationHeaders(response.setHeader.bind(response));
				next();
			});
		}
	};
}

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/tesseract.js')) return 'tesseract';
					if (id.includes('node_modules/@sqlite.org/sqlite-wasm')) return 'sqlite-wasm';
					if (id.includes('node_modules/animejs')) return 'animejs';
					if (id.includes('node_modules/@panzoom/panzoom')) return 'panzoom';
				}
			}
		}
	},
	plugins: [
		crossOriginIsolationPlugin(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			useCredentials: true,
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
				globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff2}'],
				globIgnores: ['**/_app/immutable/workers/**'],
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname === '/dm-deputy.sqlite',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'dm-deputy-db',
							expiration: { maxEntries: 1 }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.includes('/_app/immutable/workers/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'dm-deputy-workers',
							expiration: { maxEntries: 8 }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'dm-deputy-wasm',
							expiration: { maxEntries: 8 }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'dm-deputy-tesseract',
							expiration: { maxEntries: 16 }
						}
					}
				]
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
