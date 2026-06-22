<script lang="ts">
	import { Button, Dialog, Label } from 'bits-ui';
	import {
		ARMOR_CATEGORY_LABELS,
		ARMOR_DEX_LABELS,
		COST_CURRENCY_LABELS,
		createArmorDraft,
		createItemDraft,
		createSpellDraft,
		createWeaponDraft,
		DAMAGE_TYPE_LABELS,
		ITEM_CATEGORY_LABELS,
		SPELL_SCHOOL_LABELS,
		WEAPON_CATEGORY_LABELS,
		type CatalogKind
	} from '$lib/domain/catalog';
	import { persistArmor, persistItem, persistSpell, persistWeapon } from '$lib/data/catalog-writes';
	import type { Armor, Item, Spell, Weapon } from '$lib/types/schema';

	type Props = {
		open?: boolean;
		kind: CatalogKind;
		entry?: Spell | Weapon | Armor | Item | null;
		onSaved?: () => void;
	};

	let { open = $bindable(false), kind, entry = null, onSaved }: Props = $props();

	let saving = $state(false);
	let error = $state<string | null>(null);
	let spellDraft = $state<Spell>(createSpellDraft());
	let weaponDraft = $state<Weapon>(createWeaponDraft());
	let armorDraft = $state<Armor>(createArmorDraft());
	let itemDraft = $state<Item>(createItemDraft());

	const isEdit = $derived(entry !== null);

	const title = $derived.by(() => {
		const label =
			kind === 'spells'
				? 'spell'
				: kind === 'weapons'
					? 'weapon'
					: kind === 'armor'
						? 'armor'
						: 'item';
		return `${isEdit ? 'Edit' : 'Add'} ${label}`;
	});

	$effect(() => {
		if (!open) return;

		error = null;

		if (kind === 'spells') {
			spellDraft = createSpellDraft(entry as Spell | null);
		} else if (kind === 'weapons') {
			weaponDraft = createWeaponDraft(entry as Weapon | null);
		} else if (kind === 'armor') {
			armorDraft = createArmorDraft(entry as Armor | null);
		} else {
			itemDraft = createItemDraft(entry as Item | null);
		}
	});

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		saving = true;
		error = null;

		try {
			if (kind === 'spells') {
				if (!spellDraft.spell_name.trim()) {
					throw new Error('Spell name is required');
				}
				await persistSpell({ ...spellDraft, spell_name: spellDraft.spell_name.trim() });
			} else if (kind === 'weapons') {
				if (!weaponDraft.weapon_name.trim()) {
					throw new Error('Weapon name is required');
				}
				await persistWeapon({ ...weaponDraft, weapon_name: weaponDraft.weapon_name.trim() });
			} else if (kind === 'armor') {
				if (!armorDraft.armor_name.trim()) {
					throw new Error('Armor name is required');
				}
				await persistArmor({ ...armorDraft, armor_name: armorDraft.armor_name.trim() });
			} else {
				if (!itemDraft.item_name.trim()) {
					throw new Error('Item name is required');
				}
				await persistItem({ ...itemDraft, item_name: itemDraft.item_name.trim() });
			}

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
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				Homebrew and custom ruleset entries are stored in your local database.
			</Dialog.Description>

			<form onsubmit={handleSave}>
				{#if kind === 'spells'}
					<div class="form-grid">
						<div class="field">
							<Label.Root for="spell_name">Name</Label.Root>
							<input id="spell_name" bind:value={spellDraft.spell_name} required />
						</div>
						<div class="field">
							<Label.Root for="spell_level">Level</Label.Root>
							<input
								id="spell_level"
								type="number"
								min="0"
								max="9"
								bind:value={spellDraft.spell_level}
							/>
						</div>
						<div class="field">
							<Label.Root for="spell_school">School</Label.Root>
							<select id="spell_school" bind:value={spellDraft.spell_school}>
								{#each Object.entries(SPELL_SCHOOL_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field field-check">
							<label>
								<input type="checkbox" bind:checked={spellDraft.is_ritual} />
								Ritual
							</label>
						</div>
						<div class="field">
							<Label.Root for="casting_time">Casting time</Label.Root>
							<input id="casting_time" bind:value={spellDraft.casting_time} />
						</div>
						<div class="field">
							<Label.Root for="spell_range">Range</Label.Root>
							<input id="spell_range" bind:value={spellDraft.range} />
						</div>
						<div class="field">
							<Label.Root for="components">Components</Label.Root>
							<input id="components" bind:value={spellDraft.components} />
						</div>
						<div class="field">
							<Label.Root for="duration">Duration</Label.Root>
							<input id="duration" bind:value={spellDraft.duration} />
						</div>
						<div class="field field-wide">
							<Label.Root for="description">Description</Label.Root>
							<textarea id="description" rows="4" bind:value={spellDraft.description}></textarea>
						</div>
					</div>
				{:else if kind === 'weapons'}
					<div class="form-grid">
						<div class="field">
							<Label.Root for="weapon_name">Name</Label.Root>
							<input id="weapon_name" bind:value={weaponDraft.weapon_name} required />
						</div>
						<div class="field">
							<Label.Root for="weapon_category">Category</Label.Root>
							<select id="weapon_category" bind:value={weaponDraft.weapon_category}>
								{#each Object.entries(WEAPON_CATEGORY_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="damage_dice">Damage</Label.Root>
							<input id="damage_dice" bind:value={weaponDraft.damage_dice} />
						</div>
						<div class="field">
							<Label.Root for="damage_type">Damage type</Label.Root>
							<select id="damage_type" bind:value={weaponDraft.damage_type}>
								{#each Object.entries(DAMAGE_TYPE_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="weapon_cost">Cost</Label.Root>
							<input
								id="weapon_cost"
								type="number"
								min="0"
								step="0.01"
								bind:value={weaponDraft.cost}
							/>
						</div>
						<div class="field">
							<Label.Root for="weapon_cost_currency">Currency</Label.Root>
							<select id="weapon_cost_currency" bind:value={weaponDraft.cost_currency}>
								<option value="">—</option>
								{#each Object.entries(COST_CURRENCY_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="weapon_weight">Weight (lb)</Label.Root>
							<input
								id="weapon_weight"
								type="number"
								min="0"
								step="0.1"
								bind:value={weaponDraft.weight}
							/>
						</div>
						<div class="field field-wide">
							<Label.Root for="properties">Properties</Label.Root>
							<input id="properties" bind:value={weaponDraft.properties} />
						</div>
					</div>
				{:else if kind === 'armor'}
					<div class="form-grid">
						<div class="field">
							<Label.Root for="armor_name">Name</Label.Root>
							<input id="armor_name" bind:value={armorDraft.armor_name} required />
						</div>
						<div class="field">
							<Label.Root for="armor_category">Category</Label.Root>
							<select id="armor_category" bind:value={armorDraft.armor_category}>
								{#each Object.entries(ARMOR_CATEGORY_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="armor_class">AC</Label.Root>
							<input id="armor_class" type="number" min="0" bind:value={armorDraft.armor_class} />
						</div>
						<div class="field">
							<Label.Root for="armor_class_dexterity">Dex bonus</Label.Root>
							<select id="armor_class_dexterity" bind:value={armorDraft.armor_class_dexterity}>
								{#each Object.entries(ARMOR_DEX_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="armor_cost">Cost (gp)</Label.Root>
							<input id="armor_cost" type="number" min="0" bind:value={armorDraft.cost} />
						</div>
						<div class="field">
							<Label.Root for="armor_weight">Weight (lb)</Label.Root>
							<input
								id="armor_weight"
								type="number"
								min="0"
								step="0.1"
								bind:value={armorDraft.weight}
							/>
						</div>
						<div class="field field-wide">
							<Label.Root for="body_location">Body location</Label.Root>
							<input id="body_location" bind:value={armorDraft.body_location} />
						</div>
					</div>
				{:else}
					<div class="form-grid">
						<div class="field">
							<Label.Root for="item_name">Name</Label.Root>
							<input id="item_name" bind:value={itemDraft.item_name} required />
						</div>
						<div class="field">
							<Label.Root for="item_category">Category</Label.Root>
							<select id="item_category" bind:value={itemDraft.item_category}>
								{#each Object.entries(ITEM_CATEGORY_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="item_subcategory">Subcategory</Label.Root>
							<input id="item_subcategory" bind:value={itemDraft.item_subcategory} />
						</div>
						<div class="field">
							<Label.Root for="item_cost">Cost</Label.Root>
							<input id="item_cost" type="number" min="0" step="0.01" bind:value={itemDraft.cost} />
						</div>
						<div class="field">
							<Label.Root for="item_cost_currency">Currency</Label.Root>
							<select id="item_cost_currency" bind:value={itemDraft.cost_currency}>
								{#each Object.entries(COST_CURRENCY_LABELS) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<Label.Root for="item_weight">Weight (lb)</Label.Root>
							<input
								id="item_weight"
								type="number"
								min="0"
								step="0.1"
								bind:value={itemDraft.weight}
							/>
						</div>
						<div class="field">
							<Label.Root for="speed">Speed</Label.Root>
							<input id="speed" bind:value={itemDraft.speed} />
						</div>
						<div class="field">
							<Label.Root for="carrying_capacity">Carrying capacity</Label.Root>
							<input id="carrying_capacity" bind:value={itemDraft.carrying_capacity} />
						</div>
					</div>
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

	.field-check {
		display: flex;
		align-items: flex-end;
	}

	.field-check label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
