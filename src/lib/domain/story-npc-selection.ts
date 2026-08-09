const TEMPLATE_PREFIX = 'template:';
const CHARACTER_PREFIX = 'character:';

export function encodeStoryNpcSelection(
	characterId: string,
	monsterTemplateId: string
): string {
	if (monsterTemplateId) return `${TEMPLATE_PREFIX}${monsterTemplateId}`;
	if (characterId) return `${CHARACTER_PREFIX}${characterId}`;
	return '';
}

export function decodeStoryNpcSelection(value: string): {
	characterId: string;
	monsterTemplateId: string;
} {
	if (value.startsWith(TEMPLATE_PREFIX)) {
		return { characterId: '', monsterTemplateId: value.slice(TEMPLATE_PREFIX.length) };
	}

	if (value.startsWith(CHARACTER_PREFIX)) {
		return { characterId: value.slice(CHARACTER_PREFIX.length), monsterTemplateId: '' };
	}

	return { characterId: '', monsterTemplateId: '' };
}
