<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import {
		cloneNpcExtras,
		createDefaultNpcExtras,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import type { NpcCharacterKind } from '$lib/types/schema';

	type SavePayload = {
		kind: NpcCharacterKind;
		name: string;
		description: string;
		extras: NpcExtrasDraft;
	};

	type Props = {
		open?: boolean;
		mode?: 'npc' | 'pc';
		kind: NpcCharacterKind;
		name: string;
		description?: string;
		extras: NpcExtrasDraft;
		onSave?: (payload: SavePayload) => void | Promise<void>;
		loading?: boolean;
		saving?: boolean;
	};

	let {
		open = $bindable(false),
		mode = 'npc',
		kind,
		name,
		description = '',
		extras,
		onSave,
		loading = false,
		saving = false
	}: Props = $props();

	let modalKind = $state<NpcCharacterKind>('npc_general');
	let modalName = $state('');
	let modalDescription = $state('');
	let draft = $state<NpcExtrasDraft>(createDefaultNpcExtras());

	$effect(() => {
		if (!open) return;

		modalKind = kind;
		modalName = name;
		modalDescription = description;
		draft = cloneNpcExtras(extras);
	});

	async function handleSave() {
		if (saving || loading) return;

		if (draft.hp_max > 0 && draft.hp_current === 0) {
			draft = { ...draft, hp_current: draft.hp_max };
		}

		const payload = {
			kind: modalKind,
			name: modalName.trim(),
			description: modalDescription.trim(),
			extras: cloneNpcExtras(draft)
		};

		try {
			await onSave?.(payload);
			open = false;
		} catch {}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>
				{modalName.trim() ? modalName : mode === 'pc' ? 'Player character sheet' : 'NPC sheet'}
			</Dialog.Title>
			<Dialog.Description>
				{#if mode === 'pc'}
					Name and optional combat stats or equipment from the rules catalog.
				{:else}
					Type, name, and optional combat stats or equipment from the rules catalog.
				{/if}
			</Dialog.Description>

			<CharacterSheetForm
				{mode}
				bind:kind={modalKind}
				bind:name={modalName}
				bind:description={modalDescription}
				bind:extras={draft}
				{loading}
			/>

			<div class="dialog-footer">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button.Root {...props} type="button" disabled={saving}>Cancel</Button.Root>
					{/snippet}
				</Dialog.Close>
				<Button.Root
					type="button"
					data-variant="primary"
					disabled={loading || saving}
					onclick={handleSave}
				>
					{saving ? 'Saving…' : 'Save'}
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
