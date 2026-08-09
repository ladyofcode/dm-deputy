<script lang="ts">
	import CharacterPortraitField from '$lib/components/character/CharacterPortraitField.svelte';
	import CharacterSheetPortraitLayout from '$lib/components/character/CharacterSheetPortraitLayout.svelte';
	import {
		IDENTITY_DISPLAY_FIELDS,
		type IdentityDisplayContext
	} from '$lib/domain/character-sheet-fields';
	import type { CharacterSheetStore } from '$lib/stores/character-sheet.svelte';
	import type { ImageUploadResult } from '$lib/types/image-upload';

	type Props = {
		displayContext: IdentityDisplayContext;
		sheet: CharacterSheetStore;
		characterId?: string;
		showPortrait?: boolean;
		onPortraitFileChange?: (result: ImageUploadResult) => void;
	};

	let {
		displayContext,
		sheet,
		characterId,
		showPortrait = true,
		onPortraitFileChange
	}: Props = $props();

	const visibleReadonlyFields = $derived(
		IDENTITY_DISPLAY_FIELDS.filter((field) => field.show(displayContext))
	);
</script>

<CharacterSheetPortraitLayout {showPortrait}>
	{#snippet portrait()}
		<CharacterPortraitField
			{characterId}
			bind:file={sheet.portraitFile}
			bind:imageSource={sheet.portraitImageSource}
			readOnly
			onFileChange={onPortraitFileChange}
		/>
	{/snippet}

	<dl class="identity-fields identity-fields-readonly sheet-portrait-fields">
		{#each visibleReadonlyFields as field (field.key)}
			<div class="identity-field" class:identity-field-wide={field.wide}>
				<dt>{field.label}</dt>
				<dd
					class:identity-truncate={field.key === 'name'}
					class:identity-text-block={field.wide}
					title={field.key === 'name' ? String(field.render(displayContext)) : undefined}
				>
					{field.render(displayContext)}
				</dd>
			</div>
		{/each}
	</dl>
</CharacterSheetPortraitLayout>

<style>
	.identity-fields-readonly {
		margin: 0;
	}

	.identity-fields-readonly .identity-field-wide {
		grid-column: 1 / -1;
	}

	.identity-field {
		display: grid;
		gap: 0.2rem;
	}

	.identity-field dt {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.identity-field dd {
		margin: 0;
		line-height: 1.35;
	}

	.identity-truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.identity-text-block {
		white-space: pre-wrap;
	}
</style>
