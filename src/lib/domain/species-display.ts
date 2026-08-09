import { getSpeciesByName } from '$lib/games/dnd5e/data/species';
import type { CharacterIdentityDraft } from '$lib/domain/npc-draft';
import type { Species } from '$lib/types/schema';

export function parseSpeciesSizeLabel(size: string): string {
	const trimmed = size.trim();
	if (!trimmed) return '';

	const parenIndex = trimmed.indexOf('(');
	return (parenIndex === -1 ? trimmed : trimmed.slice(0, parenIndex)).trim();
}

export function formatSpeciesCreatureType(species: Species): string {
	const size = parseSpeciesSizeLabel(species.size);
	const type = species.creature_type.trim().toLowerCase();
	return size ? `${size} ${type}` : type;
}

export function applySpeciesToIdentity(
	identity: CharacterIdentityDraft,
	species: Species
): CharacterIdentityDraft {
	return {
		...identity,
		race: species.species_name,
		creature_type: formatSpeciesCreatureType(species)
	};
}

export function resolveIdentitySizeType(identity: CharacterIdentityDraft): string {
	const species = getSpeciesByName(identity.race);
	if (species) return formatSpeciesCreatureType(species);
	return identity.creature_type.trim();
}
