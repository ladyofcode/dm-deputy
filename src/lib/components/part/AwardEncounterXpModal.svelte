<script lang="ts">
	import AppDialog from '$lib/components/shared/AppDialog.svelte';
	import DialogFormFooter from '$lib/components/shared/DialogFormFooter.svelte';
	import { computeEqualXpShares } from '$lib/domain/character-stats';
	import { formatErrorMessage } from '$lib/domain/errors';
	import {
		getEncounterResolutionByEventId,
		persistAwardEncounterXp,
		persistFreeformXpAwards
	} from '$lib/data/character-stats-persistence';
	import { useDialogFormReset } from '$lib/stores/dialog-form.svelte';
	import { getReactivePcsForCampaign } from '$lib/stores/campaign-characters.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { StoryNode } from '$lib/types/schema';

	export type AwardXpMode = 'menu' | 'reward';

	type Props = {
		open?: boolean;
		mode?: AwardXpMode;
		node?: StoryNode | null;
		rewardXpTotal?: number;
		awardedNodeIds?: ReadonlySet<string>;
		campaignId: string;
		gameSchema: string;
		adventureId?: string;
		partId?: string;
		adventureName?: string;
		partName?: string;
		onAwarded?: () => void;
	};

	let {
		open = $bindable(false),
		mode = 'menu',
		node = null,
		rewardXpTotal = 0,
		awardedNodeIds = new Set<string>(),
		campaignId,
		gameSchema,
		adventureId,
		partId,
		adventureName,
		partName,
		onAwarded
	}: Props = $props();

	let shareAmounts = $state<Record<string, number>>({});
	let shareDescriptions = $state<Record<string, string>>({});
	let saving = $state(false);
	let error = $state<string | null>(null);
	let alreadyAwarded = $state(false);

	const pcs = $derived(getReactivePcsForCampaign(campaignId));

	const allocatedXp = $derived(
		Object.values(shareAmounts).reduce(
			(sum, amount) => sum + (Number.isFinite(amount) ? amount : 0),
			0
		)
	);

	function updateShareAmount(characterId: string, rawValue: string) {
		const parsed = Number.parseInt(rawValue, 10);
		shareAmounts = {
			...shareAmounts,
			[characterId]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0
		};
	}

	function updateShareDescription(characterId: string, value: string) {
		shareDescriptions = {
			...shareDescriptions,
			[characterId]: value
		};
	}

	function defaultRewardDescription(): string {
		return node ? `${node.title} reward` : '';
	}

	function resetForm() {
		const characterIds = pcs.map((pc) => pc.character_id);

		if (mode === 'reward' && rewardXpTotal > 0 && characterIds.length > 0) {
			const equalShares = computeEqualXpShares(rewardXpTotal, characterIds);
			const rewardDescription = defaultRewardDescription();
			shareAmounts = Object.fromEntries(
				characterIds.map((characterId) => [characterId, equalShares.get(characterId) ?? 0])
			);
			shareDescriptions = Object.fromEntries(
				characterIds.map((characterId) => [characterId, rewardDescription])
			);
		} else {
			shareAmounts = Object.fromEntries(characterIds.map((characterId) => [characterId, 0]));
			shareDescriptions = Object.fromEntries(characterIds.map((characterId) => [characterId, '']));
		}

		error = null;
		saving = false;
		alreadyAwarded = mode === 'reward' && node != null && awardedNodeIds.has(node.node_id);

		if (mode === 'reward' && node) {
			void getEncounterResolutionByEventId(node.node_id).then((resolution) => {
				alreadyAwarded = resolution != null;
			});
		}
	}

	useDialogFormReset(
		() => open,
		() => `${mode}:${node?.node_id ?? ''}:${rewardXpTotal}:${pcs.length}`,
		resetForm
	);

	function buildAwardEntries(): Array<{
		characterId: string;
		amount: number;
		description: string;
	}> {
		return pcs
			.map((pc) => ({
				characterId: pc.character_id,
				amount: shareAmounts[pc.character_id] ?? 0,
				description: (shareDescriptions[pc.character_id] ?? '').trim()
			}))
			.filter((entry) => entry.amount > 0);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (saving || alreadyAwarded) return;

		const entries = buildAwardEntries();

		if (entries.length === 0) {
			error = 'Give at least one player character some XP.';
			return;
		}

		const missingDescription = entries.find((entry) => !entry.description);
		if (missingDescription) {
			error = 'Enter a description for each player receiving XP.';
			return;
		}

		if (mode === 'reward') {
			if (allocatedXp !== rewardXpTotal) {
				error = `XP shares must add up to ${rewardXpTotal}.`;
				return;
			}

			if (!node) {
				error = 'No story node is linked to this reward.';
				return;
			}
		}

		saving = true;
		error = null;

		const context = {
			adventureId,
			partId,
			adventureName,
			partName
		};

		const shareDescriptionsByCharacter = Object.fromEntries(
			entries.map((entry) => [entry.characterId, entry.description])
		);
		const shares = Object.fromEntries(entries.map((entry) => [entry.characterId, entry.amount]));

		try {
			if (mode === 'reward' && node) {
				await persistAwardEncounterXp({
					node: {
						node_id: node.node_id,
						title: node.title
					},
					totalXp: rewardXpTotal,
					recipientCharacterIds: Object.keys(shares),
					splitMode: 'custom',
					customShares: shares,
					shareDescriptions: shareDescriptionsByCharacter,
					actorUserId: workspace.currentUserId,
					gameSchema,
					context
				});
			} else {
				await persistFreeformXpAwards({
					entries,
					sourceLabel: partName ?? adventureName ?? 'XP award',
					actorUserId: workspace.currentUserId,
					gameSchema,
					context
				});
			}

			onAwarded?.();
			open = false;
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not award XP');
		} finally {
			saving = false;
		}
	}
