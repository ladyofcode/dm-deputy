<script lang="ts">
	import { formatErrorMessage } from '$lib/domain/errors';
	import { resolve } from '$app/paths';
	import CatalogTable from '$lib/components/catalog/CatalogTable.svelte';
	import RemoveIconButton from '$lib/components/shared/RemoveIconButton.svelte';
	import LibrarySectionHeader from '$lib/components/library/LibrarySectionHeader.svelte';
	import MonsterTemplatesSection from '$lib/components/library/MonsterTemplatesSection.svelte';
	import { getAllNpcLibraryRows, getAllPlayerRows } from '$lib/data';
	import { softDeleteNpcFromLibrary, softDeletePlayerFromPlayerbase } from '$lib/data/writes';
	import { resolveCampaignHref } from '$lib/navigation/hrefs';
	import { trackCampaignCharactersRevision } from '$lib/stores/campaign-characters.svelte';
	import { database } from '$lib/stores/database.svelte';
	import { CHARACTER_KIND_LABELS } from '$lib/types/schema';

	const playerRows = $derived.by(() => {
		if (!database.isReady) return [];
		trackCampaignCharactersRevision();
		return getAllPlayerRows();
	});

	const npcRows = $derived.by(() => {
		if (!database.isReady) return [];
		trackCampaignCharactersRevision();
		return getAllNpcLibraryRows();
	});

	let removingUserId = $state<string | null>(null);
	let removingCharacterId = $state<string | null>(null);
	let error = $state<string | null>(null);

	function formatHp(current: number, max: number): string {
		if (max <= 0) return '—';
		return `${current}/${max}`;
	}

	function formatCell(value: string | null | undefined): string {
		const trimmed = value?.trim();
		return trimmed ? trimmed : '—';
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
			error = formatErrorMessage(cause, 'Could not remove player');
		} finally {
			removingUserId = null;
		}
	}

	async function handleRemoveNpcFromLibrary(characterId: string, characterName: string) {
		if (removingCharacterId) return;

		const confirmed = confirm(
			`Remove ${characterName} from the library?\n\nThis is irreversible. The NPC will be hidden everywhere, but records are kept in the database.`
		);
		if (!confirmed) return;

		removingCharacterId = characterId;
		error = null;

		try {
			await softDeleteNpcFromLibrary(characterId);
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not remove NPC');
		} finally {
			removingCharacterId = null;
		}
	}
</script>

<svelte:head>
	<title>Library · Characters · DM Deputy</title>
</svelte:head>

<header class="library-header">
	<h1>Characters</h1>
</header>

{#if database.isReady}
	<section class="library-section" aria-labelledby="library-players-heading">
		<LibrarySectionHeader
			id="library-players-heading"
			title="Players"
			addLabel="player"
			addHref={resolve('/')}
		/>

		<CatalogTable
			items={playerRows}
			getId={(row) => row.playerId}
			emptyMessage="No players yet. Add them when creating or editing a campaign."
		>
			{#snippet header()}
				<th scope="col">Player</th>
				<th scope="col">Character</th>
				<th scope="col">Campaign</th>
				<th scope="col">Level</th>
				<th scope="col">HP</th>
			{/snippet}
			{#snippet row(row)}
				<td class="name-cell">{row.username}</td>
				<td>
					<a href={resolve('/library/characters/[characterId]', { characterId: row.characterId })}>
						{row.characterName}
					</a>
				</td>
				<td>
					<a href={resolveCampaignHref(row.campaignId)}>{row.campaignName}</a>
				</td>
				<td>{row.level}</td>
				<td>{formatHp(row.hpCurrent, row.hpMax)}</td>
			{/snippet}
			{#snippet actions(row)}
				<RemoveIconButton
					variant="ghost"
					ariaLabel={`Remove ${row.username} from playerbase`}
					busy={removingUserId === row.userId}
					onclick={() => handleRemoveFromPlayerbase(row.userId, row.username)}
				/>
			{/snippet}
		</CatalogTable>
	</section>

	<section class="library-section" id="npcs" aria-labelledby="library-npcs-heading">
		<LibrarySectionHeader
			id="library-npcs-heading"
			title="NPCs"
			addLabel="NPC"
			addHref={resolve('/')}
		/>

		<CatalogTable
			items={npcRows}
			getId={(row) => row.characterId}
			emptyMessage="No NPCs yet. Add them from a campaign page."
		>
			{#snippet header()}
				<th scope="col">Name</th>
				<th scope="col">Type</th>
				<th scope="col">Campaign</th>
				<th scope="col">Race</th>
				<th scope="col">Class</th>
				<th scope="col">Role</th>
				<th scope="col">Level</th>
			{/snippet}
			{#snippet row(row)}
				<td class="name-cell">
					{#if row.campaignId}
						<a
							href={resolve('/library/characters/[characterId]', { characterId: row.characterId })}
						>
							{row.characterName}
						</a>
					{:else}
						{row.characterName}
					{/if}
				</td>
				<td>{CHARACTER_KIND_LABELS[row.kind]}</td>
				<td>{row.campaignNames}</td>
				<td>{formatCell(row.race)}</td>
				<td>{formatCell(row.className)}</td>
				<td>{formatCell(row.roleLabel)}</td>
				<td>{row.level}</td>
			{/snippet}
			{#snippet actions(row)}
				<RemoveIconButton
					variant="ghost"
					ariaLabel={`Remove ${row.characterName} from library`}
					busy={removingCharacterId === row.characterId}
					onclick={() => handleRemoveNpcFromLibrary(row.characterId, row.characterName)}
				/>
			{/snippet}
		</CatalogTable>
	</section>

	<MonsterTemplatesSection />

	{#if error}
		<p class="hint error">{error}</p>
	{/if}
{/if}

<style>
	.library-header h1 {
		margin: 0;
	}

	.hint.error {
		color: var(--color-danger);
	}
</style>
