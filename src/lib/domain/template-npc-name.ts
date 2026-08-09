import { pickRandom } from '$lib/domain/name-generator';
import {
	buildFullName,
	getRaceNameGenerator,
	type NamePool
} from '$lib/games/dnd5e/data/name-generators';
import type { MonsterTemplate } from '$lib/games/dnd5e/data/monsters';
import { getStoredMonsterTemplateById } from '$lib/stores/monster-templates.svelte';

function isSurnamePool(pool: NamePool): boolean {
	return pool.id === 'surname' || pool.id === 'clan' || pool.id === 'family';
}

export function getNameGeneratorIdForTemplate(template: MonsterTemplate): string {
	const creatureType = template.creature_type.toLowerCase();
	const name = template.name.toLowerCase();

	if (name.includes('goblin') || creatureType.includes('goblinoid')) return 'goblin';
	if (creatureType.includes('elf')) return 'elf';
	if (creatureType.includes('dwarf')) return 'dwarf';
	return 'human';
}

export function generateRandomNameForGeneratorId(generatorId: string): string {
	const generator = getRaceNameGenerator(generatorId);
	if (!generator) return '';

	if (generator.groups?.length) {
		const group = pickRandom(generator.groups);
		const givenPools = group.pools.filter((pool) => !isSurnamePool(pool));
		const surnamePool = group.pools.find((pool) => isSurnamePool(pool));
		const givenPool = givenPools.length ? pickRandom(givenPools) : null;
		const parts: string[] = [];

		if (givenPool) parts.push(pickRandom(givenPool.names));
		if (surnamePool) parts.push(pickRandom(surnamePool.names));

		return buildFullName(parts, group.surnameFirst);
	}

	const givenPools = generator.pools.filter((pool) => !isSurnamePool(pool));
	const surnamePool = generator.pools.find((pool) => isSurnamePool(pool));
	const givenPool = givenPools.length ? pickRandom(givenPools) : null;
	const parts: string[] = [];

	if (givenPool) parts.push(pickRandom(givenPool.names));
	if (surnamePool) parts.push(pickRandom(surnamePool.names));

	if (parts.length === 1) return parts[0]!;
	return buildFullName(parts, generator.surnameFirst);
}

export function generateRandomNameForTemplate(templateId: string): string {
	const template = getStoredMonsterTemplateById(templateId);
	if (!template) return '';
	return generateRandomNameForGeneratorId(getNameGeneratorIdForTemplate(template));
}
