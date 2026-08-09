<script lang="ts">
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
</script>

<section class="library-section" id="name-generators" aria-labelledby="library-name-generators-heading">
	<h2 id="library-name-generators-heading">Name generators</h2>
	<p class="hint">
		Use the arrow buttons to cycle names or ↻ to shuffle each field. Goblin names are silly one-offs;
		other races follow typical D&amp;D naming tables.
	</p>

	{#if generators.length}
		<div class="generators-grid">
			{#each generators as generator (generator.id)}
				<RaceNameGenerator {generator} />
			{/each}
		</div>
	{:else if speciesName}
		<p class="hint">No name generator is available for {speciesName} yet.</p>
	{:else}
		<p class="hint">No name generators configured.</p>
	{/if}
</section>

<style>
	.library-section h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
	}

	.hint {
		margin: 0 0 1rem;
	}

	.generators-grid {
		display: grid;
		gap: 1rem;
	}
</style>
