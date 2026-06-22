<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { fromStore } from 'svelte/store';
	import favicon from '$lib/assets/favicon.svg';
	import { getMostRecentCampaignForUser } from '$lib/data';
	import { database, dbError, dbIsReady, dbStatus } from '$lib/stores/database.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { resolveActiveTheme } from '$lib/themes/resolve';
	import { parseCampaignIdFromPath, resolveStoredActiveTheme } from '$lib/themes/storage';
	import { syncThemesWithDatabase } from '$lib/data/writes';
	import { installCampaignDbInspect } from '$lib/debug/campaign-db-inspect';
	import LibraryNavMenu from '$lib/components/LibraryNavMenu.svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.css';

	let { children } = $props();

	const ready = fromStore(dbIsReady);
	const webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	onMount(() => {
		installCampaignDbInspect(() => workspace.currentUserId);
		void database.init();

		if (pwaInfo) {
			void import('virtual:pwa-register').then(({ registerSW }) => {
				registerSW({ immediate: true });
			});
		}
	});

	const recentCampaign = $derived(
		ready.current ? getMostRecentCampaignForUser(workspace.currentUserId) : null
	);

	const contextualCampaignId = $derived.by(() => {
		if (page.params.campaignId) {
			return page.params.campaignId;
		}

		if (page.url.pathname === '/' && recentCampaign) {
			return recentCampaign.campaign.campaign_id;
		}

		return undefined;
	});

	const isPartStoryPage = $derived(Boolean(page.params.partId));

	const routeCampaignId = $derived(
		page.params.campaignId ?? parseCampaignIdFromPath(page.url.pathname)
	);

	const activeTheme = $derived(
		ready.current
			? resolveActiveTheme(
					workspace.currentUserId,
					contextualCampaignId,
					preferences.userThemes,
					preferences.campaignThemes
				)
			: resolveStoredActiveTheme(workspace.currentUserId, routeCampaignId)
	);

	$effect(() => {
		if (!ready.current) return;

		void syncThemesWithDatabase(workspace.currentUserId);
	});

	$effect(() => {
		document.documentElement.dataset.theme = activeTheme;
	});
</script>

<svelte:head>
	{@html webManifestLink}
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shell">
	<header class="app-header">
		<a href={resolve('/')} class="brand">DM Deputy</a>
		<nav class="app-nav">
			<a href={resolve('/')} aria-current={page.url.pathname === '/' ? 'page' : undefined}>Home</a>
			<LibraryNavMenu />
			<a
				href={resolve('/account/settings')}
				aria-current={page.url.pathname === '/account/settings' ? 'page' : undefined}>Settings</a
			>
			<a href={resolve('/login')} aria-current={page.url.pathname === '/login' ? 'page' : undefined}
				>Login</a
			>
		</nav>
	</header>

	<main class="app-main" class:app-main--canvas={isPartStoryPage}>
		{#if $dbStatus === 'error'}
			<section class="db-error-banner page-stack" role="alert">
				<h1>Database error</h1>
				<p>{$dbError}</p>
				<p class="hint">
					If this persists, clear site data for this origin and reload. OPFS storage also requires
					HTTPS with COOP/COEP headers when deployed.
				</p>
			</section>
		{/if}

		{@render children()}
	</main>
</div>

<style>
	.db-error-banner {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-danger, #b42318);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-danger, #b42318) 8%, transparent);
	}

	.db-error-banner h1 {
		margin: 0 0 0.35rem;
		font-size: 1rem;
	}

	:global(.app-nav-menu-trigger) {
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		cursor: pointer;
		text-decoration: none;
		color: var(--color-text-muted);
	}

	:global(.app-nav-menu-trigger:hover),
	:global(.app-nav-menu-trigger[aria-current='page']),
	:global(.app-nav-menu-trigger[data-state='open']) {
		color: var(--color-accent);
	}
</style>
