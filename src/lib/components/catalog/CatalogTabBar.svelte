<script lang="ts">
	import { CATALOG_KIND_LABELS, type CatalogKind } from '$lib/domain/catalog';
	import { rulesPanelId, rulesTabId } from '$lib/domain/rules-catalog-table';

	type Props = {
		activeTab: CatalogKind;
		onTabChange: (kind: CatalogKind) => void;
	};

	let { activeTab, onTabChange }: Props = $props();

	const catalogTabOrder = Object.keys(CATALOG_KIND_LABELS) as CatalogKind[];

	function handleTabKeydown(event: KeyboardEvent, kind: CatalogKind) {
		const index = catalogTabOrder.indexOf(kind);
		if (index === -1) return;

		let nextIndex: number | null = null;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			nextIndex = (index + 1) % catalogTabOrder.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			nextIndex = (index - 1 + catalogTabOrder.length) % catalogTabOrder.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = catalogTabOrder.length - 1;
		}

		if (nextIndex == null) return;

		event.preventDefault();
		const nextKind = catalogTabOrder[nextIndex];
		if (!nextKind) return;

		onTabChange(nextKind);
		document.getElementById(rulesTabId(nextKind))?.focus();
	}
</script>

<div class="rules-tabs" role="tablist" aria-label="Catalog categories">
	{#each Object.entries(CATALOG_KIND_LABELS) as [kind, label] (kind)}
		<button
			type="button"
			role="tab"
			id={rulesTabId(kind as CatalogKind)}
			class="rules-tab"
			aria-selected={activeTab === kind}
			aria-controls={rulesPanelId(kind as CatalogKind)}
			tabindex={activeTab === kind ? 0 : -1}
			onclick={() => onTabChange(kind as CatalogKind)}
			onkeydown={(event) => handleTabKeydown(event, kind as CatalogKind)}
		>
			{label}
		</button>
	{/each}
</div>

<style>
	.rules-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.rules-tab {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.rules-tab[aria-selected='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>
