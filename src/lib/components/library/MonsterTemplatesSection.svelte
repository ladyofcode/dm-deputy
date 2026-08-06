<script lang="ts">
	import MonsterTemplateModal from '$lib/components/library/MonsterTemplateModal.svelte';
	import { cloneMonsterTemplate } from '$lib/domain/monster-template-storage';
	import { abilityModifier } from '$lib/games/dnd5e/rules/formulae';
	import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
	import type { AbilityScores } from '$lib/types/schema';
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

	let modalOpen = $state(false);
	let selectedTemplate = $state<MonsterTemplate | null>(null);

	function openTemplate(template: MonsterTemplate) {
		selectedTemplate = cloneMonsterTemplate(template);
		modalOpen = true;
	}

	function formatAbility(score: number): string {
		const mod = abilityModifier(score);
		return `${score} (${mod >= 0 ? '+' : ''}${mod})`;
	}
</script>

<section class="library-section" id="templates" aria-labelledby="library-templates-heading">
	<h2 id="library-templates-heading">Templates</h2>
	<p class="hint">
		Monster stat block defaults used when loading a template onto an NPC. Click a row to edit. Changes
		are saved in this browser.
	</p>

	{#if templates.length}
		<div class="table-wrap">
			<table class="data-table template-table">
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">AC</th>
						<th scope="col">HP</th>
						<th scope="col">Speed</th>
						{#each ABILITY_KEYS as key (key)}
							<th scope="col" class="ability-col">{key.toUpperCase()}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each templates as template (template.id)}
						<tr>
							<td class="name-cell">
								<button type="button" class="template-link" onclick={() => openTemplate(template)}>
									{template.name}
								</button>
							</td>
							<td>{template.armor_class}</td>
							<td>{template.hp_max}{template.hp_dice ? ` (${template.hp_dice})` : ''}</td>
							<td>{template.speed || '—'}</td>
							{#each ABILITY_KEYS as key (key)}
								<td class="ability-col">{formatAbility(template.abilities[key])}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="hint">No templates available.</p>
	{/if}
</section>

<MonsterTemplateModal bind:open={modalOpen} template={selectedTemplate} />

<style>
	.library-section h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
	}

	.hint {
		margin: 0 0 1rem;
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.65rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
		white-space: nowrap;
	}

	.data-table th {
		font-family: var(--font-heading);
		font-weight: 600;
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}

	.data-table tbody tr:hover {
		background: color-mix(in srgb, var(--color-border) 18%, var(--color-surface));
	}

	.name-cell {
		font-weight: 600;
	}

	.template-link {
		appearance: none;
		border: none;
		background: none;
		padding: 0;
		font: inherit;
		font-weight: 600;
		color: inherit;
		cursor: pointer;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
		text-underline-offset: 0.15em;
	}

	.template-link:hover {
		text-decoration-color: currentColor;
	}

	.ability-col {
		font-variant-numeric: tabular-nums;
		font-size: 0.88rem;
	}
</style>
