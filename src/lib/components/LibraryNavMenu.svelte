<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { DropdownMenu } from 'bits-ui';

	const links = [
		{
			href: '/library/players',
			label: 'Characters',
			hint: 'Players and NPCs'
		},
		{
			href: '/library/rules',
			label: 'Rules library',
			hint: 'Spells, weapons, armor, items'
		},
		{
			href: '/library/assets',
			label: 'Asset library',
			hint: 'Map images'
		}
	] as const;

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
		<DropdownMenu.Content class="library-menu-content" sideOffset={8}>
			{#each links as link (link.href)}
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
		z-index: 50;
		min-width: 14rem;
		padding: 0.35rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: 0 8px 24px var(--color-shadow);
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
