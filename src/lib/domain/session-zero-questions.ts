export type {
	SessionZeroCategory,
	SessionZeroCategoryBlock,
	SessionZeroCategoryId,
	SessionZeroQuestion,
	SessionZeroSectionGroup,
	SessionZeroState,
	SessionZeroSubcategory
} from './session-zero-types';

import type {
	SessionZeroCategory,
	SessionZeroCategoryBlock,
	SessionZeroCategoryId,
	SessionZeroQuestion,
	SessionZeroSectionGroup,
	SessionZeroState,
	SessionZeroSubcategory
} from './session-zero-types';
import {
	SESSION_ZERO_CATEGORIES,
	SESSION_ZERO_QUESTIONS,
	SESSION_ZERO_QUESTION_IDS
} from './session-zero-questions.data';

export const SESSION_ZERO_QUESTION_BY_ID = new Map<string, SessionZeroQuestion>(
	SESSION_ZERO_QUESTIONS.map((question) => [question.id, question])
);

const SESSION_ZERO_QUESTION_ID_SET = new Set(SESSION_ZERO_QUESTION_IDS);

export function emptySessionZeroAnswers(): Record<string, string> {
	return Object.fromEntries(SESSION_ZERO_QUESTIONS.map((question) => [question.id, '']));
}

export function defaultActiveQuestionIds(): string[] {
	return [...SESSION_ZERO_QUESTION_IDS];
}

export function createEmptySessionZeroState(): SessionZeroState {
	return {
		answers: emptySessionZeroAnswers(),
		activeQuestionIds: defaultActiveQuestionIds()
	};
}

export function getSessionZeroQuestion(id: string): SessionZeroQuestion | undefined {
	return SESSION_ZERO_QUESTION_BY_ID.get(id);
}

export function getSessionZeroCategory(id: SessionZeroCategoryId): SessionZeroCategory | undefined {
	return SESSION_ZERO_CATEGORIES.find((category) => category.id === id);
}

export function getSessionZeroCategoryForQuestion(questionId: string): SessionZeroCategory | undefined {
	for (const category of SESSION_ZERO_CATEGORIES) {
		if (category.questions?.some((question) => question.id === questionId)) {
			return category;
		}

		if (
			category.subcategories?.some((subcategory) =>
				subcategory.questions.some((question) => question.id === questionId)
			)
		) {
			return category;
		}
	}

	return undefined;
}

export function getSessionZeroSubcategoryForQuestion(
	questionId: string
): SessionZeroSubcategory | undefined {
	for (const category of SESSION_ZERO_CATEGORIES) {
		for (const subcategory of category.subcategories ?? []) {
			if (subcategory.questions.some((question) => question.id === questionId)) {
				return subcategory;
			}
		}
	}

	return undefined;
}

export function sortSessionZeroQuestionIds(questionIds: string[]): string[] {
	const questionIdSet = new Set(questionIds);
	return SESSION_ZERO_QUESTION_IDS.filter((id) => questionIdSet.has(id));
}

export function getExcludedSessionZeroQuestionIds(activeQuestionIds: string[]): string[] {
	const active = new Set(activeQuestionIds);
	return SESSION_ZERO_QUESTION_IDS.filter((id) => !active.has(id));
}

function filterSectionGroups(
	activeQuestionIds: string[],
	includeActive: boolean
): SessionZeroSectionGroup[] {
	const active = new Set(activeQuestionIds);
	const groups: SessionZeroSectionGroup[] = [];

	for (const category of SESSION_ZERO_CATEGORIES) {
		if (category.subcategories) {
			for (const subcategory of category.subcategories) {
				const questions = subcategory.questions.filter((question) =>
					includeActive ? active.has(question.id) : !active.has(question.id)
				);

				if (questions.length) {
					groups.push({ category, subcategory, questions });
				}
			}

			continue;
		}

		const questions = (category.questions ?? []).filter((question) =>
			includeActive ? active.has(question.id) : !active.has(question.id)
		);

		if (questions.length) {
			groups.push({ category, questions });
		}
	}

	return groups;
}

export function groupActiveQuestionsBySection(activeQuestionIds: string[]): SessionZeroSectionGroup[] {
	return filterSectionGroups(activeQuestionIds, true);
}

export function groupExcludedQuestionsBySection(
	activeQuestionIds: string[]
): SessionZeroSectionGroup[] {
	return filterSectionGroups(activeQuestionIds, false);
}

export function groupSectionsByCategory(sections: SessionZeroSectionGroup[]): SessionZeroCategoryBlock[] {
	const blocks: SessionZeroCategoryBlock[] = [];
	const blockMap = new Map<SessionZeroCategoryId, SessionZeroCategoryBlock>();

	for (const section of sections) {
		let block = blockMap.get(section.category.id);

		if (!block) {
			block = { category: section.category, sections: [] };
			blockMap.set(section.category.id, block);
			blocks.push(block);
		}

		block.sections.push(section);
	}

	return blocks;
}

function normalizeAnswers(raw: Record<string, unknown>): Record<string, string> {
	const answers = emptySessionZeroAnswers();

	for (const [key, value] of Object.entries(raw)) {
		if (SESSION_ZERO_QUESTION_ID_SET.has(key) && typeof value === 'string') {
			answers[key] = value;
		}
	}

	return answers;
}

export function parseSessionZeroJson(json: string): SessionZeroState {
	try {
		const parsed = JSON.parse(json) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return createEmptySessionZeroState();
		}

		const record = parsed as Record<string, unknown>;

		if (record.answers && typeof record.answers === 'object' && !Array.isArray(record.answers)) {
			const activeQuestionIds = Array.isArray(record.activeQuestionIds)
				? sortSessionZeroQuestionIds(
						record.activeQuestionIds.filter((id): id is string => typeof id === 'string')
					)
				: defaultActiveQuestionIds();

			return {
				answers: normalizeAnswers(record.answers as Record<string, unknown>),
				activeQuestionIds: activeQuestionIds.length ? activeQuestionIds : defaultActiveQuestionIds()
			};
		}

		return {
			answers: normalizeAnswers(record),
			activeQuestionIds: defaultActiveQuestionIds()
		};
	} catch {
		return createEmptySessionZeroState();
	}
}

export function serializeSessionZeroJson(state: SessionZeroState): string {
	return JSON.stringify({
		answers: Object.fromEntries(
			SESSION_ZERO_QUESTION_IDS.map((id) => [id, state.answers[id]?.trim() ?? ''])
		),
		activeQuestionIds: sortSessionZeroQuestionIds(state.activeQuestionIds)
	});
}

export function trimSessionZeroAnswers(answers: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		SESSION_ZERO_QUESTION_IDS.map((id) => [id, answers[id]?.trim() ?? ''])
	);
}
