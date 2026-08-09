import type { Species } from '$lib/types/schema';

export const DEFAULT_SPECIES: Species[] = [
	{
		species_id: 'species-dragonborn',
		species_name: 'Dragonborn',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-dwarf',
		species_name: 'Dwarf',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-elf',
		species_name: 'Elf',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-gnome',
		species_name: 'Gnome',
		creature_type: 'Humanoid',
		size: 'Small',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-half-elf',
		species_name: 'Half-Elf',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-half-orc',
		species_name: 'Half-Orc',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-halfling',
		species_name: 'Halfling',
		creature_type: 'Humanoid',
		size: 'Small',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-human',
		species_name: 'Human',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	},
	{
		species_id: 'species-tiefling',
		species_name: 'Tiefling',
		creature_type: 'Humanoid',
		size: 'Medium',
		speed: '30 ft.',
		description: '',
		traits: []
	}
];

export function mergeSpeciesWithDefaults(species: Species[]): Species[] {
	const merged = new Map(DEFAULT_SPECIES.map((entry) => [entry.species_id, entry]));

	for (const entry of species) {
		merged.set(entry.species_id, entry);
	}

	return [...merged.values()];
}
