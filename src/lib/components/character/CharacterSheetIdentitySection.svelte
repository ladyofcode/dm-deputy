<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
	import { getReactiveCatalogArmor, getReactiveCatalogWeapons } from '$lib/stores/catalog.svelte';
	import { CHARACTER_ALIGNMENTS } from '$lib/domain/character-alignments';
	import {
		createDefaultCharacterIdentity,
		createDefaultNpcExtras,
		type CharacterIdentityDraft,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import {
		getMonsterTemplates,
		getStoredMonsterTemplateById,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { CHARACTER_KIND_LABELS, type NpcCharacterKind } from '$lib/types/schema';

	type Props = {
		mode?: 'npc' | 'pc';
		kind?: NpcCharacterKind;
		name?: string;
		playerName?: string;
		description?: string;
		identity?: CharacterIdentityDraft;
		extras?: NpcExtrasDraft;
		characterId?: string;
		portraitFile?: File | null;
		portraitImageSource?: string | null;
		showPortrait?: boolean;
		loading?: boolean;
		combatExpanded?: boolean | null;
	};

	let {
		mode = 'pc',
		kind = $bindable('npc_general' as NpcCharacterKind),
		name = $bindable(''),
		playerName = $bindable(''),
		description = $bindable(''),
		identity = $bindable(createDefaultCharacterIdentity()),
		extras = $bindable(createDefaultNpcExtras()),
		characterId,
		portraitFile = $bindable(null),
		portraitImageSource = $bindable(null),
		showPortrait = true,
		loading = false,
		combatExpanded = $bindable(null)
	}: Props = $props();

	let selectedTemplateId = $state('');
	let loadingTemplate = $state(false);

	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());
	const monsterTemplates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return getMonsterTemplates();
	});

	async function handleLoadTemplate() {
		if (!selectedTemplateId || loadingTemplate) return;

		const template = getStoredMonsterTemplateById(selectedTemplateId);
		if (!template) return;

		loadingTemplate = true;

		try {
			const { loadMonsterTemplateIntoDraft } = await import('$lib/games/dnd5e/data/monsters');
			const loaded = await loadMonsterTemplateIntoDraft(template, weapons, armor);
			kind = loaded.kind;
			name = loaded.name;
			identity = loaded.identity;
			extras = loaded.extras;
			portraitFile = loaded.portraitFile;
			portraitImageSource = loaded.portraitImageSource;
			combatExpanded = true;
		} finally {
			loadingTemplate = false;
		}
	}
</script>

