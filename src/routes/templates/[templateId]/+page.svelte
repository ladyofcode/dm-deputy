<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from 'bits-ui';
	import CharacterSheetForm from '$lib/components/character/CharacterSheetForm.svelte';
	import CharacterSheetPageShell from '$lib/components/character/CharacterSheetPageShell.svelte';
	import MonsterTemplateMetadataSection from '$lib/components/library/MonsterTemplateMetadataSection.svelte';
	import { formatErrorMessage } from '$lib/domain/errors';
	import {
		createBlankMonsterTemplate,
		getDefaultMonsterTemplate
	} from '$lib/domain/monster-template-storage';
	import {
		applyMonsterTemplateToDraft,
		fetchMonsterTemplatePortrait,
		monsterTemplateFromDraft
	} from '$lib/games/dnd5e/data/monsters';
	import { resolveLibraryCharactersHref, resolveTemplateHref } from '$lib/navigation/hrefs';
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
	import { fileToDataUrl } from '$lib/types/image-upload';

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
		savedImageUrl = template.image_url ?? '';
		sheet.portraitImageSource = template.image_source ?? null;
		portraitDirty = false;
		sheet.portraitFile = await fetchMonsterTemplatePortrait(template);
		weaponNames = template.weapon_names?.length ? [...template.weapon_names] : [''];
		armorName = template.armor_name ?? '';
		sheet.combatExpanded = true;
		sheet.loading = false;
	}

	function handlePortraitFileChange() {
		portraitDirty = true;
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
			const imageUrl =
				portraitDirty && payload.portraitFile
					? await fileToDataUrl(payload.portraitFile)
					: savedImageUrl.trim() || undefined;

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

			replaceMonsterTemplate(template);
			savedImageUrl = template.image_url ?? '';
			portraitDirty = false;

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

		resetMonsterTemplate(templateId);
		void loadTemplateIntoSheet(templateId);
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
