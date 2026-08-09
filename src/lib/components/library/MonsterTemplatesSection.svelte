<script lang="ts">
	import EntitySection from '$lib/components/shared/EntitySection.svelte';
	import LibraryAddButton from '$lib/components/library/LibraryAddButton.svelte';
	import TemplateAbilityColumnFilter from '$lib/components/library/TemplateAbilityColumnFilter.svelte';
	import { abilityModifier } from '$lib/games/dnd5e/rules/formulae';
	import type { AbilityScores } from '$lib/types/schema';
	import { resolveTemplateHref } from '$lib/navigation/hrefs';
	import {
		getMonsterTemplates,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';

	type AbilityKey = keyof AbilityScores;

	const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

	const templates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return [...getMonsterTemplates()].sort((left, right) =>
			left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
		);
	});

	let visibleAbilities = $state<AbilityKey[]>([]);

	const visibleAbilityKeys = $derived(ABILITY_KEYS.filter((key) => visibleAbilities.includes(key)));

	const COLUMN_MIN_REM = {
		name: 5,
		ac: 2.25,
		hp: 5.5,
		speed: 3.5,
		ability: 4.5
	} as const;

	const columnLayout = $derived.by(() => {
		const abilityCount = visibleAbilityKeys.length;

		if (abilityCount === 0) {
			return { name: 46, ac: 8, hp: 22, speed: 24, abilityEach: 0 };
		}

		const abilityEach = Math.min(9, Math.max(5.5, 42 / abilityCount));
		const statTotal = 100 - abilityEach * abilityCount;
		const ac = Math.max(4, statTotal * 0.08);
		const hp = Math.max(9, statTotal * 0.22);
		const speed = Math.max(7, statTotal * 0.18);
		const name = Math.max(14, statTotal - ac - hp - speed);

		return { name, ac, hp, speed, abilityEach };
	});

	const tableMinWidth = $derived(
		`${COLUMN_MIN_REM.name + COLUMN_MIN_REM.ac + COLUMN_MIN_REM.hp + COLUMN_MIN_REM.speed + visibleAbilityKeys.length * COLUMN_MIN_REM.ability}rem`
	);

	const tableStyle = $derived(
		`--col-name: ${columnLayout.name}%; --col-ac: ${columnLayout.ac}%; --col-hp: ${columnLayout.hp}%; --col-speed: ${columnLayout.speed}%; --col-ability: ${columnLayout.abilityEach}%; --table-min: ${tableMinWidth};`
	);

	function formatAbility(score: number): string {
		const mod = abilityModifier(score);
		return `${score} (${mod >= 0 ? '+' : ''}${mod})`;
	}
</script>

<EntitySection
	id="templates"
	class="library-section"
	headingId="library-templates-heading"
	title="Templates"
	emptyMessage="No templates available."
	showEmpty={templates.length === 0}
>
	{#snippet headerAction()}
		<div class="library-section-actions">
			{#if templates.length}
				<TemplateAbilityColumnFilter abilityKeys={ABILITY_KEYS} bind:visibleAbilities />
			{/if}
			<LibraryAddButton label="template" href={resolveTemplateHref('new')} />
		</div>
	{/snippet}
	{#snippet list()}
		{#if templates.length}
			<div class="table-wrap template-table-wrap">
				<table class="data-table template-table" style={tableStyle}>
					<thead>
						<tr>
							<th scope="col" class="name-col">Name</th>
							<th scope="col" class="col-ac">AC</th>
							<th scope="col" class="col-hp">HP</th>
							<th scope="col" class="col-speed">Speed</th>
							{#each visibleAbilityKeys as key (key)}
								<th scope="col" class="ability-col">{key.toUpperCase()}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each templates as template (template.id)}
							<tr>
								<td class="name-cell">
									<a href={resolveTemplateHref(template.id)} class="template-link">
										{template.name}
									</a>
								</td>
								<td class="col-ac">{template.armor_class}</td>
								<td class="col-hp">
									{template.hp_max}{template.hp_dice ? ` (${template.hp_dice})` : ''}
								</td>
								<td class="col-speed">{template.speed || '—'}</td>
								{#each visibleAbilityKeys as key (key)}
									<td class="ability-col">{formatAbility(template.abilities[key])}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/snippet}
</EntitySection>

<style>
	.library-section-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.template-table-wrap {
		width: 100%;
		overflow-x: auto;
	}

	.template-table-wrap :global(.data-table.template-table) {
		width: 100%;
		min-width: max(100%, var(--table-min));
		table-layout: fixed;
	}

	.template-table :is(th, td) {
		vertical-align: middle;
	}

	.template-table-wrap :global(.data-table.template-table .name-cell),
	.template-table .name-col {
		width: var(--col-name);
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.template-table .col-ac {
		width: var(--col-ac);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-table .col-hp {
		width: var(--col-hp);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-table .col-speed {
		width: var(--col-speed);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.template-table .ability-col {
		width: var(--col-ability);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-variant-numeric: tabular-nums;
		font-size: 0.88rem;
	}

	.data-table tbody tr:hover,
	.data-table tbody tr:focus-within {
		background: color-mix(in srgb, var(--color-border) 18%, var(--color-surface));
	}

	.template-link:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.template-link {
		font-weight: 600;
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
		text-underline-offset: 0.15em;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.template-link:hover {
		text-decoration-color: currentColor;
	}
</style>
