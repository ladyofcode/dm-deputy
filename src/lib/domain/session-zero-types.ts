export type SessionZeroQuestion = {
	id: string;
	prompt: string;
	description: string;
};

export type SessionZeroCategoryId =
	| 'world'
	| 'dm_style'
	| 'conduct'
	| 'sensitive_topics'
	| 'character_creation'
	| 'gameplay'
	| 'inspiration';

export type SessionZeroSubcategory = {
	id: string;
	label: string;
	questions: SessionZeroQuestion[];
};

export type SessionZeroCategory = {
	id: SessionZeroCategoryId;
	label: string;
	questions?: SessionZeroQuestion[];
	subcategories?: SessionZeroSubcategory[];
};

export type SessionZeroState = {
	answers: Record<string, string>;
	activeQuestionIds: string[];
};

export type SessionZeroSectionGroup = {
	category: SessionZeroCategory;
	subcategory?: SessionZeroSubcategory;
	questions: SessionZeroQuestion[];
};

export type SessionZeroCategoryBlock = {
	category: SessionZeroCategory;
	sections: SessionZeroSectionGroup[];
};
