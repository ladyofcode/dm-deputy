import {
	persistCharacterPortrait,
	persistCharacterPresentation,
	persistCharacterPortraitSource,
	persistCharacterPresentationSource
} from '$lib/data/writes';

export type CharacterMediaVariant = 'portrait' | 'presentation';

export function getCharacterMediaUploadPersist(variant: CharacterMediaVariant) {
	return variant === 'presentation' ? persistCharacterPresentation : persistCharacterPortrait;
}

export function getCharacterMediaSourcePersist(variant: CharacterMediaVariant) {
	return variant === 'presentation'
		? persistCharacterPresentationSource
		: persistCharacterPortraitSource;
}

export type PendingCharacterMedia = {
	portraitFile?: File | null;
	portraitImageSource?: string | null;
	presentationFile?: File | null;
	presentationImageSource?: string | null;
};

export async function persistPendingCharacterMedia(
	characterId: string,
	media: PendingCharacterMedia
): Promise<void> {
	if (media.portraitFile) {
		await persistCharacterPortrait(
			characterId,
			media.portraitFile,
			media.portraitImageSource ?? null
		);
	}

	if (media.presentationFile) {
		await persistCharacterPresentation(
			characterId,
			media.presentationFile,
			media.presentationImageSource ?? null
		);
	}
}
