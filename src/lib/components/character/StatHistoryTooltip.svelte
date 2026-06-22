<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { formatStatEventSummary } from '$lib/domain/character-stats';
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
	const runningTotal = $derived(
		statEvents.reduce(
			(accumulator, event) => {
				const next = accumulator.current + event.delta;
				return {
					current: next,
					rows: [...accumulator.rows, { event, total: next }]
				};
			},
			{ current: baseValue, rows: [] as Array<{ event: CharacterStatEvent; total: number }> }
		)
	);
</script>

{#if hasHistory}
	<Tooltip.Root>
		<Tooltip.Trigger class="stat-history-trigger" type="button" aria-label="{label} history">
			{#if variant === 'icon'}
				<span class="stat-history-hint" aria-hidden="true">ⓘ</span>
			{:else}
				<span class="stat-history-value">{currentValue}</span>
				<span class="stat-history-hint" aria-hidden="true">ⓘ</span>
			{/if}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content class="stat-history-tooltip">
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
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
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
		cursor: help;
	}

	.stat-history-value {
		font: inherit;
	}

	.stat-history-hint {
		font-size: 0.85em;
		color: var(--color-text-muted, #667085);
	}

	:global(.stat-history-tooltip) {
		max-width: min(22rem, 90vw);
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-panel, 0.75rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: 0 8px 24px var(--color-shadow);
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
		color: var(--color-text-muted, #667085);
	}

	.stat-history-total {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
		font-weight: 600;
	}
</style>
