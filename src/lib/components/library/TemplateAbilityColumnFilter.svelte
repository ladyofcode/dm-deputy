<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import FilterIcon from '$lib/components/icons/FilterIcon.svelte';
	import type { AbilityScores } from '$lib/types/schema';

	type AbilityKey = keyof AbilityScores;

	type Props = {
		abilityKeys: AbilityKey[];
		visibleAbilities?: AbilityKey[];
	};

	let { abilityKeys, visibleAbilities = $bindable([]) }: Props = $props();

	const hasSelection = $derived(visibleAbilities.length > 0);

	function isVisible(key: AbilityKey): boolean {
		return visibleAbilities.includes(key);
	}

	function toggleAbility(key: AbilityKey, checked: boolean) {
		visibleAbilities = checked
			? abilityKeys.filter((entry) => visibleAbilities.includes(entry) || entry === key)
			: visibleAbilities.filter((entry) => entry !== key);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="library-filter-button"
				class:library-filter-button--active={hasSelection}
				aria-label="Choose ability columns"
			>
				<FilterIcon />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content
			class="popover-surface template-ability-filter-menu"
			sideOffset={8}
			align="end"
		>
			<fieldset class="template-ability-filter-fieldset">
				<legend class="template-ability-filter-legend">Ability columns</legend>
				{#each abilityKeys as key (key)}
					<label class="template-ability-option">
						<input
							type="checkbox"
							checked={isVisible(key)}
							onchange={(event) => toggleAbility(key, event.currentTarget.checked)}
						/>
						<span>{key.toUpperCase()}</span>
					</label>
				{/each}
			</fieldset>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	.library-filter-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 2.75rem;
		min-block-size: 2.75rem;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text-muted);
		cursor: pointer;
		box-shadow: none;
	}

	.library-filter-button:hover,
	.library-filter-button:focus-visible {
		border-color: var(--color-accent);
		color: var(--color-accent);
		outline: none;
	}

	.library-filter-button--active {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	:global(.template-ability-filter-menu) {
		min-width: 10rem;
		padding: 0.65rem 0.75rem;
	}

	.template-ability-filter-fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		display: grid;
		gap: 0.45rem;
	}

	.template-ability-filter-legend {
		margin: 0 0 0.35rem;
		padding: 0;
		font-family: var(--font-heading);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.template-ability-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.template-ability-option input {
		margin: 0;
	}
</style>
