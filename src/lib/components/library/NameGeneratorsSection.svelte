<script lang="ts">
	import EntitySection from '$lib/components/shared/EntitySection.svelte';
	import RaceNameGenerator from '$lib/components/library/RaceNameGenerator.svelte';
	import { RACE_NAME_GENERATORS } from '$lib/games/dnd5e/data/name-generators';

	type Props = {
		/** When set, only show the generator matching this species name. */
		speciesName?: string | null;
	};

	let { speciesName = null }: Props = $props();

	const generators = $derived.by(() => {
		if (!speciesName?.trim()) return [...RACE_NAME_GENERATORS];

		const normalized = speciesName.trim().toLowerCase();
		return RACE_NAME_GENERATORS.filter((generator) =>
			generator.speciesNames.some((name) => name.toLowerCase() === normalized)
		);
	});

	const emptyMessage = $derived(
		speciesName
			? `No name generator is available for ${speciesName} yet.`
			: 'No name generators configured.'
	);
</script>

<EntitySection
	id="name-generators"
	class="library-section"
	headingId="library-name-generators-heading"
	title="Name generators"
	{emptyMessage}
	showEmpty={generators.length === 0}
>
	{#snippet list()}
		{#if generators.length}
			<div class="generators-grid">
				{#each generators as generator (generator.id)}
					<RaceNameGenerator {generator} />
				{/each}
			</div>
		{/if}
	{/snippet}
</EntitySection>

<style>
	.generators-grid {
		display: grid;
		gap: 1rem;
	}
</style>