<section class="sheet-section identity-section">
	<h2>Identity</h2>

	{#if mode === 'npc'}
		<div class="template-row">
			<div class="field field-inline template-field">
				<Label.Root for="character_sheet_template">Monster template</Label.Root>
				<select id="character_sheet_template" bind:value={selectedTemplateId}>
					<option value="">Choose a monster…</option>
					{#each monsterTemplates as template (template.id)}
						<option value={template.id}>{template.name}</option>
					{/each}
				</select>
			</div>
			<Button.Root
				type="button"
				disabled={!selectedTemplateId || loading || loadingTemplate}
				onclick={handleLoadTemplate}
			>
				{loadingTemplate ? 'Loading…' : 'Load template'}
			</Button.Root>
		</div>
	{/if}

	<div class="identity-top" class:identity-top-single={!showPortrait}>
		<div class="identity-intro">
			{#if mode === 'pc'}
				<div class="field field-inline">
					<Label.Root for="character_sheet_player_name">Player name</Label.Root>
					<input
						id="character_sheet_player_name"
						bind:value={playerName}
						placeholder="Player name"
						aria-label="Player name"
					/>
				</div>
			{/if}

			<div class="field field-inline">
				<Label.Root for="character_sheet_name">
					{mode === 'pc' ? 'Character name' : 'Name'}
				</Label.Root>
				<input
					id="character_sheet_name"
					bind:value={name}
					placeholder={mode === 'pc' ? 'Character name' : 'Character name'}
					aria-label="Character name"
				/>
			</div>

			<div class="field field-inline">
				<Label.Root for="character_sheet_race">{mode === 'npc' ? 'Species' : 'Race'}</Label.Root>
				<input
					id="character_sheet_race"
					bind:value={identity.race}
					placeholder={mode === 'npc' ? 'Species' : 'Race'}
				/>
			</div>

			{#if mode === 'npc'}
				<div class="field field-inline">
					<Label.Root for="character_sheet_creature_type">Size / type</Label.Root>
					<input
						id="character_sheet_creature_type"
						bind:value={identity.creature_type}
						placeholder="Medium humanoid (goblinoid)"
					/>
				</div>
			{/if}
		</div>

		{#if showPortrait}
			<CharacterPortraitField
				{characterId}
				bind:portraitFile
				bind:portraitImageSource
				disabled={loading}
			/>
		{/if}
	</div>

	<div class="identity-details">
		<div class="field field-inline">
			<Label.Root for="character_sheet_alignment">Alignment</Label.Root>
			<select id="character_sheet_alignment" bind:value={identity.alignment}>
				<option value="">Choose alignment…</option>
				{#each CHARACTER_ALIGNMENTS as alignment (alignment)}
					<option value={alignment}>{alignment}</option>
				{/each}
			</select>
		</div>

		{#if mode === 'npc'}
			<div class="field field-inline">
				<Label.Root for="character_sheet_type">Type</Label.Root>
				<select id="character_sheet_type" bind:value={kind} aria-label="NPC type">
					<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
					<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
				</select>
			</div>
		{/if}

		<div class="field field-inline">
			<Label.Root for="character_sheet_class">Class</Label.Root>
			<input id="character_sheet_class" bind:value={identity.class_name} placeholder="Class" />
		</div>

		<div class="field field-inline">
			<Label.Root for="character_sheet_level">Level</Label.Root>
			<input
				id="character_sheet_level"
				type="number"
				min="1"
				max="20"
				step="1"
				bind:value={extras.level}
			/>
		</div>

		{#if mode === 'pc'}
			<div class="field field-inline">
				<Label.Root for="character_sheet_background">Background</Label.Root>
				<input
					id="character_sheet_background"
					bind:value={extras.roleplay.background}
					placeholder="Background"
				/>
			</div>
		{/if}

		{#if mode === 'npc'}
			<div class="field field-inline">
				<Label.Root for="character_sheet_age">Age</Label.Root>
				<input id="character_sheet_age" bind:value={identity.age} placeholder="Age" />
			</div>
		{/if}

		{#if mode === 'npc'}
			<div class="field field-stacked identity-notes">
				<Label.Root for="character_sheet_presentation">Presentation</Label.Root>
				<textarea
					id="character_sheet_presentation"
					bind:value={identity.presentation}
					placeholder="How this character presents — appearance, mannerisms, voice…"
					rows="3"
				></textarea>
			</div>

			<div class="field field-stacked identity-notes">
				<Label.Root for="character_sheet_notes">Notes</Label.Root>
				<textarea
					id="character_sheet_notes"
					bind:value={description}
					placeholder="Optional description or notes"
					rows="4"
				></textarea>
			</div>
		{/if}
	</div>
</section>

<style>
	.template-row {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.template-field {
		flex: 1;
		min-width: min(100%, 14rem);
	}

	.identity-intro {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
	}

	.identity-top {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1fr);
	}

	.identity-details {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
		margin-top: 0.75rem;
	}

	.identity-notes {
		grid-column: 1 / -1;
	}

	.field-inline {
		display: grid;
		gap: var(--space-field);
		grid-template-columns: minmax(0, 1fr);
	}

	.field-stacked {
		display: grid;
		gap: var(--space-field);
		grid-template-columns: minmax(0, 1fr);
	}

	.field-inline :global(label) {
		margin: 0;
	}

	@media (min-width: 40rem) {
		.field-inline {
			grid-template-columns: 6.75rem minmax(0, 1fr);
			align-items: center;
		}

		.identity-top:not(.identity-top-single) {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: start;
		}

		.identity-details {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
