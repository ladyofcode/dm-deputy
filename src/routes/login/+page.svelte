<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Label, Separator } from 'bits-ui';
	import { workspace } from '$lib/stores/workspace.svelte';

	let email = $state('');
	let password = $state('');

	function continueAsReturningGm() {
		workspace.setScenario('returning', 'usr-returning-gm');
		goto(resolve('/'));
	}

	function continueAsNewGm() {
		workspace.setScenario('new-gm', 'usr-new-gm');
		goto(resolve('/onboarding/campaign'));
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
		<h2>Demo scenarios</h2>
		<p>Use these to preview layouts with dummy data.</p>
		<div class="actions-row actions-row--stacked">
			<Button.Root type="button" onclick={continueAsReturningGm}>
				Returning GM — show recent campaign
			</Button.Root>
			<Button.Root type="button" onclick={continueAsNewGm}>
				New GM — create campaign &amp; adventure
			</Button.Root>
		</div>
	</div>
</section>
