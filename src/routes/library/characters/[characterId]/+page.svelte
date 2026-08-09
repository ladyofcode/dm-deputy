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
	import { loadCharacterStatEvents } from '$lib/data/character-stats-persistence';
	import LoadingState from '$lib/components/shared/LoadingState.svelte';
	import { persistPendingCharacterMedia } from '$lib/domain/character-media';
	import { updateCampaignCharacter } from '$lib/data/writes';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { createCharacterSheetStore } from '$lib/stores/character-sheet.svelte';
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

	const sheetMode = $derived(character?.kind && isNpcCharacterKind(character.kind) ? 'npc' : 'pc');

	$effect(() => {
		if (!database.isReady) return;

		if (!character || !isValidCharacter) {
			sheet.loading = false;
			return;
		}

		let cancelled = false;
		sheet.loading = true;
		sheet.error = null;

		void Promise.all([
			sheet.loadFromCharacter(character),
			loadCharacterStatEvents(character.character_id)
		])
			.then(([, events]) => {
				if (cancelled) return;
				sheet.statEvents = events;
			})
			.catch((cause) => {
				if (cancelled) return;
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

			if (payload.portraitFile || payload.presentationFile) {
				await persistPendingCharacterMedia(character.character_id, {
					portraitFile: payload.portraitFile,
					portraitImageSource: payload.portraitImageSource,
					presentationFile: payload.presentationFile,
					presentationImageSource: payload.presentationImageSource
				});

				if (payload.portraitFile) {
					sheet.portraitFile = null;
					sheet.portraitImageSource = null;
				}

				if (payload.presentationFile) {
					sheet.presentationFile = null;
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
		backHref={resolve('/library/players')}
		title={sheet.name.trim() || character.display_name || 'Character'}
		subtitle={campaignLabel}
		loading={sheet.loading}
		saving={sheet.saving}
		error={sheet.error}
		onSubmit={handleSave}
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
