<script lang="ts">
	import { Label } from 'bits-ui';
	import type {
		CharacterIdentityDraft,
		CharacterPhysicalDraft,
		CharacterRoleplayDraft
	} from '$lib/domain/npc-draft';

	type Props = {
		identity?: CharacterIdentityDraft;
		physical?: CharacterPhysicalDraft;
		roleplay?: CharacterRoleplayDraft;
		description?: string;
		disabled?: boolean;
	};

	let {
		identity = $bindable(),
		physical = $bindable(),
		roleplay = $bindable(),
		description = $bindable(''),
		disabled = false
	}: Props = $props();
</script>

{#if identity && physical && roleplay}
	<section class="sheet-section">
		<h2>Appearance &amp; body</h2>
		<div class="detail-grid">
			<div class="field field-inline">
				<Label.Root for="pc_sheet_age">Age</Label.Root>
				<input id="pc_sheet_age" bind:value={identity.age} placeholder="Age" disabled={disabled} />
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_height">Height</Label.Root>
				<input id="pc_sheet_height" bind:value={physical.height} placeholder="5 ft. 8 in." disabled={disabled} />
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_weight">Weight</Label.Root>
				<input id="pc_sheet_weight" bind:value={physical.weight} placeholder="145 lb." disabled={disabled} />
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_eyes">Eyes</Label.Root>
				<input id="pc_sheet_eyes" bind:value={physical.eyes} disabled={disabled} />
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_skin">Skin</Label.Root>
				<input id="pc_sheet_skin" bind:value={physical.skin} disabled={disabled} />
			</div>
			<div class="field field-inline">
				<Label.Root for="pc_sheet_hair">Hair</Label.Root>
				<input id="pc_sheet_hair" bind:value={physical.hair} disabled={disabled} />
			</div>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_presentation">Appearance notes</Label.Root>
			<textarea
				id="pc_sheet_presentation"
				bind:value={identity.presentation}
				placeholder="Mannerisms, voice, distinguishing marks…"
				rows="3"
				disabled={disabled}
			></textarea>
		</div>
	</section>

	<section class="sheet-section">
		<h2>Character story</h2>
		<div class="detail-grid">
			<div class="field field-inline">
				<Label.Root for="pc_sheet_background">Background</Label.Root>
				<input
					id="pc_sheet_background"
					bind:value={roleplay.background}
					placeholder="Soldier, Sage, Criminal…"
					disabled={disabled}
				/>
			</div>
		</div>
		<div class="story-grid">
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_personality">Personality traits</Label.Root>
				<textarea
					id="pc_sheet_personality"
					bind:value={roleplay.personality_traits}
					rows="3"
					disabled={disabled}
				></textarea>
			</div>
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_ideals">Ideals</Label.Root>
				<textarea id="pc_sheet_ideals" bind:value={roleplay.ideals} rows="3" disabled={disabled}></textarea>
			</div>
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_bonds">Bonds</Label.Root>
				<textarea id="pc_sheet_bonds" bind:value={roleplay.bonds} rows="3" disabled={disabled}></textarea>
			</div>
			<div class="field field-stacked">
				<Label.Root for="pc_sheet_flaws">Flaws</Label.Root>
				<textarea id="pc_sheet_flaws" bind:value={roleplay.flaws} rows="3" disabled={disabled}></textarea>
			</div>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_backstory">Backstory</Label.Root>
			<textarea id="pc_sheet_backstory" bind:value={roleplay.backstory} rows="5" disabled={disabled}></textarea>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_allies">Allies &amp; organizations</Label.Root>
			<textarea id="pc_sheet_allies" bind:value={roleplay.allies} rows="4" disabled={disabled}></textarea>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_features">Features &amp; traits</Label.Root>
			<textarea
				id="pc_sheet_features"
				bind:value={roleplay.features}
				placeholder="Racial traits, class features, feats…"
				rows="5"
				disabled={disabled}
			></textarea>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_proficiencies">Proficiencies &amp; languages</Label.Root>
			<textarea
				id="pc_sheet_proficiencies"
				bind:value={roleplay.proficiencies}
				placeholder="Armor, weapons, tools, languages…"
				rows="3"
				disabled={disabled}
			></textarea>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_treasure">Treasure &amp; currency</Label.Root>
			<textarea
				id="pc_sheet_treasure"
				bind:value={roleplay.treasure}
				placeholder="125 gp, ruby pendant, deed to a windmill…"
				rows="3"
				disabled={disabled}
			></textarea>
		</div>
		<div class="field field-stacked">
			<Label.Root for="pc_sheet_notes">DM / session notes</Label.Root>
			<textarea
				id="pc_sheet_notes"
				bind:value={description}
				placeholder="Private notes, reminders, ongoing plot hooks…"
				rows="4"
				disabled={disabled}
			></textarea>
		</div>
	</section>
{/if}

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

	.field-stacked {
		margin-bottom: 0.75rem;
	}

	@media (min-width: 48rem) {
		.detail-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
