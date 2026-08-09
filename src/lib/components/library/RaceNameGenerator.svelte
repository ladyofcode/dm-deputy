<script lang="ts">
	import { Button } from 'bits-ui';
	import NameGeneratorField from '$lib/components/library/NameGeneratorField.svelte';
	import { pickRandomExcluding } from '$lib/domain/name-generator';
	import {
		buildFullName,
		type NamePool,
		type RaceNameGenerator
	} from '$lib/games/dnd5e/data/name-generators';

	type Props = {
		generator: RaceNameGenerator;
	};

	let { generator }: Props = $props();

	let selectedGroupId = $state('');
	let selectedGivenPoolId = $state('');
	let values = $state<Record<string, string>>({});

	const activeGroup = $derived.by(() => {
		if (!generator.groups?.length) return null;
		const match = generator.groups.find((group) => group.id === selectedGroupId);
		return match ?? generator.groups[0] ?? null;
	});

	const activePools = $derived.by((): readonly NamePool[] => {
		if (activeGroup) return activeGroup.pools;
		return generator.pools;
	});

	const surnamePools = $derived(activePools.filter((pool) => isSurnamePool(pool)));
	const givenPools = $derived(activePools.filter((pool) => !isSurnamePool(pool)));

	const activeGivenPool = $derived.by(() => {
		const match = givenPools.find((pool) => pool.id === selectedGivenPoolId);
		return match ?? givenPools[0] ?? null;
	});

	const visiblePools = $derived.by(() => {
		const pools: NamePool[] = [];
		if (activeGivenPool) pools.push(activeGivenPool);
		pools.push(...surnamePools);
		return pools;
	});

	const surnameFirst = $derived(activeGroup?.surnameFirst ?? generator.surnameFirst ?? false);

	const fullName = $derived(
		buildFullName(visiblePools.map((pool) => values[pool.id] ?? ''), surnameFirst)
	);

	function isSurnamePool(pool: NamePool): boolean {
		return pool.id === 'surname' || pool.id === 'clan' || pool.id === 'family';
	}

	$effect(() => {
		if (generator.groups?.length && !selectedGroupId) {
			selectedGroupId = generator.groups[0]?.id ?? '';
		}
	});

	$effect(() => {
		const groupId = selectedGroupId;
		const pools = activePools;
		void groupId;

		if (pools.length && !pools.some((pool) => pool.id === selectedGivenPoolId)) {
			selectedGivenPoolId = givenPools[0]?.id ?? '';
		}

		const next: Record<string, string> = {};
		for (const pool of pools) {
			next[pool.id] = pickRandomExcluding(pool.names, null);
		}
		values = next;
	});

	function shuffleAll() {
		const next: Record<string, string> = { ...values };
		for (const pool of visiblePools) {
			next[pool.id] = pickRandomExcluding(pool.names, values[pool.id] ?? null);
		}
		values = next;
	}

	async function copyFullName() {
		if (!fullName || !navigator.clipboard) return;
		await navigator.clipboard.writeText(fullName);
	}
</script>

<section class="race-generator" aria-labelledby={`name-generator-${generator.id}`}>
	<h3 id={`name-generator-${generator.id}`}>{generator.label} names</h3>

	{#if generator.groups?.length}
		<div class="field">
			<label for={`name-group-${generator.id}`}>Ethnicity</label>
			<select id={`name-group-${generator.id}`} bind:value={selectedGroupId}>
				{#each generator.groups as group (group.id)}
					<option value={group.id}>{group.label}</option>
				{/each}
			</select>
		</div>
		{#if activeGroup?.note}
			<p class="hint">{activeGroup.note}</p>
		{/if}
	{/if}

	{#if givenPools.length > 1}
		<div class="field">
			<label for={`name-given-${generator.id}`}>Given name type</label>
			<select id={`name-given-${generator.id}`} bind:value={selectedGivenPoolId}>
				{#each givenPools as pool (pool.id)}
					<option value={pool.id}>{pool.label}</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="name-pools">
		{#each visiblePools as pool (pool.id)}
			<NameGeneratorField
				id={`${generator.id}-${pool.id}`}
				label={pool.label}
				names={pool.names}
				bind:value={values[pool.id]}
			/>
		{/each}
	</div>

	<div class="full-name-row">
		<p class="full-name">
			<strong>Full name:</strong>
			{fullName || '—'}
		</p>
		<div class="full-name-actions">
			<Button.Root type="button" data-variant="ghost" onclick={shuffleAll}>Shuffle all</Button.Root>
			<Button.Root type="button" data-variant="ghost" onclick={copyFullName} disabled={!fullName}>
				Copy
			</Button.Root>
		</div>
	</div>
</section>

<style>
	.race-generator {
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-surface) 92%, var(--color-bg));
	}

	h3 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}

	.field {
		margin-bottom: 0.75rem;
	}

	.field label {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.88rem;
		font-weight: 600;
	}

	select {
		width: 100%;
	}

	.hint {
		margin: 0 0 0.75rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.name-pools {
		display: grid;
		gap: 0.75rem;
	}

	.full-name-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.full-name {
		margin: 0;
	}

	.full-name-actions {
		display: flex;
		gap: 0.35rem;
	}
</style>
