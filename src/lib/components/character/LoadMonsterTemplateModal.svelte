<script lang="ts">
	import { Button, Label } from 'bits-ui';
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import type { ApplyMonsterTemplateResult } from '$lib/games/dnd5e/data/monsters';
	import { getReactiveCatalogArmor, getReactiveCatalogWeapons } from '$lib/stores/catalog.svelte';
	import {
		getMonsterTemplates,
		getStoredMonsterTemplateById,
		trackMonsterTemplatesRevision
	} from '$lib/stores/monster-templates.svelte';

	type Props = {
		disabled?: boolean;
		onLoad?: (loaded: ApplyMonsterTemplateResult) => void;
	};

	let { disabled = false, onLoad }: Props = $props();

	let open = $state(false);
	let selectedTemplateId = $state('');
	let loadingTemplate = $state(false);

	const weapons = $derived(getReactiveCatalogWeapons());
	const armor = $derived(getReactiveCatalogArmor());
	const monsterTemplates = $derived.by(() => {
		trackMonsterTemplatesRevision();
		return getMonsterTemplates();
	});

	function handleOpen() {
		if (disabled) return;
		selectedTemplateId = '';
		open = true;
	}

	async function handleLoadTemplate() {
		if (!selectedTemplateId || loadingTemplate || disabled) return;

		const template = getStoredMonsterTemplateById(selectedTemplateId);
		if (!template) return;

		loadingTemplate = true;

		try {
			const { loadMonsterTemplateIntoDraft } = await import('$lib/games/dnd5e/data/monsters');
			const loaded = await loadMonsterTemplateIntoDraft(template, weapons, armor);
			onLoad?.(loaded);
			open = false;
		} finally {
			loadingTemplate = false;
		}
	}
</script>

<Button.Root
	type="button"
	data-variant="ghost"
	class="load-template-trigger"
	{disabled}
	onclick={handleOpen}
>
	Load from template
</Button.Root>

<AppDialog
	bind:open
	title="Load from template"
	description="Choose a monster template to populate this sheet with default stats and details."
>
	<div class="field">
		<Label.Root for="load_monster_template">Monster template</Label.Root>
		<select id="load_monster_template" bind:value={selectedTemplateId}>
			<option value="">Choose a monster…</option>
			{#each monsterTemplates as template (template.id)}
				<option value={template.id}>{template.name}</option>
			{/each}
		</select>
	</div>
	{#snippet footer()}
		<DialogFormFooter
			submitLabel={loadingTemplate ? 'Loading…' : 'Load template'}
			pending={loadingTemplate}
			disabled={!selectedTemplateId}
			submitType="button"
			onSubmit={handleLoadTemplate}
		/>
	{/snippet}
</AppDialog>

<style>
	:global([data-button-root].load-template-trigger) {
		justify-self: start;
		padding: 0;
		min-height: 0;
		font: inherit;
		font-size: 0.95rem;
		color: var(--color-accent);
		white-space: nowrap;
	}

	:global([data-button-root].load-template-trigger:hover:not(:disabled)) {
		background: transparent;
		border-color: transparent;
		text-decoration: underline;
	}
</style>
