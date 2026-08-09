<script lang="ts">
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
	import CharacterSheetPortraitLayout from '$lib/components/character/CharacterSheetPortraitLayout.svelte';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import { readonlyPresentationText } from '$lib/domain/character-sheet-fields';
	import type { CharacterIdentityDraft } from '$lib/domain/npc-draft';

	type Props = {
		identity?: CharacterIdentityDraft;
		characterId?: string;
		presentationFile?: File | null;
		presentationImageSource?: string | null;
		loading?: boolean;
		readOnly?: boolean;
	};

	let {
		identity = $bindable(),
		characterId,
		presentationFile = $bindable(null),
		presentationImageSource = $bindable(null),
		loading = false,
		readOnly = false
	}: Props = $props();

	const readonlyPresentation = $derived(identity ? readonlyPresentationText(identity) : '');
</script>

<section class="sheet-section presentation-section">
	<h2>Presentation</h2>

	<CharacterSheetPortraitLayout showPortrait>
		{#snippet portrait()}
			<CharacterPortraitField
				variant="presentation"
				{characterId}
				bind:file={presentationFile}
				bind:imageSource={presentationImageSource}
				disabled={loading}
				{readOnly}
			/>
		{/snippet}

		{#if readOnly}
			{#if readonlyPresentation}
				<div class="presentation-fields sheet-portrait-fields">
					<div class="presentation-description-readonly">
						<p class="presentation-description-label">Description</p>
						<p class="presentation-description-text">{readonlyPresentation}</p>
					</div>
				</div>
			{/if}
		{:else if identity}
			<div class="presentation-fields sheet-portrait-fields">
				<div class="presentation-description-field">
					<InlineEditableField
						id="character_sheet_presentation_description"
						label="Description"
						type="textarea"
						wide
						bind:value={identity.presentation}
						placeholder="How this character presents — appearance, mannerisms, voice…"
						disabled={loading}
					/>
				</div>
			</div>
		{/if}
	</CharacterSheetPortraitLayout>
</section>

<style>
	.presentation-description-field,
	.presentation-description-readonly {
		grid-column: 1 / -1;
		min-width: 0;
	}

	.presentation-description-label {
		margin: 0 0 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.presentation-description-text {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.45;
	}
</style>
