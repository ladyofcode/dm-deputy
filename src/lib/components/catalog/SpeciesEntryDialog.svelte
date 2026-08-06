<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import { createSpeciesDraft, formatTraitEffect } from '$lib/domain/catalog';
	import { persistSpecies } from '$lib/data/catalog-writes';
	import { getCachedSkills } from '$lib/db/catalog-cache';
	import type { Species } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		entry?: Species | null;
		onSaved?: () => void;
	};

	let { open = $bindable(false), entry = null, onSaved }: Props = $props();

	let saving = $state(false);
	let error = $state<string | null>(null);
	let draft = $state<Species>(createSpeciesDraft());

	const isEdit = $derived(entry !== null);
	const skills = $derived(getCachedSkills());

	$effect(() => {
		if (!open) return;
		error = null;
		draft = createSpeciesDraft(entry);
	});

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		saving = true;
		error = null;

		try {
			if (!draft.species_name.trim()) {
				throw new Error('Species name is required');
			}

			await persistSpecies({
				...draft,
				species_name: draft.species_name.trim()
			});

			open = false;
			onSaved?.();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save entry';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>{isEdit ? 'Edit' : 'Add'} species</Dialog.Title>
			<Dialog.Description>
				Species traits and mechanical effects are stored in your local rules catalog.
			</Dialog.Description>

			<form onsubmit={handleSave}>
				<div class="form-grid">
					<div class="field">
						<Label.Root for="species_name">Name</Label.Root>
						<input id="species_name" bind:value={draft.species_name} required />
					</div>
					<div class="field">
						<Label.Root for="creature_type">Creature type</Label.Root>
						<input id="creature_type" bind:value={draft.creature_type} />
					</div>
					<div class="field">
						<Label.Root for="size">Size</Label.Root>
						<input id="size" bind:value={draft.size} />
					</div>
					<div class="field">
						<Label.Root for="speed">Speed</Label.Root>
						<input id="speed" bind:value={draft.speed} />
					</div>
					<div class="field field-wide">
						<Label.Root for="species_description">Description</Label.Root>
						<textarea id="species_description" rows="5" bind:value={draft.description}></textarea>
					</div>
				</div>

				{#if draft.traits.length}
					<section class="traits-section">
						<h3>Traits</h3>
						<ul class="traits-list">
							{#each draft.traits as trait (trait.trait_id)}
								<li>
									<p class="trait-name">{trait.trait_name}</p>
									<p class="trait-description">{trait.description}</p>
									{#if trait.effects.length}
										<ul class="effects-list">
											{#each trait.effects as effect (effect.effect_id)}
												<li>{formatTraitEffect(effect, skills)}</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if error}
					<p class="hint error" role="alert">{error}</p>
				{/if}

				<div class="dialog-footer">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button.Root {...props} type="button">Cancel</Button.Root>
						{/snippet}
					</Dialog.Close>
					<Button.Root type="submit" data-variant="primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</Button.Root>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	form {
		display: grid;
		gap: var(--space-section);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
	}

	.field-wide {
		grid-column: 1 / -1;
	}

	.traits-section h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.traits-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.75rem;
	}

	.traits-list > li {
		padding: 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface-muted, var(--color-surface));
	}

	.trait-name {
		margin: 0 0 0.25rem;
		font-weight: 600;
	}

	.trait-description {
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.95rem;
	}

	.effects-list {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
		font-size: 0.9rem;
		color: var(--color-text-muted, inherit);
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
