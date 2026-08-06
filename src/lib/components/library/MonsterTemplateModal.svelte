<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import MonsterTemplateForm from '$lib/components/library/MonsterTemplateForm.svelte';
	import { cloneMonsterTemplate } from '$lib/domain/monster-template-storage';
	import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
	import {
		getStoredMonsterTemplateById,
		replaceMonsterTemplate,
		resetMonsterTemplate
	} from '$lib/stores/monster-templates.svelte';

	type Props = {
		open?: boolean;
		template: MonsterTemplate | null;
	};

	let { open = $bindable(false), template }: Props = $props();

	let draft = $state<MonsterTemplate | null>(null);
	let modalInitialized = $state(false);

	$effect(() => {
		if (!open) {
			modalInitialized = false;
			draft = null;
			return;
		}

		if (!template || modalInitialized) return;

		draft = cloneMonsterTemplate(template);
		modalInitialized = true;
	});

	function handleSave() {
		if (!draft) return;
		replaceMonsterTemplate(draft);
		open = false;
	}

	function handleReset() {
		if (!template) return;
		resetMonsterTemplate(template.id);
		const refreshed = getStoredMonsterTemplateById(template.id);
		if (refreshed) {
			draft = cloneMonsterTemplate(refreshed);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="dialog-wide">
			<Dialog.Title>{draft?.name ?? template?.name ?? 'Edit template'}</Dialog.Title>

			{#if draft}
				<MonsterTemplateForm bind:draft />
			{/if}

			<div class="dialog-footer">
				<Button.Root type="button" data-variant="ghost" disabled={!draft} onclick={handleReset}>
					Reset to default
				</Button.Root>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button.Root {...props} type="button">Cancel</Button.Root>
					{/snippet}
				</Dialog.Close>
				<Button.Root type="button" data-variant="primary" disabled={!draft} onclick={handleSave}>
					Save
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