</script>

<AppDialog bind:open title="Assign XP" stacked wide>
	{#snippet descriptionContent()}
		{#if mode === 'reward' && node}
			Split {rewardXpTotal} XP from the reward on “{node.title}”.
		{:else}
			Assign XP to player characters in this campaign.
		{/if}
	{/snippet}
	<form onsubmit={handleSubmit}>
		{#if alreadyAwarded}
			<p class="hint awarded">XP for this reward was already assigned.</p>
		{:else if pcs.length === 0}
			<p class="hint">No player characters are linked to this campaign.</p>
		{:else}
			<fieldset class="recipient-fieldset">
				<legend>Players</legend>
				<div class="recipient-header" aria-hidden="true">
					<span>Name</span>
					<span>XP</span>
					<span>Description</span>
				</div>
				<ul class="recipient-list list-plain">
					{#each pcs as pc (pc.character_id)}
						<li>
							<span class="player-name">{pc.display_name}</span>
							<input
								id={`award_xp_share_${pc.character_id}`}
								type="number"
								min="0"
								step="1"
								aria-label={`XP for ${pc.display_name}`}
								value={shareAmounts[pc.character_id] ?? 0}
								oninput={(event) => updateShareAmount(pc.character_id, event.currentTarget.value)}
							/>
							<input
								id={`award_xp_description_${pc.character_id}`}
								type="text"
								aria-label={`Description for ${pc.display_name}`}
								placeholder="Reason for this XP"
								value={shareDescriptions[pc.character_id] ?? ''}
								oninput={(event) =>
									updateShareDescription(pc.character_id, event.currentTarget.value)}
							/>
						</li>
					{/each}
				</ul>
			</fieldset>

			{#if mode === 'reward'}
				<p class="allocation-summary" class:is-valid={allocatedXp === rewardXpTotal}>
					{allocatedXp} / {rewardXpTotal} XP assigned
				</p>
			{/if}
		{/if}

		{#if error}
			<p class="hint error">{error}</p>
		{/if}

		<DialogFormFooter
			submitLabel={saving ? 'Assigning…' : 'Assign XP'}
			pending={saving}
			disabled={alreadyAwarded || pcs.length === 0}
			useDialogClose={false}
			onCancel={() => (open = false)}
			submitType="submit"
		/>
	</form>
</AppDialog>

<style>
	.recipient-fieldset {
		margin: 0;
		padding: 0;
		border: none;
	}

	.recipient-fieldset legend {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.recipient-header {
		display: none;
	}

	.recipient-list li {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
		gap: 0.5rem;
	}

	@media (--layout) {
		.recipient-header {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 5.5rem minmax(0, 1.5fr);
			gap: 0.5rem;
			margin-bottom: 0.35rem;
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--color-text-muted);
		}

		.recipient-list li {
			grid-template-columns: minmax(0, 1fr) 5.5rem minmax(0, 1.5fr);
			align-items: center;
		}
	}

	.recipient-list {
		display: grid;
		gap: 0.65rem;
	}

	.player-name {
		font-weight: 500;
	}

	.allocation-summary {
		margin: 0.75rem 0 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.allocation-summary.is-valid {
		color: var(--color-accent);
	}

	.hint.awarded {
		color: var(--color-text-muted);
	}

	.hint.error {
		color: var(--color-danger);
	}
</style>
