<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from 'bits-ui';
	import { fromStore } from 'svelte/store';
	import { getAllNpcLibraryRows, getAllPlayerRows } from '$lib/data';
	import { softDeletePlayerFromPlayerbase } from '$lib/data/writes';
	import { resolveCampaignHref, resolveCharacterHref } from '$lib/navigation/hrefs';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { dbIsReady } from '$lib/stores/database.svelte';
	import { CHARACTER_KIND_LABELS } from '$lib/types/schema';

	const dbReady = fromStore(dbIsReady);

	const playerRows = $derived.by(() => {
		if (!dbReady.current) return [];
		trackCampaignCharactersRevision();
		return getAllPlayerRows();
	});

	const npcRows = $derived.by(() => {
		if (!dbReady.current) return [];
		trackCampaignCharactersRevision();
		return getAllNpcLibraryRows();
	});

	let removingUserId = $state<string | null>(null);
	let error = $state<string | null>(null);

	function formatHp(current: number, max: number): string {
		if (max <= 0) return '—';
		return `${current}/${max}`;
	}

	async function handleRemoveFromPlayerbase(userId: string, username: string) {
		if (removingUserId) return;

		const confirmed = confirm(
			`Remove ${username} from the playerbase?\n\nThis is irreversible. Their account will be hidden everywhere, but records are kept in the database.`
		);
		if (!confirmed) return;

		removingUserId = userId;
		error = null;

		try {
			await softDeletePlayerFromPlayerbase(userId);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not remove player';
		} finally {
			removingUserId = null;
		}
	}
</script>

<svelte:head>
	<title>Library · Characters · DM Deputy</title>
</svelte:head>

<section class="page-stack library-page">
	<nav aria-label="Back to home">
		<Button.Root href={resolve('/')}>← Home</Button.Root>
	</nav>

	<header class="library-header">
		<h1>Characters</h1>
		<p class="hint">Player accounts and NPCs across all campaigns. Click a name to open the sheet.</p>
	</header>

	{#if dbReady.current}
		<section class="library-section" aria-labelledby="library-players-heading">
			<h2 id="library-players-heading">Players</h2>

			{#if playerRows.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Player</th>
								<th scope="col">Character</th>
								<th scope="col">Campaign</th>
								<th scope="col">Level</th>
								<th scope="col">HP</th>
								<th scope="col"><span class="sr-only">Actions</span></th>
							</tr>
						</thead>
						<tbody>
							{#each playerRows as row (row.playerId)}
								<tr>
									<td class="name-cell">{row.username}</td>
									<td>
										<a href={resolveCharacterHref(row.campaignId, row.characterId)}>
											{row.characterName}
										</a>
									</td>
									<td>
										<a href={resolveCampaignHref(row.campaignId)}>{row.campaignName}</a>
									</td>
									<td>{row.level}</td>
									<td>{formatHp(row.hpCurrent, row.hpMax)}</td>
									<td class="actions-cell">
										<Button.Root
											type="button"
											data-variant="ghost"
											disabled={removingUserId === row.userId}
											onclick={() => handleRemoveFromPlayerbase(row.userId, row.username)}
										>
											{removingUserId === row.userId ? 'Removing…' : 'Remove'}
										</Button.Root>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No players yet. Add them when creating or editing a campaign.</p>
			{/if}
		</section>

		<section class="library-section" id="npcs" aria-labelledby="library-npcs-heading">
			<h2 id="library-npcs-heading">NPCs</h2>

			{#if npcRows.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Type</th>
								<th scope="col">Campaign</th>
								<th scope="col">Level</th>
								<th scope="col">HP</th>
								<th scope="col">XP</th>
								<th scope="col">Reputation</th>
							</tr>
						</thead>
						<tbody>
							{#each npcRows as row (row.characterId)}
								<tr>
									<td class="name-cell">
										{#if row.campaignId}
											<a href={resolveCharacterHref(row.campaignId, row.characterId)}>
												{row.characterName}
											</a>
										{:else}
											{row.characterName}
										{/if}
									</td>
									<td>{CHARACTER_KIND_LABELS[row.kind]}</td>
									<td>{row.campaignNames}</td>
									<td>{row.level}</td>
									<td>{formatHp(row.hpCurrent, row.hpMax)}</td>
									<td>{row.experience > 0 ? row.experience : '—'}</td>
									<td>{row.reputation ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint">No NPCs yet. Add them from a campaign page.</p>
			{/if}
		</section>

		{#if error}
			<p class="hint error">{error}</p>
		{/if}
	{/if}
</section>

<style>
	.library-header h1 {
		margin: 0;
	}

	.library-header .hint {
		margin-top: 0.5rem;
	}

	.library-section h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
	}

	.library-section + .library-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.data-table th,
	.data-table td {
		padding: 0.65rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
	}

	.data-table th {
		font-family: var(--font-heading);
		font-weight: 600;
		background: color-mix(in srgb, var(--color-border) 35%, var(--color-surface));
	}

	.data-table tbody tr:last-child td {
		border-bottom: none;
	}

	.name-cell {
		font-weight: 600;
	}

	.actions-cell {
		white-space: nowrap;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.hint.error {
		color: var(--color-danger, #b42318);
	}
</style>
