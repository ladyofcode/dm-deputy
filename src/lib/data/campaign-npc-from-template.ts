import { persistCampaignNpc } from '$lib/data/writes';
import { createEmptyNpcDraftLine } from '$lib/domain/npc-draft';
import { loadMonsterTemplateIntoDraft } from '$lib/games/dnd5e/data/monsters';
import { getStoredMonsterTemplateById } from '$lib/stores/monster-templates.svelte';
import { getCachedArmor, getCachedWeapons } from '$lib/db/catalog-cache';
import type { Character } from '$lib/types/schema';

export async function createCampaignNpcFromTemplate(
	campaignId: string,
	createdByUserId: string,
	templateId: string,
	displayName?: string
): Promise<Character> {
	const template = getStoredMonsterTemplateById(templateId);
	if (!template) {
		throw new Error('Monster template not found');
	}

	const weapons = getCachedWeapons().map((entry) => ({
		weapon_id: entry.weapon_id,
		weapon_name: entry.weapon_name
	}));
	const armor = getCachedArmor().map((entry) => ({
		armor_id: entry.armor_id,
		armor_name: entry.armor_name
	}));

	const loaded = await loadMonsterTemplateIntoDraft(template, weapons, armor);
	const line = createEmptyNpcDraftLine();

	line.kind = loaded.kind;
	line.name = displayName?.trim() || loaded.name;
	line.description = loaded.description;
	line.identity = loaded.identity;
	line.extras = loaded.extras;
	line.portraitFile = loaded.portraitFile;
	line.portraitImageSource = loaded.portraitImageSource;

	return persistCampaignNpc(campaignId, createdByUserId, line);
}
