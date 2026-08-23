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
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type SavePayload = {
		kind: NpcCharacterKind;
		name: string;
		playerName?: string;
		description: string;
		identity: CharacterIdentityDraft;
		extras: CharacterExtrasDraft;
		portraitFile: File | null;
		portraitThumbCropFile: File | null;
		portraitThumbCropRect: import('$lib/domain/crop-image').NormalizedCropRect | null;
		portraitImageSource: string | null;
		presentationFile: File | null;
		presentationThumbCropFile: File | null;
		presentationThumbCropRect: import('$lib/domain/crop-image').NormalizedCropRect | null;
		presentationImageSource: string | null;
		portraitExistingMediaId: string | null;
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
		portraitThumbCropFile?: File | null;
		portraitThumbCropRect?: import('$lib/domain/crop-image').NormalizedCropRect | null;
		portraitImageSource?: string | null;
		presentationFile?: File | null;
		presentationThumbCropFile?: File | null;
		presentationThumbCropRect?: import('$lib/domain/crop-image').NormalizedCropRect | null;
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
		portraitThumbCropFile = null,
		portraitThumbCropRect = null,
		portraitImageSource = null,
		presentationFile = null,
		presentationThumbCropFile = null,
		presentationThumbCropRect = null,
		presentationImageSource = null,
		onSave,
		loading = false,
		saving = false
	}: Props = $props();

	const sheet = createCharacterSheetStore();
	let modalInitialized = $state(false);
	let portraitExistingMediaId = $state<string | null>(null);

	function handlePortraitFileChange(result: ImageUploadResult) {
		portraitExistingMediaId = result.existingMediaId ?? null;
	}

	$effect(() => {
		if (!open) {
			modalInitialized = false;
			return;
		}

		if (modalInitialized) return;

		portraitExistingMediaId = null;

		sheet.loadFromProps({
			kind,
			name,
			playerName,
			description,
			identity: cloneCharacterIdentity(identity),
			extras: cloneCharacterExtras(extras),
			portraitFile,
			portraitThumbCropFile,
			portraitThumbCropRect,
			portraitImageSource,
			presentationFile,
			presentationThumbCropFile,
			presentationThumbCropRect,
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
			portraitThumbCropFile: payload.portraitThumbCropFile,
			portraitThumbCropRect: payload.portraitThumbCropRect,
			portraitImageSource: payload.portraitImageSource,
			presentationFile: payload.presentationFile,
			presentationThumbCropFile: payload.presentationThumbCropFile,
			presentationThumbCropRect: payload.presentationThumbCropRect,
			presentationImageSource: payload.presentationImageSource,
			portraitExistingMediaId
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
	<CharacterSheetForm {sheet} {mode} onPortraitFileChange={handlePortraitFileChange} />
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
