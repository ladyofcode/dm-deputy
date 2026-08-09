<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { LIBRARY_LINKS } from '$lib/navigation/library-links';

	let { children } = $props();

	const activeHref = $derived(
		LIBRARY_LINKS.find((link) => page.url.pathname === link.href)?.href ??
			(page.url.pathname.startsWith('/library/npcs') ? '/library/players' : undefined)
	);
</script>

<section class="page-stack library-page">
	<nav class="library-subnav" aria-label="Library sections">
		<ul class="library-subnav-list list-plain">
			{#each LIBRARY_LINKS as link (link.href)}
				<li>
					<a
						href={resolve(link.href)}
						class="library-subnav-link"
						aria-current={activeHref === link.href ? 'page' : undefined}
					>
						{link.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
	<div class="library-page-content page-stack page-stack--compact">
		{@render children()}
	</div>
</section>

<style>
	.library-subnav-list {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.library-subnav-link {
		text-decoration: none;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.library-subnav-link:hover,
	.library-subnav-link:focus-visible {
		color: var(--color-accent);
		outline: none;
	}

	.library-subnav-link[aria-current='page'] {
		color: var(--color-accent);
	}

	.library-page-content {
		min-width: 0;
	}

	.library-page-content :global(.library-header) {
		margin-top: 0.25rem;
	}

	.library-page-content :global(.library-header h1) {
		margin: 0;
	}

	.library-page-content :global(.library-section) {
		margin-top: 2rem;
	}

	.library-page-content :global(.library-section:first-child),
	.library-page-content :global(> .library-header + .library-section) {
		margin-top: 0;
	}
</style>
