<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label, Separator } from 'bits-ui';
	import { LOCAL_USER_ID } from '$lib/constants/user';
	import { workspace } from '$lib/stores/workspace.svelte';

	let email = $state('');
	let password = $state('');

	function continueToApp() {
		workspace.setCurrentUser(LOCAL_USER_ID);
		goto(resolve('/'));
	}
</script>

<svelte:head>
	<title>Login · DM Deputy</title>
</svelte:head>

<section class="page-stack">
	<h1>Login</h1>
	<p>Template only — wire up real auth later.</p>

	<form
		class="page-stack--compact"
		onsubmit={(event) => {
			event.preventDefault();
		}}
	>
		<div class="field">
			<Label.Root for="email">Email</Label.Root>
			<input id="email" type="email" bind:value={email} autocomplete="username" />
		</div>

		<div class="field">
			<Label.Root for="password">Password</Label.Root>
			<input id="password" type="password" bind:value={password} autocomplete="current-password" />
		</div>

		<Button.Root type="submit" disabled>Sign in</Button.Root>
	</form>

	<Separator.Root />

	<div class="page-stack--compact">
		<h2>Local mode</h2>
		<p>Your campaigns are stored in this browser. Continue to create or resume your game.</p>
		<div class="actions-row actions-row--stacked">
			<Button.Root type="button" onclick={continueToApp}>Continue as game master</Button.Root>
		</div>
	</div>
</section>
