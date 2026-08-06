<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Character } from '$lib/types/schema';

	type Props = {
		href: string;
		character: Character;
		subtitle?: string | null;
		defaultLevel?: number;
		removing: boolean;
		removeBusyLabel?: string;
		removeIdleLabel?: string;
		removeAriaLabel: string;
		onRemove: () => void;
	};

	let {
		href,
		character,
		subtitle = null,
		defaultLevel = 0,
		removing,
		removeBusyLabel = 'Removing…',
		removeIdleLabel = 'Remove',
		removeAriaLabel,
		onRemove
	}: Props = $props();

	const summary = $derived.by(() => {
		const parts: string[] = [];

		if (character.level > defaultLevel) parts.push(`Level ${character.level}`);
		if (character.hp_max > 0) parts.push(`HP ${character.hp_current}/${character.hp_max}`);
		if (character.experience > 0) parts.push(`${character.experience} XP`);
		if (character.reputation) parts.push(character.reputation);

		return parts.length ? parts.join(' · ') : null;
	});
</script>

<li class="character-list-item">
	<a class="character-main" {href}>
		<span class="character-name">{character.display_name}</span>
		{#if subtitle}
			<p class="character-subtitle">{subtitle}</p>
		{/if}
		{#if summary}
			<p class="character-summary">{summary}</p>
		{/if}
	</a>
	<Button.Root
		type="button"
		data-variant="ghost"
		disabled={removing}
		onclick={onRemove}
		aria-label={removeAriaLabel}
	>
		{removing ? removeBusyLabel : removeIdleLabel}
	</Button.Root>
</li>

<style>
	.character-list-item {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: start;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.character-main {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
		padding: 0;
		text-decoration: none;
		color: inherit;
	}

	.character-main:hover .character-name {
		color: var(--color-accent);
	}

	.character-name {
		font-weight: 600;
	}

	.character-subtitle,
	.character-summary {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
