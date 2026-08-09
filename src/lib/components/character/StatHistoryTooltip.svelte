<script lang="ts">
	import { Popover } from 'bits-ui';
	import CloseIcon from '$lib/components/icons/CloseIcon.svelte';
	import InfoIcon from '$lib/components/icons/InfoIcon.svelte';
	import { buildStatAuditTrail, formatStatEventSummary } from '$lib/domain/character-stats';
	import type { CharacterStatEvent, StatKind } from '$lib/types/schema';

	type Props = {
		stat: StatKind;
		events: CharacterStatEvent[];
		currentValue: number;
		baseValue?: number;
		label: string;
		variant?: 'default' | 'icon';
	};

	let { stat, events, currentValue, baseValue = 0, label, variant = 'default' }: Props = $props();

	const statEvents = $derived(events.filter((event) => event.stat === stat));
	const hasHistory = $derived(statEvents.length > 0 || baseValue !== 0);
	const runningTotal = $derived(buildStatAuditTrail(statEvents, stat, baseValue));
</script>

{#if hasHistory}
	<Popover.Root>
		<Popover.Trigger class="stat-history-trigger" type="button" aria-label="{label} history">
			{#if variant === 'icon'}
				<InfoIcon size={14} />
			{:else}
				<span class="stat-history-value">{currentValue}</span>
				<InfoIcon size={14} />
			{/if}
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content class="tooltip-panel stat-history-tooltip" side="top" align="start">
				<div class="stat-history-header">
					<div class="stat-history-body">
						<p class="stat-history-title">{label} audit trail</p>
						{#if baseValue !== 0}
							<p class="stat-history-row">
								<span>Starting value</span>
								<strong>{baseValue}</strong>
							</p>
						{/if}
						<ul class="stat-history-list">
							{#each runningTotal.rows as row (row.event.stat_event_id)}
								<li>
									<span>{formatStatEventSummary(row.event)}</span>
									<strong>{row.total}</strong>
								</li>
							{/each}
						</ul>
						<p class="stat-history-total">
							<span>Current</span>
							<strong>{currentValue}</strong>
						</p>
					</div>
					<Popover.Close class="stat-history-close" aria-label="Close history">
						<CloseIcon size={16} />
					</Popover.Close>
				</div>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
{:else}
	<span class="stat-history-value">{currentValue}</span>
{/if}

<style>
	:global(.stat-history-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	:global(.stat-history-trigger):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.stat-history-value {
		font: inherit;
	}

	.stat-history-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.stat-history-body {
		flex: 1;
		min-width: 0;
	}

	.stat-history-title {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.stat-history-row,
	.stat-history-total {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0;
		font-size: 0.85rem;
	}

	.stat-history-list {
		margin: 0.35rem 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.35rem;
	}

	.stat-history-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.82rem;
	}

	.stat-history-list li span {
		color: var(--color-text-muted);
	}

	.stat-history-total {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		font-weight: 600;
	}

	:global(.stat-history-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.15rem;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	:global(.stat-history-close):focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
