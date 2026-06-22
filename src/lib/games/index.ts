import { dnd5eRuleset } from '$lib/games/dnd5e';
import type { GameSchema, Ruleset } from '$lib/games/types';
import { isGameSchema } from '$lib/games/types';

const rulesets: Record<GameSchema, Ruleset> = {
	dnd5e: dnd5eRuleset
};

export function getRuleset(gameSchema: string): Ruleset {
	if (!isGameSchema(gameSchema)) {
		throw new Error(`Unknown game schema: ${gameSchema}`);
	}

	return rulesets[gameSchema];
}

export function getKnownGameSchemas(): GameSchema[] {
	return Object.keys(rulesets) as GameSchema[];
}

export { dnd5eRuleset } from '$lib/games/dnd5e';
export type { CharacterLevel, Dnd5eRuleset, GameSchema, Ruleset } from '$lib/games/types';
export { isGameSchema } from '$lib/games/types';
