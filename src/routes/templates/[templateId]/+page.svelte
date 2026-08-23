<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import CharacterSheetPageShell from '$lib/components/character/CharacterSheetPageShell.svelte';
	import MonsterTemplateMetadataSection from '$lib/components/library/MonsterTemplateMetadataSection.svelte';
	import { formatErrorMessage } from '$lib/domain/errors';
	import {
		applyMonsterTemplateToDraft,
		fetchMonsterTemplatePortrait,
		getMonsterTemplatePortraitUrl,
		monsterTemplateFromDraft
	} from '$lib/games/dnd5e/data/monsters';
	import { resolveLibraryCharactersHref, resolveTemplateHref } from '$lib/navigation/hrefs';
	import {
		createBlankMonsterTemplate,
		getDefaultMonsterTemplate
	} from '$lib/domain/monster-template-storage';
	import {
		getStoredMonsterTemplateById,
		replaceMonsterTemplate,
		resetMonsterTemplate,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';
	import { createCharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import { setupCharacterSheetAutoSave } from '$lib/stores/autosave.svelte';
	import { getReactiveCatalogArmor, getReactiveCatalogWeapons } from '$lib/stores/catalog.svelte';
	import { CHARACTER_KIND_LABELS, type NpcCharacterKind } from '$lib/types/schema';
	import type { ImageUploadResult } from '$lib/types/image-upload';
	import { getMediaLibraryFullUrl } from '$lib/data/media-library-blob-cache';
	import { createMediaAssetInDb } from '$lib/db/client';
	import { buildMediaAssetId } from '$lib/domain/media-asset';
	import { processCharacterPortraitUpload } from '$lib/domain/character-portrait';
	import { imageUploadResultToPortraitPayload } from '$lib/domain/character-media';

	const sheet = createCharacterSheetStore();

	const templateId = $derived(page.params.templateId ?? '');
	const isNew = $derived(templateId === 'new');

	const storedTemplate = $derived.by(() => {
		trackMonsterTemplatesRevision();
		if (isNew) return undefined;
		return getStoredMonsterTemplateById(templateId);
	});

	const canReset = $derived(Boolean(getDefaultMonsterTemplate(templateId)));

	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());

	let draftId = $state('');
	let savedImageUrl = $state('');
	let portraitDirty = $state(false);
	let portraitExistingMediaId = $state<string | null>(null);
	let weaponNames = $state<string[]>(['']);
	let armorName = $state('');
	let initializedFor = $state<string | null>(null);

	async function loadTemplateIntoSheet(templateIdToLoad: string) {
		const template =
			templateIdToLoad === 'new'
				? createBlankMonsterTemplate()
				: getStoredMonsterTemplateById(templateIdToLoad);

		if (!template) {
			draftId = '';
			return;
		}

		const applied = applyMonsterTemplateToDraft(template, weapons, armor);

		draftId = template.id;
		sheet.applyDraft({
			kind: applied.kind as NpcCharacterKind,
			name: applied.name,
			playerName: '',
			description: applied.description,
			identity: applied.identity,
			extras: applied.extras
		});
		if (template.media_id?.trim()) {
			savedImageUrl = (await getMediaLibraryFullUrl(template.media_id)) ?? '';
		} else {
			savedImageUrl = getMonsterTemplatePortraitUrl(template) ?? '';
		}
		sheet.portraitImageSource = template.image_source ?? null;
		portraitDirty = false;
		portraitExistingMediaId = template.media_id ?? null;
		sheet.portraitFile = await fetchMonsterTemplatePortrait(template);
		weaponNames = template.weapon_names?.length ? [...template.weapon_names] : [''];
		armorName = template.armor_name ?? '';
		sheet.combatExpanded = true;
		sheet.loading = false;
	}

	function handlePortraitFileChange(result: ImageUploadResult) {
		portraitDirty = true;
		portraitExistingMediaId = result.existingMediaId ?? null;

		if (result.existingMediaId) {
			sheet.portraitFile = null;
			sheet.portraitThumbCropFile = result.file ?? null;
			sheet.portraitThumbCropRect = result.thumbCropRect ?? null;
			void getMediaLibraryFullUrl(result.existingMediaId).then((url) => {
				savedImageUrl = url ?? '';
			});
			return;
		}

		sheet.portraitFile = result.originalFile ?? null;
		sheet.portraitThumbCropFile = result.file ?? null;
		sheet.portraitThumbCropRect = result.thumbCropRect ?? null;
	}

	$effect(() => {
		if (templateId === initializedFor) return;
		sheet.loading = true;
		void loadTemplateIntoSheet(templateId).then(() => {
			initializedFor = templateId;
		});
	});

	async function handleSave() {
		if (!draftId || sheet.saving) return;

		sheet.saving = true;
		sheet.error = null;

		try {
			const payload = sheet.cloneForSave();
			const existingTemplate = getStoredMonsterTemplateById(draftId);
			let mediaId = portraitExistingMediaId ?? existingTemplate?.media_id ?? undefined;
			let imageUrl: string | undefined;

			if (portraitDirty) {
				if (portraitExistingMediaId) {
					mediaId = portraitExistingMediaId;
					imageUrl = undefined;
				} else if (payload.portraitFile) {
					const processed = await processCharacterPortraitUpload(
						imageUploadResultToPortraitPayload({
							file: payload.portraitFile,
							originalFile: payload.portraitFile,
							imageSource: payload.portraitImageSource
						})
					);
					mediaId = buildMediaAssetId();
					await createMediaAssetInDb(
						{
							media_id: mediaId,
							label: payload.name.trim() || 'Template',
							mime_type: processed.mime_type,
							original_mime_type: processed.original_mime_type,
							full_width: processed.portrait_width,
							full_height: processed.portrait_height,
							original_width: processed.original_width,
							original_height: processed.original_height,
							thumb_width: processed.thumb_width,
							thumb_height: processed.thumb_height,
							image_source: payload.portraitImageSource,
							created_at: new Date().toISOString()
						},
						processed.thumbBuffer,
						processed.fullBuffer!,
						processed.originalBuffer
					);
					imageUrl = undefined;
				}
			} else {
				imageUrl =
					savedImageUrl.trim() ||
					(existingTemplate ? getMonsterTemplatePortraitUrl(existingTemplate) : null) ||
					undefined;
			}

			const template = monsterTemplateFromDraft(
				{ id: draftId },
				payload.kind,
				payload.name,
				payload.identity,
				payload.extras,
				{
					image_url: imageUrl,
					image_source: payload.portraitImageSource ?? undefined,
					weapon_names: weaponNames,
					armor_name: armorName,
					notes: payload.description
				}
			);

			if (mediaId) {
				template.media_id = mediaId;
				template.image_url = undefined;
			}

			await replaceMonsterTemplate(template);
			if (template.media_id?.trim()) {
				savedImageUrl = (await getMediaLibraryFullUrl(template.media_id)) ?? '';
			} else {
				savedImageUrl = template.image_url ?? '';
			}
			sheet.portraitFile = await fetchMonsterTemplatePortrait(template);
			sheet.portraitThumbCropFile = null;
			sheet.portraitThumbCropRect = null;
			portraitDirty = false;
			portraitExistingMediaId = template.media_id ?? null;

			if (isNew) {
				await goto(resolveTemplateHref(template.id));
			}
		} catch (cause) {
			sheet.error = formatErrorMessage(cause, 'Could not save template');
		} finally {
			sheet.saving = false;
		}
	}

	function handleReset() {
		if (!canReset) return;

		void resetMonsterTemplate(templateId).then(() => loadTemplateIntoSheet(templateId));
	}

	setupCharacterSheetAutoSave({
		sheet,
		save: handleSave,
		isEnabled: () => Boolean(draftId) && !sheet.loading,
		extraKey: () =>
			JSON.stringify({
				weaponNames,
				armorName,
				portraitDirty,
				savedImageUrl
			})
	});
</script>

<svelte:head>
	<title>{sheet.name.trim() || (isNew ? 'New template' : 'Template')} · DM Deputy</title>
</svelte:head>

{#if !isNew && storedTemplate === undefined}
	<section class="page-stack">
		<h1>Template not found</h1>
		<Button.Root href={resolveLibraryCharactersHref({ section: 'templates' })} data-variant="plain"
			>Back to library</Button.Root
		>
	</section>
{:else if draftId}
	<CharacterSheetPageShell
		navLabel="Template navigation"
		backHref={resolveLibraryCharactersHref({ section: 'templates' })}
		backLabel="Library"
		subtitle="Monster template"
		title={sheet.name.trim() || (isNew ? 'New template' : 'Template')}
		error={sheet.error}
	>
		{#snippet form()}
			<p class="hint">{CHARACTER_KIND_LABELS[sheet.kind]}</p>
			<CharacterSheetForm
				{sheet}
				mode="npc"
				templateMode
				portraitFallbackUrl={savedImageUrl}
				onPortraitFileChange={handlePortraitFileChange}
			/>
		{/snippet}
		{#snippet extraSections()}
			<MonsterTemplateMetadataSection bind:weaponNames bind:armorName />
		{/snippet}
		{#snippet secondaryAction()}
			{#if canReset}
				<Button.Root
					type="button"
					data-variant="ghost"
					disabled={sheet.saving}
					onclick={handleReset}
				>
					Reset to default
				</Button.Root>
			{/if}
		{/snippet}
	</CharacterSheetPageShell>
{/if}

<style>
	.hint {
		margin: 0;
	}
</style>
