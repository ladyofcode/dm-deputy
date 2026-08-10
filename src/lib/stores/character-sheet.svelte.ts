import { formatErrorMessage } from '$lib/domain/errors';
import {
	cloneCharacterIdentity,
	cloneCharacterExtras,
	createDefaultCharacterIdentity,
	createDefaultCharacterExtras,
	normalizeHpCurrent,
	type CharacterIdentityDraft,
	type CharacterExtrasDraft
} from '$lib/domain/npc-draft';
import { applySpeciesToIdentity } from '$lib/domain/species-display';
import { getSpeciesByName } from '$lib/games/dnd5e/data/species';
import { loadCharacterSheetDraft } from '$lib/data/writes';
import type { Character, CharacterStatEvent, NpcCharacterKind } from '$lib/types/schema';
import { isNpcCharacterKind } from '$lib/types/schema';
import type { NormalizedCropRect } from '$lib/domain/crop-image';
import type { ApplyMonsterTemplateResult } from '$lib/games/dnd5e/data/monsters';

export type CharacterSheetDraftSnapshot = {
	kind: NpcCharacterKind;
	name: string;
	playerName: string;
	description: string;
	identity: CharacterIdentityDraft;
	extras: CharacterExtrasDraft;
};

export type CharacterSheetSavePayload = CharacterSheetDraftSnapshot & {
	portraitFile: File | null;
	portraitThumbCropFile: File | null;
	portraitThumbCropRect: NormalizedCropRect | null;
	portraitImageSource: string | null;
	presentationFile: File | null;
	presentationThumbCropFile: File | null;
	presentationThumbCropRect: NormalizedCropRect | null;
	presentationImageSource: string | null;
};

type ApplyDraftOptions = {
	normalizeSpecies?: boolean;
};

