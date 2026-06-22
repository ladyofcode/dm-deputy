<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Label } from 'bits-ui';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { fromStore } from 'svelte/store';
	import { database, dbIsReady } from '$lib/stores/database.svelte';
	import { persistUserTheme } from '$lib/data/writes';
	import { accountThemeOptions } from '$lib/themes/themes';
	import { getUserTheme } from '$lib/themes/resolve';
	import { resolveStoredActiveTheme } from '$lib/themes/storage';
	import type { ThemePreset } from '$lib/themes/types';

	let importInput: HTMLInputElement | undefined = $state();
	let backupMessage = $state<string | null>(null);
	let backupError = $state<string | null>(null);
	let isExporting = $state(false);
	let isImporting = $state(false);
	let isSavingTheme = $state(false);

	const dbReady = fromStore(dbIsReady);

	const selectedTheme = $derived(
		dbReady.current
			? getUserTheme(workspace.currentUserId, preferences.userThemes)
			: resolveStoredActiveTheme(workspace.currentUserId)
	);

	async function handleThemeChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value as ThemePreset;
		preferences.setUserTheme(workspace.currentUserId, value);

		isSavingTheme = true;
		try {
			await persistUserTheme(workspace.currentUserId, value);
		} finally {
			isSavingTheme = false;
		}
	}

	async function handleExportBackup() {
		backupMessage = null;
		backupError = null;
		isExporting = true;

		try {
			await database.exportBackup();
			backupMessage =
				'Backup downloaded. Upload the .sqlite file to Google Drive or keep it safe locally.';
		} catch (error) {
			backupError = error instanceof Error ? error.message : String(error);
		} finally {
			isExporting = false;
		}
	}

	function handleImportClick() {
		importInput?.click();
	}

	async function handleImportSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		if (!file) return;

		backupMessage = null;
		backupError = null;
		isImporting = true;

		try {
			await database.importBackup(file);
			backupMessage = 'Backup restored. Your campaigns and story data were reloaded from the file.';
		} catch (error) {
			backupError = error instanceof Error ? error.message : String(error);
		} finally {
			isImporting = false;
		}
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
			<select
				id="account_theme"
				value={selectedTheme}
				disabled={isSavingTheme}
				onchange={handleThemeChange}
			>
				{#each accountThemeOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<p class="hint">
				{accountThemeOptions.find((option) => option.value === selectedTheme)?.description}
			</p>
		</div>
	</form>

	<section class="page-stack--compact">
		<h2>Local backup</h2>
		<p>
			Your data lives in a SQLite database on this device. Export a backup file and store it in
			Google Drive or anywhere else you trust.
		</p>

		<div class="meta-row">
			<Button.Root type="button" disabled={isExporting || isImporting} onclick={handleExportBackup}>
				{isExporting ? 'Exporting…' : 'Export backup'}
			</Button.Root>
			<Button.Root type="button" disabled={isExporting || isImporting} onclick={handleImportClick}>
				{isImporting ? 'Importing…' : 'Import backup'}
			</Button.Root>
		</div>

		<input
			bind:this={importInput}
			type="file"
			accept=".sqlite,.db,application/x-sqlite3"
			hidden
			onchange={handleImportSelected}
		/>

		{#if backupMessage}
			<p class="hint">{backupMessage}</p>
		{/if}
		{#if backupError}
			<p class="hint">{backupError}</p>
		{/if}
	</section>

	<Button.Root href={resolve('/')}>Back to home</Button.Root>
</section>
