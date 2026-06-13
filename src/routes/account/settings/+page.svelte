<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { accountThemeOptions } from '$lib/themes/themes';
	import { getUserTheme } from '$lib/themes/resolve';
	import type { ThemePreset } from '$lib/themes/types';

	const selectedTheme = $derived(
		getUserTheme(workspace.currentUserId, preferences.userThemes)
	);

	function handleThemeChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as ThemePreset;
		preferences.setUserTheme(workspace.currentUserId, value);
	}
</script>

<svelte:head>
	<title>Account settings · DM Deputy</title>
</svelte:head>

<section class="page-stack">
	<h1>Account settings</h1>
	<p>Choose the base theme for DM Deputy. Campaigns can inherit this or override it.</p>

	<form class="panel-form" onsubmit={(event) => event.preventDefault()}>
		<div class="field">
			<Label.Root for="account_theme">Base theme</Label.Root>
			<select id="account_theme" value={selectedTheme} onchange={handleThemeChange}>
				{#each accountThemeOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<p class="hint">
				{accountThemeOptions.find((option) => option.value === selectedTheme)?.description}
			</p>
		</div>
	</form>

	<Button.Root href={resolve('/')}>Back to home</Button.Root>
</section>
