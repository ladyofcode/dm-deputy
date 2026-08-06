<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Tooltip } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import {
		getCampaignById,
		getCharacterById,
		isCharacterInCampaign
	} from '$lib/data';
	import { loadCharacterStatEvents } from '$lib/data/character-stats-persistence';
	import { loadCharacterSheetDraft, persistCharacterPortrait, updateCampaignCharacter } from '$lib/data/writes';
	import {
		cloneCharacterIdentity,
		cloneNpcExtras,
		createDefaultCharacterIdentity,
		createDefaultNpcExtras,
		type CharacterIdentityDraft,
		type NpcExtrasDraft
	} from '$lib/domain/npc-draft';
	import { getReactiveNpcsForCampaign, getReactivePcsForCampaign } from '$lib/stores/campaign-characters.svelte';
	import { database } from '$lib/stores/database.svelte';
	import {
		CHARACTER_KIND_LABELS,
		isNpcCharacterKind,
		type CharacterStatEvent,
		type NpcCharacterKind
	} from '$lib/types/schema';


	const campaignId = $derived(page.params.campaignId ?? '');
	const characterId = $derived(page.params.characterId ?? '');

	const campaign = $derived.by(() => {
		if (!database.isReady) return undefined;
		return getCampaignById(campaignId);
	});

	const character = $derived.by(() => {
		if (!database.isReady) return undefined;
		getReactivePcsForCampaign(campaignId);
		getReactiveNpcsForCampaign(campaignId);
		return getCharacterById(characterId);
	});

	const isValidCharacter = $derived(
		Boolean(
			character &&
				isCharacterInCampaign(campaignId, character.character_id)
		)
	);

	const sheetMode = $derived(
		character?.kind && isNpcCharacterKind(character.kind) ? 'npc' : 'pc'
	);

	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let sheetKind = $state<NpcCharacterKind>('npc_general');
	let sheetName = $state('');
	let sheetPlayerName = $state('');
	let sheetDescription = $state('');
	let sheetIdentity = $state<CharacterIdentityDraft>(createDefaultCharacterIdentity());
	let sheetExtras = $state<NpcExtrasDraft>(createDefaultNpcExtras());
	let portraitFile = $state<File | null>(null);
	let portraitImageSource = $state<string | null>(null);
	let statEvents = $state<CharacterStatEvent[]>([]);

	$effect(() => {
		if (!database.isReady || !character || !isValidCharacter) {
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;
		error = null;

		void Promise.all([
			loadCharacterSheetDraft(character),
			loadCharacterStatEvents(character.character_id)
		])
			.then(([sheet, events]) => {
				if (cancelled) return;

				sheetKind = sheet.kind as NpcCharacterKind;
				sheetName = sheet.name;
				sheetPlayerName = sheet.playerName;
				sheetDescription = sheet.description;
				sheetIdentity = cloneCharacterIdentity(sheet.identity);
				sheetExtras = cloneNpcExtras(sheet.extras);
				portraitFile = null;
				portraitImageSource = null;
				statEvents = events;
				loading = false;
			})
			.catch((cause) => {
				if (cancelled) return;
				error = cause instanceof Error ? cause.message : 'Could not load character sheet';
				loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	async function handleSave() {
		if (!character || saving || loading) return;

		saving = true;
		error = null;

		const extras = cloneNpcExtras(sheetExtras);
		if (extras.hp_max > 0 && extras.hp_current === 0) {
			extras.hp_current = extras.hp_max;
			sheetExtras = extras;
		}

		const kind = sheetMode === 'npc' ? sheetKind : 'pc';

		try {
			await updateCampaignCharacter(character.character_id, kind, {
				name: sheetName.trim(),
				playerName: sheetMode === 'pc' ? sheetPlayerName.trim() : undefined,
				description: sheetDescription.trim(),
				identity: cloneCharacterIdentity(sheetIdentity),
				extras
			});

			if (portraitFile) {
				await persistCharacterPortrait(
					character.character_id,
					portraitFile,
					portraitImageSource
				);
				portraitFile = null;
				portraitImageSource = null;
			}

			statEvents = await loadCharacterStatEvents(character.character_id);
			const updated = getCharacterById(character.character_id);
			if (updated) {
				sheetExtras = {
					...sheetExtras,
					experience: updated.experience,
					level: updated.level,
					hp_max: updated.hp_max,
					hp_current: updated.hp_current
				};
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not save character sheet';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{sheetName || character?.display_name || 'Character'} · DM Deputy</title>
</svelte:head>

{#if database.isReady && (!campaign || !character || !isValidCharacter)}
	<section class="page-stack">
		<h1>Character not found</h1>
		<Button.Root href={resolve('/library/players')}>Back to library</Button.Root>
	</section>
{:else}
	<section class="page-stack character-sheet-page">
		<nav class="sheet-nav" aria-label="Character sheet navigation">
			<Button.Root href={resolve('/library/players')}>← Library</Button.Root>
		</nav>

		<header class="sheet-header">
			<p class="eyebrow">{campaign?.campaign_name ?? ''}</p>
			<h1>{sheetName.trim() || character?.display_name || 'Character'}</h1>
			<p class="hint">
				{CHARACTER_KIND_LABELS[character?.kind ?? 'pc']}
			</p>
		</header>

		<form class="sheet-page-form" onsubmit={(event) => { event.preventDefault(); void handleSave(); }}>
			<Tooltip.Provider delayDuration={200}>
				<CharacterSheetForm
					mode={sheetMode}
					bind:kind={sheetKind}
					bind:name={sheetName}
					bind:playerName={sheetPlayerName}
					bind:description={sheetDescription}
					bind:identity={sheetIdentity}
					bind:extras={sheetExtras}
					characterId={character?.character_id}
					bind:portraitFile
					bind:portraitImageSource
					{statEvents}
					statBases={{
						experience: character?.experience_base ?? 0,
						hp_max: character?.hp_max_base ?? 0,
						hp_current: character?.hp_current_base ?? 0
					}}
					{loading}
				/>
			</Tooltip.Provider>

			{#if error}
				<p class="hint error">{error}</p>
			{/if}

			<div class="actions-row">
				<Button.Root type="submit" data-variant="primary" disabled={loading || saving}>
					{saving ? 'Saving…' : 'Save sheet'}
				</Button.Root>
			</div>
		</form>
	</section>
{/if}

<style>
	.sheet-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.sheet-header h1 {
		margin: 0.15rem 0 0;
	}

	.sheet-page-form {
		display: grid;
		gap: var(--space-page);
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
