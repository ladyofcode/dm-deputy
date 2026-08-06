import { getCachedConditions, isCatalogCacheReady } from '$lib/db/catalog-cache';
import type { Condition } from '$lib/types/schema';

function assertCatalogReady(): void {
	if (!isCatalogCacheReady()) {
		throw new Error('Ruleset catalog is not ready yet');
	}
}

export const DEFAULT_DND5E_CONDITIONS: Condition[] = [
	{
		condition_id: 'cond-blinded',
		condition_name: 'Blinded',
		description:
			"A blinded creature can't see and automatically fails any ability check that requires sight.\nAttack rolls against the creature have advantage, and the creature's attack rolls have disadvantage."
	},
	{
		condition_id: 'cond-charmed',
		condition_name: 'Charmed',
		description:
			"A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.\nThe charmer has advantage on any ability check to interact socially with the creature."
	},
	{
		condition_id: 'cond-deafened',
		condition_name: 'Deafened',
		description:
			"A deafened creature can't hear and automatically fails any ability check that requires hearing."
	},
	{
		condition_id: 'cond-frightened',
		condition_name: 'Frightened',
		description:
			"A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.\nThe creature can't willingly move closer to the source of its fear."
	},
	{
		condition_id: 'cond-grappled',
		condition_name: 'Grappled',
		description:
			"A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.\nThe condition ends if the grappler is incapacitated (see the condition).\nThe condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell."
	},
	{
		condition_id: 'cond-incapacitated',
		condition_name: 'Incapacitated',
		description: "An incapacitated creature can't take actions or reactions."
	},
	{
		condition_id: 'cond-invisible',
		condition_name: 'Invisible',
		description:
			"An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.\nAttack rolls against the creature have disadvantage, and the creature's attack rolls have advantage."
	},
	{
		condition_id: 'cond-paralyzed',
		condition_name: 'Paralyzed',
		description:
			"A paralyzed creature is incapacitated (see the condition) and can't move or speak.\nThe creature automatically fails Strength and Dexterity saving throws.\nAttack rolls against the creature have advantage.\nAny attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature."
	},
	{
		condition_id: 'cond-petrified',
		condition_name: 'Petrified',
		description:
			"A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.\nThe creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings.\nAttack rolls against the creature have advantage.\nThe creature automatically fails Strength and Dexterity saving throws.\nThe creature has resistance to all damage.\nThe creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized."
	},
	{
		condition_id: 'cond-poisoned',
		condition_name: 'Poisoned',
		description: 'A poisoned creature has disadvantage on attack rolls and ability checks.'
	},
	{
		condition_id: 'cond-prone',
		condition_name: 'Prone',
		description:
			"A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.\nThe creature has disadvantage on attack rolls.\nAn attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage."
	},
	{
		condition_id: 'cond-restrained',
		condition_name: 'Restrained',
		description:
			"A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.\nAttack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.\nThe creature has disadvantage on Dexterity saving throws."
	},
	{
		condition_id: 'cond-stunned',
		condition_name: 'Stunned',
		description:
			"A stunned creature is incapacitated (see the condition), can't move, and can speak only falteringly.\nThe creature automatically fails Strength and Dexterity saving throws.\nAttack rolls against the creature have advantage."
	},
	{
		condition_id: 'cond-unconscious',
		condition_name: 'Unconscious',
		description:
			"An unconscious creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings.\nThe creature drops whatever it's holding and falls prone.\nThe creature automatically fails Strength and Dexterity saving throws.\nAttack rolls against the creature have advantage.\nAny attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature."
	}
];

export function getConditionsCatalog(): Condition[] {
	assertCatalogReady();
	return getCachedConditions();
}

export function getConditionById(conditionId: string): Condition | undefined {
	return getConditionsCatalog().find((entry) => entry.condition_id === conditionId);
}

export function getConditionByName(conditionName: string): Condition | undefined {
	return getConditionsCatalog().find(
		(entry) => entry.condition_name.toLowerCase() === conditionName.toLowerCase()
	);
}
