<script lang="ts">
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
	import CharacterSheetIdentityReadonly from '$lib/components/character/CharacterSheetIdentityReadonly.svelte';
	import CharacterSheetPortraitLayout from '$lib/components/character/CharacterSheetPortraitLayout.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import InlineEditableSelect from '$lib/components/shared/InlineEditableSelect.svelte';
	import { CHARACTER_ALIGNMENTS } from '$lib/domain/character-alignments';
	import { identityDisplayContext } from '$lib/domain/character-sheet-fields';
	import { applySpeciesToIdentity, resolveIdentitySizeType } from '$lib/domain/species-display';
	import { getSpeciesByName, listSelectableSpecies } from '$lib/games/dnd5e/data/species';
	import { listSelectableClasses } from '$lib/games/dnd5e/data/classes';
	import { getReactiveCatalogSpecies } from '$lib/stores/catalog.svelte';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { CHARACTER_KIND_LABELS } from '$lib/types/schema';
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		sheet: CharacterSheetStore;
		mode?: 'npc' | 'pc';
		characterId?: string;
		showPortrait?: boolean;
		descriptionBeforeNotes?: boolean;
		onPortraitFileChange?: (result: ImageUploadResult) => void;
		loading?: boolean;
		readOnly?: boolean;
	};

	let {
		sheet,
		mode = 'pc',
		characterId,
		showPortrait = true,
		descriptionBeforeNotes = false,
		onPortraitFileChange,
		loading = false,
		readOnly = false
	}: Props = $props();

	const catalogSpecies = $derived.by(() => {
		getReactiveCatalogSpecies();
		return listSelectableSpecies();
	});

	const matchedSpecies = $derived(getSpeciesByName(sheet.identity.race));
	const selectedSpeciesId = $derived(matchedSpecies?.species_id ?? '');
	const sizeTypeLabel = $derived(resolveIdentitySizeType(sheet.identity) || '—');
	const classOptions = $derived(listSelectableClasses(sheet.identity.class_name));
	let speciesSelectId = $derived(selectedSpeciesId);

	function handleSpeciesChange(event: Event & { currentTarget: HTMLSelectElement }) {
		const speciesId = event.currentTarget.value;
		const species = catalogSpecies.find((entry) => entry.species_id === speciesId);
		if (!species) {
			sheet.identity = { ...sheet.identity, race: '', creature_type: '' };
			return;
		}

		sheet.identity = applySpeciesToIdentity(sheet.identity, species);
	}

	const displayContext = $derived(
		identityDisplayContext({
			mode,
			kind: sheet.kind,
			name: sheet.name,
			playerName: sheet.playerName,
			description: sheet.description,
			identity: sheet.identity,
			extras: sheet.extras,
			sizeTypeLabel,
			descriptionBeforeNotes
		})
	);
</script>

