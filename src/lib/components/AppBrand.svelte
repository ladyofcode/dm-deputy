<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { resolveBrandContext, resolveBrandShellFromRoute } from '$lib/navigation/brand-context';
	import { database } from '$lib/stores/database.svelte';

	const brand = $derived.by(() => {
		const params = {
			campaignId: page.params.campaignId,
			adventureId: page.params.adventureId,
			partId: page.params.partId
		};

		if (!database.isReady) {
			return resolveBrandShellFromRoute(params);
		}

		return resolveBrandContext(params);
	});
</script>

<a href={brand.href} class="brand" class:brand--stacked={brand.kind !== 'app'}>
	{#if brand.kind === 'app'}
		<span class="brand-title">{brand.title}</span>
	{:else}
		<span class="brand-eyebrow">{brand.eyebrow}</span>
		<span class="brand-title">{brand.title}</span>
	{/if}
</a>

<style>
	.brand--stacked {
		display: grid;
		gap: 0.1rem;
		line-height: 1.2;
	}

	.brand-eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.brand-title {
		font-family: var(--font-heading);
		font-weight: 700;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
