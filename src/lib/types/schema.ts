export type User = {
	user_id: string;
	email: string;
	username: string;
	theme: 'default' | 'medieval';
	date_created: string;
};

export type Campaign = {
	campaign_id: string;
	owner_user_id: string;
	campaign_name: string;
	description: string | null;
	game_schema: string;
	theme: 'default' | 'medieval';
	date_created: string;
	date_deleted: string | null;
};

export type CampaignMember = {
	player_id: string;
	campaign_id: string;
	user_id: string;
	character_id: string | null;
	date_campaign_joined: string;
	role: 'gm' | 'player';
	last_played_at: string | null;
};

export type Adventure = {
	adventure_id: string;
	campaign_id: string;
	name: string;
	overview: string | null;
	adventure_hook: string | null;
	can_promote_to_campaign: boolean;
	date_created: string;
};

export type Part = {
	part_id: string;
	adventure_id: string;
	title: string;
	summary: string | null;
	session_estimate_min: number;
	session_estimate_max: number;
	sort_order: number;
};

export type StoryNodeKind = 'encounter' | 'event';

export type StoryNode = {
	node_id: string;
	kind: StoryNodeKind;
	title: string;
	summary: string;
	parent_node_ids: string[];
};

export type StoryItem = {
	item_id: string;
	parent_node_id: string;
	label: string;
};
