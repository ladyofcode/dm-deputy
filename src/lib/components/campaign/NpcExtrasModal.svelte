<script lang="ts">
	import { Button, Dialog, Tooltip } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import {
		cloneCharacterIdentity,
		cloneNpcExtras,
		createDefaultCharacterIdentity,
		createDefaultNpcExtras,
		type CharacterIdentityDraft,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import type { NpcCharacterKind } from '$lib/types/schema';

	type SavePayload = {
		kind: NpcCharacterKind;
		name: string;
		playerName?: string;
		description: string;
		identity: CharacterIdentityDraft;
		extras: NpcExtrasDraft;
		portraitFile: File | null;
		portraitImageSource: string | null;
	};

	type Props = {
		open?: boolean;
		mode?: 'npc' | 'pc';
		kind: NpcCharacterKind;
		name: string;
		playerName?: string;
		description?: string;
		identity: CharacterIdentityDraft;
		extras: NpcExtrasDraft;
		portraitFile?: File | null;
		portraitImageSource?: string | null;
		onSave?: (payload: SavePayload) => void | Promise<void>;
		loading?: boolean;
		saving?: boolean;
	};

	let {
		open = $bindable(false),
		mode = 'npc',
		kind,
		name,
		playerName = '',
		description = '',
		identity,
		extras,
		portraitFile = null,
		portraitImageSource = null,
		onSave,
		loading = false,
		saving = false
	}: Props = $props();

	let modalKind = $state<NpcCharacterKind>('npc_general');
	let modalName = $state('');
	let modalPlayerName = $state('');
	let modalDescription = $state('');
	let modalIdentity = $state(createDefaultCharacterIdentity());
	let draft = $state(createDefaultNpcExtras());
	let modalPortraitFile = $state<File | null>(null);
	let modalPortraitImageSource = $state<string | null>(null);
	let modalInitialized = $state(false);

	$effect(() => {
		if (!open) {
			modalInitialized = false;
			return;
		}

		if (modalInitialized) return;

		modalKind = kind;
		modalName = name;
		modalPlayerName = playerName;
		modalDescription = description;
		modalIdentity = cloneCharacterIdentity(identity);
		draft = cloneNpcExtras(extras);
		modalPortraitFile = portraitFile;
		modalPortraitImageSource = portraitImageSource;
		modalInitialized = true;
	});

	async function handleSave() {
		if (saving || loading) return;

		if (draft.hp_max > 0 && draft.hp_current === 0) {
			draft = { ...draft, hp_current: draft.hp_max };
		}

		const payload = {
			kind: modalKind,
			name: modalName.trim(),
			playerName: mode === 'pc' ? modalPlayerName.trim() : undefined,
			description: modalDescription.trim(),
			identity: cloneCharacterIdentity(modalIdentity),
			extras: cloneNpcExtras(draft),
			portraitFile: modalPortraitFile,
			portraitImageSource: modalPortraitImageSource
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
			<Dialog.Title>{mode === 'pc' ? 'Add player character' : 'Add NPC'}</Dialog.Title>

			<Tooltip.Provider delayDuration={200}>
				<CharacterSheetForm
					{mode}
					bind:kind={modalKind}
					bind:name={modalName}
					bind:playerName={modalPlayerName}
					bind:description={modalDescription}
					bind:identity={modalIdentity}
					bind:extras={draft}
					bind:portraitFile={modalPortraitFile}
					bind:portraitImageSource={modalPortraitImageSource}
					{loading}
				/>
			</Tooltip.Provider>

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
