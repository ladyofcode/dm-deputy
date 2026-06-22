import type { StoryNode } from '$lib/types/schema';
import type { PartItemLayout, PartNodeLayout } from '$lib/data/part-story';
import type { StoryItem } from '$lib/types/schema';

export type DbExec = {
	exec: (sql: string | { sql: string; bind?: Record<string, unknown> }) => void;
	selectObjects: <T>(sql: string, bind?: Record<string, unknown>) => T[];
};

export type LocalStorageStoryMigration = {
	partId: string;
	nodes: StoryNode[] | null;
	nodeLayout: PartNodeLayout | null;
	itemLayout: PartItemLayout | null;
};

export type CampaignSnapshot = {
	users: import('$lib/types/schema').User[];
	campaigns: import('$lib/types/schema').Campaign[];
	campaignMembers: import('$lib/types/schema').CampaignMember[];
	campaignNpcs: import('$lib/types/schema').CampaignNpc[];
	adventures: import('$lib/types/schema').Adventure[];
	parts: import('$lib/types/schema').Part[];
	characters: import('$lib/types/schema').Character[];
	maps: import('$lib/types/schema').CampaignMap[];
};

export type PartStorySnapshot = {
	nodes: StoryNode[] | null;
	nodeLayout: PartNodeLayout | null;
	itemLayout: PartItemLayout | null;
	items: StoryItem[] | null;
};

export type InitResult = {
	schemaVersion: number;
	seeded: boolean;
	campaignCount: number;
	persistent: boolean;
};

export type CatalogSnapshot = {
	spells: import('$lib/types/schema').Spell[];
	weapons: import('$lib/types/schema').Weapon[];
	armor: import('$lib/types/schema').Armor[];
	items: import('$lib/types/schema').Item[];
};

export type CreateCampaignPlayerInput = {
	user_id: string;
	username: string;
	player_id: string;
	character_id: string;
};

export type CreateCampaignInput = {
	campaign_id: string;
	owner_user_id: string;
	campaign_name: string;
	description: string | null;
	game_schema: string;
	player_id: string;
	date_created: string;
	players: CreateCampaignPlayerInput[];
};

export type CreateAdventureInput = {
	adventure_id: string;
	campaign_id: string;
	name: string;
	overview: string | null;
	adventure_hook: string | null;
	can_promote_to_campaign: boolean;
	date_created: string;
};

export type CreateCampaignMapInput = {
	map_id: string;
	campaign_id: string;
	name: string;
	mime_type: string;
	full_width: number;
	full_height: number;
	thumb_width: number;
	thumb_height: number;
	created_at: string;
};

export type PromoteAdventureOptions =
	import('$lib/domain/promote-adventure').PromoteAdventureOptions;

export type PromoteAdventureInput = {
	adventure_id: string;
	owner_user_id: string;
	options: PromoteAdventureOptions;
};

export type PromoteAdventureResult = {
	campaign_id: string;
	adventure_id: string;
	part_ids: string[];
};

export type CharacterLoadout = {
	weapon_ids: string[];
	armor_ids: string[];
	item_ids: string[];
	spell_ids: string[];
};

export type CreateCampaignCharacterInput = {
	character_id: string;
	campaign_id: string;
	kind: import('$lib/types/schema').NpcCharacterKind;
	created_by_user_id: string;
	display_name: string;
	notes?: string | null;
	level?: number;
	experience?: number;
	hp_max?: number;
	hp_current?: number;
	reputation?: string | null;
	loadout?: CharacterLoadout;
	campaign_npc_id?: string;
	date_added?: string;
};

export type UpdateCampaignCharacterInput = {
	character_id: string;
	kind: import('$lib/types/schema').CharacterKind;
	display_name: string;
	notes?: string | null;
	reputation?: string | null;
	loadout?: CharacterLoadout;
};

export type UpdateCharacterStatCacheInput = {
	character_id: string;
	experience: number;
	level: number;
	hp_max: number;
	hp_current: number;
};

export type AddCampaignPlayerInput = {
	campaign_id: string;
	owner_user_id: string;
	date_created: string;
	user_id: string;
	username: string;
	player_id: string;
	character_id: string;
};

export type AddCampaignPlayerResult = {
	user: import('$lib/types/schema').User;
	character: import('$lib/types/schema').Character;
	member: import('$lib/types/schema').CampaignMember;
};

export type AddCampaignNpcToCampaignInput = {
	campaign_id: string;
	character_id: string;
	campaign_npc_id: string;
	date_added: string;
};

export type AddCampaignNpcToCampaignResult = {
	campaignNpc: import('$lib/types/schema').CampaignNpc;
	character: import('$lib/types/schema').Character;
};

export type AddCampaignPcToCampaignInput = {
	campaign_id: string;
	character_id: string;
	player_id: string;
	date_campaign_joined: string;
};

export type AddCampaignPcToCampaignResult = {
	character: import('$lib/types/schema').Character;
	member: import('$lib/types/schema').CampaignMember;
};

