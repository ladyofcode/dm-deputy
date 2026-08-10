<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import CharacterSheetPageShell from '$lib/components/character/CharacterSheetPageShell.svelte';
	import LoadMonsterTemplateModal from '$lib/components/character/LoadMonsterTemplateModal.svelte';
	import {
		getCampaignById,
		getCharacterById,
		getPrimaryCampaignIdForCharacter,
		isAccessibleCharacter
	} from '$lib/data';
	import { getCampaignDisplayName } from '$lib/domain/display-names';
	import { formatErrorMessage } from '$lib/domain/errors';
	import { sanitizeReturnTo } from '$lib/navigation/hrefs';
	import { loadCharacterStatEvents } from '$lib/data/character-stats-persistence';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import { persistPendingCharacterMedia } from '$lib/domain/character-media';
	import { updateCampaignCharacter } from '$lib/data/writes';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { createCharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { setupCharacterSheetAutoSave } from '$lib/stores/autosave.svelte';
	import { database } from '$lib/stores/database.svelte';
	import { isNpcCharacterKind } from '$lib/types/schema';

	const sheet = createCharacterSheetStore();

	const characterId = $derived(page.params.characterId ?? '');

	const character = $derived.by(() => {
		if (!database.isReady) return undefined;
		trackCampaignCharactersRevision();
		return getCharacterById(characterId);
	});

	const campaignId = $derived.by(() => {
		if (!database.isReady || !character) return null;
		return getPrimaryCampaignIdForCharacter(character.character_id);
	});

	const campaign = $derived.by(() => {
		if (!campaignId) return undefined;
		return getCampaignById(campaignId);
	});

	const isValidCharacter = $derived(
		Boolean(character && isAccessibleCharacter(character.character_id))
	);

	const campaignLabel = $derived(campaign ? getCampaignDisplayName(campaign) : 'Unassigned');

	const returnTo = $derived(sanitizeReturnTo(page.url.searchParams.get('from')));

	const backHref = $derived(returnTo ?? resolve('/library/players'));

	const backLabel = $derived.by(() => {
		if (!returnTo) return 'Library';
		if (returnTo.includes('/campaigns/') && campaign) {
			return getCampaignDisplayName(campaign);
		}
		return 'Back';
	});

	const sheetMode = $derived(character?.kind && isNpcCharacterKind(character.kind) ? 'npc' : 'pc');

	let loadedSheetForCharacterId = $state<string | null>(null);

	$effect(() => {
		if (!database.isReady) return;

		const id = characterId;
		if (!id) {
			loadedSheetForCharacterId = null;
			sheet.loading = false;
			return;
		}

		if (id === loadedSheetForCharacterId) {
			return;
		}

		if (!character || !isValidCharacter) {
			loadedSheetForCharacterId = null;
			sheet.loading = false;
			return;
		}

		let cancelled = false;
		loadedSheetForCharacterId = id;
		sheet.loading = true;
		sheet.error = null;

		void Promise.all([sheet.loadFromCharacter(character), loadCharacterStatEvents(id)])
			.then(([, events]) => {
				if (cancelled) return;
				sheet.statEvents = events;
			})
			.catch((cause) => {
				if (cancelled) return;
				loadedSheetForCharacterId = null;
				sheet.error = formatErrorMessage(cause, 'Could not load character sheet');
				sheet.loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	async function handleSave() {
		if (!character || sheet.saving || sheet.loading) return;

		sheet.saving = true;
		sheet.error = null;

		const payload = sheet.cloneForSave();
		const kind = sheetMode === 'npc' ? payload.kind : 'pc';

		try {
			await updateCampaignCharacter(character.character_id, kind, {
				name: payload.name,
				playerName: sheetMode === 'pc' ? payload.playerName : undefined,
				description: payload.description,
				identity: payload.identity,
				extras: payload.extras
			});

			if (payload.portraitFile || payload.portraitThumbCropFile || payload.presentationFile || payload.presentationThumbCropFile) {
				await persistPendingCharacterMedia(character.character_id, {
					portraitOriginalFile: payload.portraitFile,
					portraitThumbCropFile: payload.portraitThumbCropFile,
					portraitThumbCropRect: payload.portraitThumbCropRect,
					portraitImageSource: payload.portraitImageSource,
					presentationOriginalFile: payload.presentationFile,
					presentationThumbCropFile: payload.presentationThumbCropFile,
					presentationThumbCropRect: payload.presentationThumbCropRect,
					presentationImageSource: payload.presentationImageSource
				});

				if (payload.portraitFile || payload.portraitThumbCropFile) {
					sheet.portraitFile = null;
					sheet.portraitThumbCropFile = null;
					sheet.portraitThumbCropRect = null;
					sheet.portraitImageSource = null;
				}

				if (payload.presentationFile || payload.presentationThumbCropFile) {
					sheet.presentationFile = null;
					sheet.presentationThumbCropFile = null;
					sheet.presentationThumbCropRect = null;
					sheet.presentationImageSource = null;
				}
			}

			sheet.statEvents = await loadCharacterStatEvents(character.character_id);
			const updated = getCharacterById(character.character_id);
			if (updated) {
				sheet.syncSavedStats(updated);
			}
		} catch (cause) {
			sheet.error = formatErrorMessage(cause, 'Could not save character sheet');
		} finally {
			sheet.saving = false;
		}
	}

	setupCharacterSheetAutoSave({
		sheet,
		save: handleSave,
		isEnabled: () => database.isReady && Boolean(character && isValidCharacter)
	});
</script>

<svelte:head>
	<title>{sheet.name || character?.display_name || 'Character'} · DM Deputy</title>
</svelte:head>

{#if !database.isReady}
	<section class="page-stack">
		<LoadingState message="Loading character…" />
	</section>
{:else if !character || !isValidCharacter}
	<section class="page-stack">
		<h1>Character not found</h1>
		<Button.Root href={resolve('/library/players')} data-variant="plain"
			>Back to library</Button.Root
		>
	</section>
{:else}
	<CharacterSheetPageShell
		navLabel="Character sheet navigation"
		{backHref}
		{backLabel}
		title={sheet.name.trim() || character.display_name || 'Character'}
		subtitle={campaignLabel}
		error={sheet.error}
	>
		{#snippet headerActions()}
			{#if sheetMode === 'npc'}
				<LoadMonsterTemplateModal
					onLoad={(loaded) => sheet.applyMonsterTemplate(loaded)}
					disabled={sheet.loading || sheet.saving}
				/>
			{/if}
		{/snippet}
		{#snippet form()}
			<CharacterSheetForm
				{sheet}
				mode={sheetMode}
				characterId={character.character_id}
				statBases={{
					experience: character.experience_base ?? 0,
					hp_max: character.hp_max_base ?? 0,
					hp_current: character.hp_current_base ?? 0
				}}
			/>
		{/snippet}
	</CharacterSheetPageShell>
{/if}
