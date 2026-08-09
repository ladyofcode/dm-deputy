<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { DropdownMenu } from 'bits-ui';
	import { LIBRARY_LINKS } from '$lib/navigation/library-links';

	const isLibraryRoute = $derived(page.url.pathname.startsWith('/library'));
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="app-nav-menu-trigger"
				aria-current={isLibraryRoute ? 'page' : undefined}
			>
				Library
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content class="popover-surface library-menu-content" sideOffset={8}>
			{#each LIBRARY_LINKS as link (link.href)}
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a {...props} href={resolve(link.href)} class="library-menu-link">
							<span class="library-menu-label">{link.label}</span>
							<span class="library-menu-hint">{link.hint}</span>
						</a>
					{/snippet}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	:global(.library-menu-content) {
		min-width: 14rem;
		padding: 0.35rem;
	}

	.library-menu-link {
		display: grid;
		gap: 0.15rem;
		width: 100%;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: inherit;
		outline: none;
	}

	.library-menu-link:hover,
	.library-menu-link:focus-visible {
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.library-menu-label {
		font-family: var(--font-heading);
		font-weight: 600;
		font-size: 0.95rem;
	}

	.library-menu-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		line-height: 1.3;
	}
</style>