export type UpdateCampaignDetailsInput = {
	campaign_id: string;
	campaign_name: string;
	description: string | null;
};

export type LoadCampaignMapBlobArgs = [string, 'thumb' | 'full'];

export type CatalogKind = import('$lib/domain/catalog').CatalogKind;

export type WorkerRequest =
	| { id: number; method: 'init'; args: [LocalStorageStoryMigration[], ArrayBuffer] }
	| { id: number; method: 'loadCampaignSnapshot'; args: [] }
	| { id: number; method: 'loadCatalogSnapshot'; args: [] }
	| { id: number; method: 'loadPartStory'; args: [string] }
	| { id: number; method: 'savePartStoryNodes'; args: [string, StoryNode[]] }
	| { id: number; method: 'savePartNodeLayout'; args: [string, PartNodeLayout] }
	| { id: number; method: 'savePartItemLayout'; args: [string, PartItemLayout] }
	| { id: number; method: 'savePartStoryItems'; args: [string, StoryItem[]] }
	| { id: number; method: 'createCampaign'; args: [CreateCampaignInput] }
	| { id: number; method: 'createAdventure'; args: [CreateAdventureInput] }
	| { id: number; method: 'syncAdventureParts'; args: [string, import('$lib/types/schema').Part[]] }
	| { id: number; method: 'activateStoryNode'; args: [string, string] }
	| { id: number; method: 'toggleStoryNodeCompleted'; args: [string, string] }
	| { id: number; method: 'updateAdventurePromote'; args: [string, boolean] }
	| {
			id: number;
			method: 'updateUserTheme';
			args: [string, import('$lib/types/schema').User['theme']];
	  }
	| { id: number; method: 'softDeletePlayer'; args: [string] }
	| {
			id: number;
			method: 'updateCampaignTheme';
			args: [string, import('$lib/types/schema').Campaign['theme']];
	  }
	| { id: number; method: 'updateCampaignDetails'; args: [UpdateCampaignDetailsInput] }
	| { id: number; method: 'touchCampaign'; args: [string, string] }
	| { id: number; method: 'exportDatabase'; args: [] }
	| { id: number; method: 'importDatabase'; args: [ArrayBuffer] }
	| {
			id: number;
			method: 'createCampaignMap';
			args: [CreateCampaignMapInput, ArrayBuffer, ArrayBuffer];
	  }
	| { id: number; method: 'deleteCampaignMap'; args: [string] }
	| { id: number; method: 'loadCampaignMapBlob'; args: LoadCampaignMapBlobArgs }
	| { id: number; method: 'createCampaignCharacter'; args: [CreateCampaignCharacterInput] }
	| { id: number; method: 'updateCampaignCharacter'; args: [UpdateCampaignCharacterInput] }
	| { id: number; method: 'loadCharacterStatEvents'; args: [string, import('$lib/types/schema').StatKind | null] }
	| { id: number; method: 'insertCharacterStatEvent'; args: [import('$lib/types/schema').CharacterStatEvent] }
	| { id: number; method: 'insertEncounterResolution'; args: [import('$lib/types/schema').EncounterResolution] }
	| { id: number; method: 'getEncounterResolutionByEventId'; args: [string] }
	| { id: number; method: 'getEncounterResolutionEventIds'; args: [string[]] }
	| { id: number; method: 'loadEncounterXpAwardsByEventIds'; args: [string[]] }
	| { id: number; method: 'updateCharacterStatCache'; args: [UpdateCharacterStatCacheInput] }
	| { id: number; method: 'loadCharacterLoadout'; args: [string] }
	| { id: number; method: 'addCampaignPlayer'; args: [AddCampaignPlayerInput] }
	| { id: number; method: 'removeCampaignPlayer'; args: [string, string] }
	| { id: number; method: 'addCampaignPcToCampaign'; args: [AddCampaignPcToCampaignInput] }
	| { id: number; method: 'addCampaignNpcToCampaign'; args: [AddCampaignNpcToCampaignInput] }
	| { id: number; method: 'removeCampaignNpcFromCampaign'; args: [string, string] }
	| { id: number; method: 'promoteAdventureToCampaign'; args: [PromoteAdventureInput] }
	| { id: number; method: 'upsertSpell'; args: [import('$lib/types/schema').Spell] }
	| { id: number; method: 'deleteSpell'; args: [string] }
	| { id: number; method: 'upsertWeapon'; args: [import('$lib/types/schema').Weapon] }
	| { id: number; method: 'deleteWeapon'; args: [string] }
	| { id: number; method: 'upsertArmor'; args: [import('$lib/types/schema').Armor] }
	| { id: number; method: 'deleteArmor'; args: [string] }
	| { id: number; method: 'upsertItem'; args: [import('$lib/types/schema').Item] }
	| { id: number; method: 'deleteItem'; args: [string] };

export type WorkerResponse =
	| { id: number; result: unknown; buffer?: ArrayBuffer }
	| { id: number; error: string };