<section class="sheet-section identity-section" class:identity-section-readonly={readOnly}>
	<h2>Identity</h2>

	{#if readOnly}
		<CharacterSheetIdentityReadonly
			{displayContext}
			{sheet}
			{characterId}
			{showPortrait}
			{onPortraitFileChange}
		/>
	{:else}
		<CharacterSheetPortraitLayout {showPortrait}>
			{#snippet portrait()}
				<CharacterPortraitField
					{characterId}
					bind:file={sheet.portraitFile}
					bind:imageSource={sheet.portraitImageSource}
					disabled={loading}
					onFileChange={onPortraitFileChange}
				/>
			{/snippet}

			<div class="identity-fields sheet-portrait-fields">
				{#if mode === 'pc'}
					<div class="identity-field-span">
						<InlineEditableField
							id="character_sheet_player_name"
							label="Player name"
							bind:value={sheet.playerName}
							placeholder="Player name"
							disabled={loading}
						/>
					</div>
				{/if}

				<div class="identity-field-row">
					<InlineEditableField
						id="character_sheet_name"
						label="Name"
						bind:value={sheet.name}
						placeholder="Character name"
						truncate
						disabled={loading}
					/>

					<InlineEditableField
						id="character_sheet_age"
						label="Age"
						bind:value={sheet.identity.age}
						placeholder="Age"
						disabled={loading}
					/>
				</div>

				<div class="identity-field-row">
					<InlineEditableSelect
						id="character_sheet_species"
						label="Species"
						bind:value={speciesSelectId}
						displayValue={sheet.identity.race}
						emptyLabel="Choose species…"
						disabled={loading}
						onchange={handleSpeciesChange}
					>
						{#snippet options()}
							{#each catalogSpecies as species (species.species_id)}
								<option value={species.species_id}>{species.species_name}</option>
							{/each}
						{/snippet}
					</InlineEditableSelect>

					<div class="identity-derived-field">
						<span class="identity-derived-label">Size / type</span>
						<p class="identity-derived-value" aria-live="polite">{sizeTypeLabel}</p>
					</div>
				</div>

				<div class="identity-field-row">
					<InlineEditableSelect
						id="character_sheet_class"
						label="Class"
						bind:value={sheet.identity.class_name}
						displayValue={sheet.identity.class_name}
						emptyLabel="Choose class…"
						disabled={loading}
					>
						{#snippet options()}
							{#each classOptions as className (className)}
								<option value={className}>{className}</option>
							{/each}
						{/snippet}
					</InlineEditableSelect>

					<InlineEditableField
						id="character_sheet_level"
						label="Level"
						type="number"
						min={1}
						max={20}
						step={1}
						bind:value={sheet.extras.level}
						placeholder="1"
						disabled={loading}
					/>
				</div>

				<div class="identity-field-row">
					<InlineEditableSelect
						id="character_sheet_alignment"
						label="Alignment"
						bind:value={sheet.identity.alignment}
						displayValue={sheet.identity.alignment}
						emptyLabel="Choose alignment…"
						disabled={loading}
					>
						{#snippet options()}
							{#each CHARACTER_ALIGNMENTS as alignment (alignment)}
								<option value={alignment}>{alignment}</option>
							{/each}
						{/snippet}
					</InlineEditableSelect>

					{#if mode === 'npc'}
						<InlineEditableSelect
							id="character_sheet_type"
							label="Type"
							bind:value={sheet.kind}
							displayValue={CHARACTER_KIND_LABELS[sheet.kind]}
							emptyLabel="Choose type…"
							disabled={loading}
							aria-label="NPC type"
						>
							{#snippet options()}
								<option value="npc_general">{CHARACTER_KIND_LABELS.npc_general}</option>
								<option value="npc_foe">{CHARACTER_KIND_LABELS.npc_foe}</option>
							{/snippet}
						</InlineEditableSelect>
					{/if}
				</div>
			</div>
		</CharacterSheetPortraitLayout>

		<div class="identity-extra-fields">
			{#if mode === 'npc'}
				{#if descriptionBeforeNotes}
					<InlineEditableField
						id="character_sheet_presentation_description"
						label="Description"
						type="textarea"
						wide
						bind:value={sheet.identity.presentation}
						placeholder="How this character presents — appearance, mannerisms, voice…"
						disabled={loading}
					/>
				{/if}

				<InlineEditableField
					id="character_sheet_notes"
					label="Notes"
					type="textarea"
					wide
					bind:value={sheet.description}
					placeholder="Optional description or notes"
					disabled={loading}
				/>
			{/if}
		</div>
	{/if}
</section>

<style>
	.identity-fields,
	.identity-extra-fields {
		display: grid;
		gap: 0.85rem;
	}

	.identity-fields > :global(*) {
		min-width: 0;
	}

	.identity-field-row {
		display: contents;
	}

	.identity-field-span {
		grid-column: 1 / -1;
	}

	.identity-extra-fields {
		margin-top: 1rem;
	}

	.identity-derived-field {
		display: grid;
		gap: 0.2rem;
	}

	.identity-derived-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.identity-derived-value {
		margin: 0;
		padding: 0.1rem 0.2rem;
		line-height: 1.35;
		color: var(--color-text-muted);
	}
</style>
