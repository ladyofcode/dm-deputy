import {
	persistCharacterPortrait,
	persistCharacterPresentation,
	persistCharacterPortraitSource,
	persistCharacterPresentationSource
} from '$lib/data/writes';
import type { NormalizedCropRect } from '$lib/domain/crop-image';
import type { CharacterPortraitUploadPayload } from '$lib/types/image-upload';

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
	portraitOriginalFile?: File | null;
	portraitThumbCropFile?: File | null;
	portraitThumbCropRect?: NormalizedCropRect | null;
	portraitImageSource?: string | null;
	presentationOriginalFile?: File | null;
	presentationThumbCropFile?: File | null;
	presentationThumbCropRect?: NormalizedCropRect | null;
	presentationImageSource?: string | null;
};

function buildPortraitUploadPayload(
	originalFile: File | null | undefined,
	thumbCropFile: File | null | undefined,
	thumbCropRect: NormalizedCropRect | null | undefined,
	imageSource: string | null | undefined
): CharacterPortraitUploadPayload | null {
	if (!originalFile && !thumbCropFile) return null;

	return {
		originalFile: originalFile ?? null,
		thumbCropFile: thumbCropFile ?? null,
		thumbCropRect: thumbCropRect ?? null,
		imageSource: imageSource ?? null
	};
}

export async function persistPendingCharacterMedia(
	characterId: string,
	media: PendingCharacterMedia
): Promise<void> {
	const portraitPayload = buildPortraitUploadPayload(
		media.portraitOriginalFile,
		media.portraitThumbCropFile,
		media.portraitThumbCropRect,
		media.portraitImageSource
	);
	if (portraitPayload) {
		await persistCharacterPortrait(characterId, portraitPayload);
	}

	const presentationPayload = buildPortraitUploadPayload(
		media.presentationOriginalFile,
		media.presentationThumbCropFile,
		media.presentationThumbCropRect,
		media.presentationImageSource
	);
	if (presentationPayload) {
		await persistCharacterPresentation(characterId, presentationPayload);
	}
}

export function imageUploadResultToPortraitPayload(
	result: import('$lib/types/image-upload').ImageUploadResult
): CharacterPortraitUploadPayload {
	return {
		originalFile: result.reCropOnly ? null : (result.originalFile ?? null),
		thumbCropFile: result.file,
		thumbCropRect: result.thumbCropRect ?? null,
		imageSource: result.imageSource
	};
}
