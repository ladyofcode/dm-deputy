<script lang="ts">
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';
	import { PHYSICAL_FIELD_CONFIG, STORY_FIELD_CONFIG } from '$lib/domain/character-sheet-fields';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import type { CharacterRoleplayDraft } from '$lib/domain/npc-draft';

	type Props = {
		sheet: CharacterSheetStore;
		disabled?: boolean;
	};

	let { sheet, disabled = false }: Props = $props();
</script>

<section class="sheet-section">
	<h2>Appearance &amp; body</h2>
	<div class="detail-grid stats-grid--dense">
		{#each PHYSICAL_FIELD_CONFIG as field (field.id)}
			<InlineEditableField
				id={field.id}
				label={field.label}
				layout="inline"
				bind:value={sheet.extras.physical[field.key]}
				placeholder={field.placeholder}
				{disabled}
			/>
		{/each}
	</div>
	<InlineEditableField
		id="pc_sheet_presentation"
		label="Appearance notes"
		type="textarea"
		wide
		rows={3}
		bind:value={sheet.identity.presentation}
		placeholder="Mannerisms, voice, distinguishing marks…"
		{disabled}
	/>
</section>

<section class="sheet-section">
	<h2>Character story</h2>
	<div class="detail-grid">
		<InlineEditableField
			id="pc_sheet_background"
			label="Background"
			layout="inline"
			bind:value={sheet.extras.roleplay.background}
			placeholder="Soldier, Sage, Criminal…"
			{disabled}
		/>
	</div>
	<div class="story-grid">
		{#each STORY_FIELD_CONFIG.filter((field) => field.key !== 'description') as field (field.id)}
			<InlineEditableField
				id={field.id}
				label={field.label}
				type="textarea"
				wide
				rows={field.rows}
				bind:value={sheet.extras.roleplay[field.key as keyof CharacterRoleplayDraft]}
				placeholder={field.placeholder}
				{disabled}
			/>
		{/each}
	</div>
	<InlineEditableField
		id="pc_sheet_notes"
		label="DM / session notes"
		type="textarea"
		wide
		rows={4}
		bind:value={sheet.description}
		placeholder="Private notes, reminders, ongoing plot hooks…"
		{disabled}
	/>
</section>

<style>
	.detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.story-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	@media (--desktop) {
		.detail-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
