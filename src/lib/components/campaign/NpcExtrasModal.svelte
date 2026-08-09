<script lang="ts">
	import { Dialog } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import LoadMonsterTemplateModal from '$lib/components/character/LoadMonsterTemplateModal.svelte';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import {
		cloneCharacterIdentity,
		cloneCharacterExtras,
		type CharacterIdentityDraft,
		type CharacterExtrasDraft
	} from '$lib/domain/npc-draft';
	import { createCharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import type { NpcCharacterKind } from '$lib/types/schema';

	type SavePayload = {
		kind: NpcCharacterKind;
		name: string;
		playerName?: string;
		description: string;
		identity: CharacterIdentityDraft;
		extras: CharacterExtrasDraft;
		portraitFile: File | null;
		portraitImageSource: string | null;
		presentationFile: File | null;
		presentationImageSource: string | null;
	};

	type Props = {
		open?: boolean;
		mode?: 'npc' | 'pc';
		kind: NpcCharacterKind;
		name: string;
		playerName?: string;
		description?: string;
		identity: CharacterIdentityDraft;
		extras: CharacterExtrasDraft;
		portraitFile?: File | null;
		portraitImageSource?: string | null;
		presentationFile?: File | null;
		presentationImageSource?: string | null;
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
		presentationFile = null,
		presentationImageSource = null,
		onSave,
		loading = false,
		saving = false
	}: Props = $props();

	const sheet = createCharacterSheetStore();
	let modalInitialized = $state(false);

	$effect(() => {
		if (!open) {
			modalInitialized = false;
			return;
		}

		if (modalInitialized) return;

		sheet.loadFromProps({
			kind,
			name,
			playerName,
			description,
			identity: cloneCharacterIdentity(identity),
			extras: cloneCharacterExtras(extras),
			portraitFile,
			portraitImageSource,
			presentationFile,
			presentationImageSource
		});
		sheet.loading = loading;
		modalInitialized = true;
	});

	async function handleSave() {
		if (saving || loading) return;

		const payload = sheet.cloneForSave();

		await onSave?.({
			kind: payload.kind,
			name: payload.name,
			playerName: mode === 'pc' ? payload.playerName : undefined,
			description: payload.description,
			identity: payload.identity,
			extras: payload.extras,
			portraitFile: payload.portraitFile,
			portraitImageSource: payload.portraitImageSource,
			presentationFile: payload.presentationFile,
			presentationImageSource: payload.presentationImageSource
		});
		open = false;
	}
</script>

<AppDialog bind:open wide>
	{#snippet titleContent()}
		<div class="dialog-title-stack">
			<Dialog.Title>{mode === 'pc' ? 'Add player character' : 'Add NPC'}</Dialog.Title>
			{#if mode === 'npc'}
				<LoadMonsterTemplateModal
					onLoad={(loaded) => sheet.applyMonsterTemplate(loaded)}
					disabled={loading || saving}
				/>
			{/if}
		</div>
	{/snippet}
	<CharacterSheetForm {sheet} {mode} />
	{#snippet footer()}
		<DialogFormFooter
			submitLabel={saving ? 'Saving…' : 'Save'}
			pending={saving}
			disabled={loading}
			submitType="button"
			onSubmit={handleSave}
		/>
	{/snippet}
</AppDialog>

<style>
	.dialog-title-stack {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.dialog-title-stack :global([data-dialog-title]) {
		margin: 0;
	}
</style>