export function createCharacterSheetStore() {
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let kind = $state<NpcCharacterKind>('npc_general');
	let name = $state('');
	let playerName = $state('');
	let description = $state('');
	let identity = $state<CharacterIdentityDraft>(createDefaultCharacterIdentity());
	let extras = $state<CharacterExtrasDraft>(createDefaultCharacterExtras());
	let portraitFile = $state<File | null>(null);
	let portraitThumbCropFile = $state<File | null>(null);
	let portraitThumbCropRect = $state<NormalizedCropRect | null>(null);
	let portraitImageSource = $state<string | null>(null);
	let presentationFile = $state<File | null>(null);
	let presentationThumbCropFile = $state<File | null>(null);
	let presentationThumbCropRect = $state<NormalizedCropRect | null>(null);
	let presentationImageSource = $state<string | null>(null);
	let combatExpanded = $state<boolean | null>(null);
	let statEvents = $state<CharacterStatEvent[]>([]);

	function clearPortraitFiles() {
		portraitFile = null;
		portraitThumbCropFile = null;
		portraitThumbCropRect = null;
		portraitImageSource = null;
		presentationFile = null;
		presentationThumbCropFile = null;
		presentationThumbCropRect = null;
		presentationImageSource = null;
	}

	function applyDraft(draft: CharacterSheetDraftSnapshot, options: ApplyDraftOptions = {}) {
		kind = draft.kind;
		name = draft.name;
		playerName = draft.playerName;
		description = draft.description;
		let nextIdentity = cloneCharacterIdentity(draft.identity);

		if (options.normalizeSpecies) {
			const matchedSpecies = getSpeciesByName(nextIdentity.race);
			if (matchedSpecies) {
				nextIdentity = applySpeciesToIdentity(nextIdentity, matchedSpecies);
			}
		}

		identity = nextIdentity;
		extras = cloneCharacterExtras(draft.extras);
	}

	async function loadFromCharacter(character: Character): Promise<void> {
		loading = true;
		error = null;

		try {
			const sheet = await loadCharacterSheetDraft(character);
			applyDraft(
				{
					kind: (isNpcCharacterKind(sheet.kind) ? sheet.kind : 'npc_general') as NpcCharacterKind,
					name: sheet.name,
					playerName: sheet.playerName,
					description: sheet.description,
					identity: sheet.identity,
					extras: sheet.extras
				},
				{ normalizeSpecies: true }
			);
			clearPortraitFiles();
		} catch (cause) {
			error = formatErrorMessage(cause, 'Could not load character sheet');
			throw cause;
		} finally {
			loading = false;
		}
	}

	function loadFromProps(props: Partial<CharacterSheetSavePayload> & { kind: NpcCharacterKind }) {
		kind = props.kind;
		name = props.name ?? '';
		playerName = props.playerName ?? '';
		description = props.description ?? '';
		identity = cloneCharacterIdentity(props.identity ?? createDefaultCharacterIdentity());
		extras = cloneCharacterExtras(props.extras ?? createDefaultCharacterExtras());
		portraitFile = props.portraitFile ?? null;
		portraitThumbCropFile = props.portraitThumbCropFile ?? null;
		portraitThumbCropRect = props.portraitThumbCropRect ?? null;
		portraitImageSource = props.portraitImageSource ?? null;
		presentationFile = props.presentationFile ?? null;
		presentationThumbCropFile = props.presentationThumbCropFile ?? null;
		presentationThumbCropRect = props.presentationThumbCropRect ?? null;
		presentationImageSource = props.presentationImageSource ?? null;
		error = null;
	}

	function cloneForSave(): CharacterSheetSavePayload {
		const normalizedExtras = normalizeHpCurrent(cloneCharacterExtras(extras));
		extras = normalizedExtras;

		return {
			kind,
			name: name.trim(),
			playerName: playerName.trim(),
			description: description.trim(),
			identity: cloneCharacterIdentity(identity),
			extras: normalizedExtras,
			portraitFile,
			portraitThumbCropFile,
			portraitThumbCropRect,
			portraitImageSource,
			presentationFile,
			presentationThumbCropFile,
			presentationThumbCropRect,
			presentationImageSource
		};
	}

	function snapshotForPersistence(): CharacterSheetSavePayload {
		return {
			kind,
			name: name.trim(),
			playerName: playerName.trim(),
			description: description.trim(),
			identity: cloneCharacterIdentity(identity),
			extras: cloneCharacterExtras(extras),
			portraitFile,
			portraitThumbCropFile,
			portraitThumbCropRect,
			portraitImageSource,
			presentationFile,
			presentationThumbCropFile,
			presentationThumbCropRect,
			presentationImageSource
		};
	}

	function syncSavedStats(
		updated: Pick<Character, 'experience' | 'level' | 'hp_max' | 'hp_current'>
	) {
		extras = {
			...extras,
			experience: updated.experience,
			level: updated.level,
			hp_max: updated.hp_max,
			hp_current: updated.hp_current
		};
	}

	function applyMonsterTemplate(loaded: ApplyMonsterTemplateResult) {
		kind = loaded.kind;
		name = loaded.name;
		description = loaded.description;
		identity = cloneCharacterIdentity(loaded.identity);
		extras = cloneCharacterExtras(loaded.extras);
		portraitFile = loaded.portraitFile;
		portraitImageSource = loaded.portraitImageSource;
		combatExpanded = true;
	}

	return {
		get loading() {
			return loading;
		},
		set loading(value: boolean) {
			loading = value;
		},
		get saving() {
			return saving;
		},
		set saving(value: boolean) {
			saving = value;
		},
		get error() {
			return error;
		},
		set error(value: string | null) {
			error = value;
		},
		get kind() {
			return kind;
		},
		set kind(value: NpcCharacterKind) {
			kind = value;
		},
		get name() {
			return name;
		},
		set name(value: string) {
			name = value;
		},
		get playerName() {
			return playerName;
		},
		set playerName(value: string) {
			playerName = value;
		},
		get description() {
			return description;
		},
		set description(value: string) {
			description = value;
		},
		get identity() {
			return identity;
		},
		set identity(value: CharacterIdentityDraft) {
			identity = value;
		},
		get extras() {
			return extras;
		},
		set extras(value: CharacterExtrasDraft) {
			extras = value;
		},
		get portraitFile() {
			return portraitFile;
		},
		set portraitFile(value: File | null) {
			portraitFile = value;
		},
		get portraitThumbCropFile() {
			return portraitThumbCropFile;
		},
		set portraitThumbCropFile(value: File | null) {
			portraitThumbCropFile = value;
		},
		get portraitThumbCropRect() {
			return portraitThumbCropRect;
		},
		set portraitThumbCropRect(value: NormalizedCropRect | null) {
			portraitThumbCropRect = value;
		},
		get portraitImageSource() {
			return portraitImageSource;
		},
		set portraitImageSource(value: string | null) {
			portraitImageSource = value;
		},
		get presentationFile() {
			return presentationFile;
		},
		set presentationFile(value: File | null) {
			presentationFile = value;
		},
		get presentationThumbCropFile() {
			return presentationThumbCropFile;
		},
		set presentationThumbCropFile(value: File | null) {
			presentationThumbCropFile = value;
		},
		get presentationThumbCropRect() {
			return presentationThumbCropRect;
		},
		set presentationThumbCropRect(value: NormalizedCropRect | null) {
			presentationThumbCropRect = value;
		},
		get presentationImageSource() {
			return presentationImageSource;
		},
		set presentationImageSource(value: string | null) {
			presentationImageSource = value;
		},
		get combatExpanded() {
			return combatExpanded;
		},
		set combatExpanded(value: boolean | null) {
			combatExpanded = value;
		},
		get statEvents() {
			return statEvents;
		},
		set statEvents(value: CharacterStatEvent[]) {
			statEvents = value;
		},
		applyDraft,
		loadFromCharacter,
		loadFromProps,
		cloneForSave,
		snapshotForPersistence,
		syncSavedStats,
		applyMonsterTemplate,
		clearPortraitFiles
	};
}

export type CharacterSheetStore = ReturnType<typeof createCharacterSheetStore>;
