<script lang="ts">
	import { Label } from 'bits-ui';
	import { CHARACTER_ALIGNMENTS } from '$lib/domain/character-alignments';
	import { abilityModifier } from '$lib/games/dnd5e/rules/formulae';
	import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
	import { CHARACTER_KIND_LABELS, type AbilityScores, type NpcCharacterKind } from '$lib/types/schema';

	type AbilityKey = keyof AbilityScores;

	const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

	type Props = {
		draft: MonsterTemplate;
	};

	let { draft = $bindable() }: Props = $props();

	let portraitError = $state(false);

	function updateField<K extends keyof MonsterTemplate>(key: K, value: MonsterTemplate[K]) {
		draft = { ...draft, [key]: value };
	}

	function updateAbility(key: AbilityKey, value: number) {
		draft = {
			...draft,
			abilities: {
				...draft.abilities,
				[key]: value
			}
		};
	}
</script>

<div class="template-form">
	<header class="template-header">
		<div class="template-title-block">
			<div class="field">
				<Label.Root for="template_name">Name</Label.Root>
				<input
					id="template_name"
					value={draft.name}
					oninput={(event) => updateField('name', event.currentTarget.value)}
				/>
			</div>
			<div class="field">
				<Label.Root for="template_creature_type">Size / type</Label.Root>
				<input
					id="template_creature_type"
					value={draft.creature_type}
					oninput={(event) => updateField('creature_type', event.currentTarget.value)}
					placeholder="Medium humanoid (goblinoid)"
				/>
			</div>
			<div class="field-row">
				<div class="field">
					<Label.Root for="template_alignment">Alignment</Label.Root>
					<select
						id="template_alignment"
						value={draft.alignment}
						onchange={(event) => updateField('alignment', event.currentTarget.value)}
					>
						<option value="">Choose alignment…</option>
						{#each CHARACTER_ALIGNMENTS as alignment (alignment)}
							<option value={alignment}>{alignment}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<Label.Root for="template_kind">NPC type</Label.Root>
					<select
						id="template_kind"
						value={draft.kind}
						onchange={(event) =>
							updateField('kind', event.currentTarget.value as NpcCharacterKind)}
					>
						<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
						<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
					</select>
				</div>
			</div>
		</div>

		{#if draft.image_url && !portraitError}
			<img
				class="template-portrait"
				src={draft.image_url}
				alt=""
				onerror={() => (portraitError = true)}
			/>
		{/if}
	</header>

	<div class="template-divider" aria-hidden="true"></div>

	<div class="template-core-stats">
		<label class="core-stat">
			<span>AC</span>
			<input
				type="number"
				min="0"
				value={draft.armor_class}
				oninput={(event) => updateField('armor_class', Number(event.currentTarget.value) || 0)}
			/>
		</label>
		<label class="core-stat core-stat-wide">
			<span>AC notes</span>
			<input
				value={draft.armor_class_notes}
				oninput={(event) => updateField('armor_class_notes', event.currentTarget.value)}
				placeholder="hide armor, shield"
			/>
		</label>
		<label class="core-stat core-stat-wide">
			<span>HP</span>
			<div class="hp-row">
				<input
					type="number"
					min="0"
					value={draft.hp_max}
					oninput={(event) => updateField('hp_max', Number(event.currentTarget.value) || 0)}
					aria-label="Hit points"
				/>
				<input
					class="hp-dice"
					value={draft.hp_dice}
					oninput={(event) => updateField('hp_dice', event.currentTarget.value)}
					placeholder="5d8 + 5"
					aria-label="Hit dice"
				/>
			</div>
		</label>
		<label class="core-stat">
			<span>Speed</span>
			<input
				value={draft.speed}
				oninput={(event) => updateField('speed', event.currentTarget.value)}
			/>
		</label>
	</div>

	<div class="template-divider" aria-hidden="true"></div>

	<div class="abilities-row" aria-label="Ability scores">
		{#each ABILITY_KEYS as key (key)}
			<label class="ability-stat">
				<span>{key.toUpperCase()}</span>
				<input
					type="number"
					min="1"
					max="30"
					value={draft.abilities[key]}
					oninput={(event) => updateAbility(key, Number(event.currentTarget.value) || 10)}
				/>
				<em>{abilityModifier(draft.abilities[key]) >= 0 ? '+' : ''}{abilityModifier(draft.abilities[key])}</em>
			</label>
		{/each}
	</div>

	<div class="template-divider" aria-hidden="true"></div>

	<div class="template-meta">
		<label class="meta-field">
			<span>Skills</span>
			<input
				value={draft.skills}
				oninput={(event) => updateField('skills', event.currentTarget.value)}
			/>
		</label>
		<label class="meta-field">
			<span>Senses</span>
			<input
				value={draft.senses}
				oninput={(event) => updateField('senses', event.currentTarget.value)}
			/>
		</label>
		<label class="meta-field">
			<span>Languages</span>
			<input
				value={draft.languages}
				oninput={(event) => updateField('languages', event.currentTarget.value)}
			/>
		</label>
		<label class="meta-field meta-field-short">
			<span>CR</span>
			<input
				value={draft.challenge_rating}
				oninput={(event) => updateField('challenge_rating', event.currentTarget.value)}
			/>
		</label>
		<label class="meta-field meta-field-short">
			<span>XP</span>
			<input
				type="number"
				min="0"
				value={draft.experience}
				oninput={(event) => updateField('experience', Number(event.currentTarget.value) || 0)}
			/>
		</label>
		<label class="meta-field">
			<span>Portrait URL</span>
			<input
				value={draft.image_url ?? ''}
				oninput={(event) => updateField('image_url', event.currentTarget.value || undefined)}
				placeholder="/monsters/example.png"
			/>
		</label>
		<label class="meta-field">
			<span>Image source</span>
			<input
				value={draft.image_source ?? ''}
				oninput={(event) => updateField('image_source', event.currentTarget.value || undefined)}
			/>
		</label>
	</div>

	<div class="template-divider" aria-hidden="true"></div>

	<div class="template-text-block">
		<Label.Root for={`template_${draft.id}_traits`}>Traits</Label.Root>
		<textarea
			id={`template_${draft.id}_traits`}
			value={draft.traits}
			oninput={(event) => updateField('traits', event.currentTarget.value)}
			rows="4"
		></textarea>
	</div>

	<div class="template-text-block">
		<Label.Root for={`template_${draft.id}_actions`}>Actions</Label.Root>
		<textarea
			id={`template_${draft.id}_actions`}
			value={draft.actions}
			oninput={(event) => updateField('actions', event.currentTarget.value)}
			rows="5"
		></textarea>
	</div>

	<div class="template-text-block">
		<Label.Root for={`template_${draft.id}_presentation`}>Description</Label.Root>
		<textarea
			id={`template_${draft.id}_presentation`}
			value={draft.presentation ?? ''}
			oninput={(event) => updateField('presentation', event.currentTarget.value)}
			rows="3"
		></textarea>
	</div>
</div>

<style>
	.template-form {
		display: grid;
		gap: 0.65rem;
	}

	.template-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.template-title-block {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.field-row {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.field {
		display: grid;
		gap: var(--space-field);
	}

	.template-portrait {
		width: 5rem;
		height: 5rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.template-divider {
		height: 2px;
		background: color-mix(in srgb, #8b1e1e 70%, var(--color-border));
	}

	.template-core-stats,
	.abilities-row,
	.template-meta {
		display: grid;
		gap: 0.5rem;
	}

	.template-core-stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.core-stat,
	.ability-stat,
	.meta-field {
		display: grid;
		gap: 0.2rem;
		font-size: 0.85rem;
	}

	.core-stat span,
	.ability-stat span,
	.meta-field span {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
	}

	.hp-row {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr);
		gap: 0.35rem;
	}

	.abilities-row {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.ability-stat input {
		text-align: center;
		padding-inline: 0.25rem;
	}

	.ability-stat em {
		text-align: center;
		font-style: normal;
		font-size: 0.8rem;
		color: var(--color-muted, #667085);
	}

	.template-meta {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.template-text-block {
		display: grid;
		gap: 0.35rem;
	}

	.template-text-block :global(label) {
		font-weight: 700;
		font-size: 0.85rem;
		text-transform: uppercase;
	}

	@media (max-width: 40rem) {
		.field-row,
		.template-core-stats,
		.abilities-row,
		.template-meta {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (min-width: 40rem) {
		.template-core-stats {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1fr);
		}
	}
</style>
