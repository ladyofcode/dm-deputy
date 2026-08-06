export const STORY_NODE_SIZE = 168;

export type NodePosition = {
	x: number;
	y: number;
};

export type PartNodeLayout = Record<string, NodePosition>;
export type PartItemLayout = Record<string, NodePosition>;

export type ItemSize = {
	width: number;
	height: number;
};
