<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { Button } from 'bits-ui';

	let unlocked = $state(dev);
	let checking = $state(!dev);

	async function verify(): Promise<boolean> {
		try {
			const res = await fetch('/api/auth/check', { credentials: 'include' });
			return res.ok;
		} catch {
			return false;
		}
	}

	async function begin() {
		checking = true;
		unlocked = await verify();
		checking = false;
	}

	onMount(() => {
		if (dev) return;
		void begin();
	});
</script>

{#if !unlocked}
	<div
		class="auth-gate"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-gate-title"
		aria-busy={checking}
	>
		<h1 id="auth-gate-title">DM Deputy</h1>
		<p>Tap begin after signing in with your site credentials.</p>
		<Button.Root type="button" data-variant="primary" disabled={checking} onclick={begin}>
			{checking ? 'Signing in…' : 'Begin'}
		</Button.Root>
	</div>
{/if}

<style>
	.auth-gate {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1.5rem;
		text-align: center;
		background: var(--color-bg, #1a1410);
		color: var(--color-text, #f5efe6);
	}

	.auth-gate h1 {
		margin: 0;
		font-family: var(--font-display, 'Cinzel Decorative', serif);
	}

	.auth-gate p {
		margin: 0;
		max-width: 22rem;
		color: var(--color-text-muted, #c9bba8);
	}
</style>
