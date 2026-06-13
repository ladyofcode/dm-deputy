<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { getMostRecentCampaignForUser } from '$lib/data';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { resolveActiveTheme } from '$lib/themes/resolve';
	import '../app.css';

	let { children } = $props();

	const recentCampaign = $derived(getMostRecentCampaignForUser(workspace.currentUserId));

	const contextualCampaignId = $derived.by(() => {
		if (page.params.campaignId) {
			return page.params.campaignId;
		}

		if (page.url.pathname === '/' && recentCampaign) {
			return recentCampaign.campaign.campaign_id;
		}

		return undefined;
	});

	const activeTheme = $derived(
		resolveActiveTheme(
			workspace.currentUserId,
			contextualCampaignId,
			preferences.userThemes,
			preferences.campaignThemes
		)
	);

	$effect(() => {
		document.documentElement.dataset.theme = activeTheme;
	});
</script>

<svelte:head>
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
			<a
				href={resolve('/account/settings')}
				aria-current={page.url.pathname === '/account/settings' ? 'page' : undefined}
				>Settings</a
			>
			<a href={resolve('/login')} aria-current={page.url.pathname === '/login' ? 'page' : undefined}
				>Login</a
			>
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>
</div>
