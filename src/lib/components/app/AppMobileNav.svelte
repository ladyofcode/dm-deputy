<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { fly, fade } from 'svelte/transition';
	import MenuIcon from '$lib/components/icons/MenuIcon.svelte';
	import { LIBRARY_LINKS } from '$lib/navigation/library-links';

	let open = $state(false);

	const isLibraryRoute = $derived(page.url.pathname.startsWith('/library'));

	function closeMenu() {
		open = false;
	}

	function toggleMenu() {
		open = !open;
	}

	afterNavigate(() => {
		open = false;
	});

	$effect(() => {
		const root = document.documentElement;

		if (open) {
			root.classList.add('mobile-nav-open');
		} else {
			root.classList.remove('mobile-nav-open');
		}

		return () => {
			root.classList.remove('mobile-nav-open');
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			closeMenu();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button
	type="button"
	class="mobile-nav-toggle"
	aria-expanded={open}
	aria-controls="app-mobile-nav"
	aria-label={open ? 'Close menu' : 'Open menu'}
	onclick={toggleMenu}
>
	<MenuIcon {open} />
</button>

{#if open}
	<button
		type="button"
		class="mobile-nav-backdrop"
		aria-label="Close menu"
		transition:fade={{ duration: 200 }}
		onclick={closeMenu}
	></button>

	<nav
		id="app-mobile-nav"
		class="mobile-nav-panel"
		aria-label="Main navigation"
		transition:fly={{ x: 280, duration: 250 }}
	>
		<ul class="mobile-nav-list list-plain">
			<li class="mobile-nav-group">
				<span
					class="mobile-nav-group-label"
					class:mobile-nav-group-label--active={isLibraryRoute}
					aria-current={isLibraryRoute ? 'page' : undefined}
				>
					Library
				</span>
				<ul class="mobile-nav-sublist list-plain">
					{#each LIBRARY_LINKS as link (link.href)}
						<li>
							<a
								href={resolve(link.href)}
								class="mobile-nav-sublink"
								aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}
								onclick={closeMenu}
							>
								<span class="mobile-nav-sublink-label">{link.label}</span>
								<span class="mobile-nav-sublink-hint">{link.hint}</span>
							</a>
						</li>
					{/each}
				</ul>
			</li>

			<li>
				<a
					href={resolve('/account/settings')}
					class="mobile-nav-link"
					aria-current={page.url.pathname === '/account/settings' ? 'page' : undefined}
					onclick={closeMenu}
				>
					Settings
				</a>
			</li>

			<li>
				<a
					href={resolve('/login')}
					class="mobile-nav-link"
					aria-current={page.url.pathname === '/login' ? 'page' : undefined}
					onclick={closeMenu}
				>
					Login
				</a>
			</li>
		</ul>
	</nav>
{/if}

<style>
	:global(.app-header:has(.mobile-nav-toggle[aria-expanded='true'])) {
		z-index: 50;
	}

	:global(.mobile-nav-toggle) {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		min-inline-size: 2.75rem;
		min-block-size: 2.75rem;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	:global(.mobile-nav-toggle:hover),
	:global(.mobile-nav-toggle[aria-expanded='true']) {
		color: var(--color-accent);
	}

	:global(.mobile-nav-toggle:focus-visible) {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.mobile-nav-backdrop {
		position: fixed;
		inset: 0;
		z-index: 45;
		padding: 0;
		border: none;
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
		backdrop-filter: blur(6px);
		cursor: pointer;
	}

	.mobile-nav-panel {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 46;
		display: flex;
		flex-direction: column;
		width: min(18rem, 85vw);
		height: 100dvh;
		padding: calc(4.5rem + env(safe-area-inset-top, 0px)) 0
			calc(1.5rem + env(safe-area-inset-bottom, 0px));
		border-left: 1px solid var(--color-border);
		background: var(--color-surface);
		box-shadow: -8px 0 24px var(--color-shadow);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.mobile-nav-list {
		display: grid;
		gap: 0.25rem;
		padding: 0 1rem;
	}

	.mobile-nav-link {
		display: block;
		padding: 0.75rem 0.85rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		font-family: var(--font-heading);
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.mobile-nav-link:hover,
	.mobile-nav-link[aria-current='page'] {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.mobile-nav-group {
		display: grid;
		gap: 0.15rem;
	}

	.mobile-nav-group-label {
		display: block;
		padding: 0.75rem 0.85rem 0.35rem;
		font-family: var(--font-heading);
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.mobile-nav-group-label--active {
		color: var(--color-accent);
	}

	.mobile-nav-sublist {
		display: grid;
		gap: 0.15rem;
		padding-left: 0.5rem;
	}

	.mobile-nav-sublink {
		display: grid;
		gap: 0.1rem;
		padding: 0.55rem 0.85rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: inherit;
	}

	.mobile-nav-sublink:hover,
	.mobile-nav-sublink[aria-current='page'] {
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.mobile-nav-sublink-label {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.mobile-nav-sublink[aria-current='page'] .mobile-nav-sublink-label {
		color: var(--color-accent);
	}

	.mobile-nav-sublink-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		line-height: 1.3;
	}

	@media (--layout) {
		:global(.mobile-nav-toggle) {
			display: none;
		}
	}
</style>
