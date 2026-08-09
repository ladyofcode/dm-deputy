<script lang="ts">
	import { Button } from 'bits-ui';
	import InlineEditableField from '$lib/components/shared/InlineEditableField.svelte';

	type Props = {
		weaponNames?: string[];
		armorName?: string;
	};

	let { weaponNames = $bindable(['']), armorName = $bindable('') }: Props = $props();

	function updateWeaponName(index: number, value: string) {
		weaponNames = weaponNames.map((entry, entryIndex) => (entryIndex === index ? value : entry));
	}

	function addWeaponName() {
		weaponNames = [...weaponNames, ''];
	}

	function removeWeaponName(index: number) {
		weaponNames =
			weaponNames.length <= 1 ? [''] : weaponNames.filter((_, entryIndex) => entryIndex !== index);
	}
</script>

<section class="sheet-section">
	<h2>Template metadata</h2>

	<div class="metadata-grid">
		<InlineEditableField
			id="template_armor_name"
			label="Default armor"
			layout="inline"
			bind:value={armorName}
			placeholder="Leather"
		/>
	</div>

	<div class="weapon-names">
		<span class="weapon-names-heading">Default weapons</span>
		<div class="weapon-name-lines">
			{#each weaponNames as weaponName, index (index)}
				<div class="weapon-name-line">
					<InlineEditableField
						hideLabel
						value={weaponName}
						oncommit={(next) => updateWeaponName(index, typeof next === 'string' ? next : '')}
						placeholder="Morningstar"
						aria-label="Default weapon {index + 1}"
					/>
					<Button.Root type="button" data-variant="ghost" onclick={() => removeWeaponName(index)}>
						Remove
					</Button.Root>
				</div>
			{/each}
		</div>
		<Button.Root type="button" data-variant="ghost" onclick={addWeaponName}>Add weapon</Button.Root>
	</div>
</section>

<style>
	.metadata-grid {
		display: grid;
		gap: 0.75rem;
	}

	.weapon-names {
		margin-bottom: 0.75rem;
	}

	.weapon-names-heading {
		display: block;
		margin-bottom: 0.35rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.weapon-name-lines {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.weapon-name-line {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.weapon-name-line :global(.inline-editable-field) {
		flex: 1;
		min-width: 0;
		margin-bottom: 0;
	}

	@media (--layout) {
		.metadata-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.weapon-names {
			grid-column: 1 / -1;
		}
	}
</style>
