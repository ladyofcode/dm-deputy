/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from '../types';
import { formatErrorMessage } from '$lib/domain/errors';
import { getDb, getSqlite3 } from './context';
import {
	loadCatalogSnapshot,
	deleteSpell,
	deleteWeapon,
	deleteArmor,
	deleteItem,
	deleteCondition,
	deleteSpecies,
	upsertSpell,
	upsertWeapon,
	upsertArmor,
	upsertItem,
	upsertCondition,
	upsertSpecies
} from './catalog';
import {
	loadCampaignSnapshot,
	createCampaign,
	createAdventure,
	syncAdventureParts,
	updateAdventurePromote,
	updateUserTheme,
	updateUserUsername,
	softDeletePlayer,
	softDeleteNpc,
	softDeleteCampaign,
	updateCampaignTheme,
	updateCampaignDetails,
	updateAdventureShorthand,
	updateSessionZeroAnswers,
	touchCampaign,
	addCampaignPlayer,
	removeCampaignPlayer,
	addCampaignPcToCampaign
} from './campaigns';
import {
	loadPartStory,
	savePartStoryNodes,
	savePartNodeLayout,
	savePartItemLayout,
	savePartStoryItems,
	savePartStory,
	activateStoryNode,
	toggleStoryNodeCompleted,
	addPartNpc,
	removePartNpc
} from './part-story';
import { initDatabase, exportDatabase, importDatabase } from './init';
import { createCampaignMap, deleteCampaignMap, loadCampaignMapBlob } from './maps';
import {
	createCampaignCharacter,
	updateCampaignCharacter,
	loadCharacterLoadout,
	updateCharacterPortrait,
	updateCharacterPortraitSource,
	loadCharacterPortraitBlob,
	updateCharacterPresentation,
	updateCharacterPresentationSource,
	loadCharacterPresentationBlob,
	addCampaignNpcToCampaign,
	removeCampaignNpcFromCampaign
} from './characters';
import {
	loadCharacterStatEvents,
	insertCharacterStatEvent,
	insertCharacterStatEventAndUpdateCache,
	insertCharacterStatEvents,
	insertEncounterResolution,
	persistEncounterXpBatch,
	persistStatChangesBatch,
	getEncounterResolutionByEventId,
	getEncounterResolutionEventIds,
	loadEncounterXpAwardsByEventIds,
	updateCharacterStatCache
} from './stats';
import { promoteAdventureToCampaign } from './promote';

type WorkerMethod = WorkerRequest['method'];

type HandlerFor<M extends WorkerMethod> = (
	request: Extract<WorkerRequest, { method: M }>
) => WorkerResponse | Promise<WorkerResponse>;

const handlers: { [M in WorkerMethod]: HandlerFor<M> } = {
	init: async (request) => {
		const result = await initDatabase(request.args[0], request.args[1]);
		return { id: request.id, result };
	},
	loadCampaignSnapshot: (request) => ({
		id: request.id,
		result: loadCampaignSnapshot(getDb())
	}),
	loadCatalogSnapshot: (request) => ({
		id: request.id,
		result: loadCatalogSnapshot(getDb())
	}),
	loadPartStory: (request) => ({
		id: request.id,
		result: loadPartStory(getDb(), request.args[0])
	}),
	savePartStoryNodes: (request) => {
		savePartStoryNodes(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	savePartNodeLayout: (request) => {
		savePartNodeLayout(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	savePartItemLayout: (request) => {
		savePartItemLayout(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	savePartStoryItems: (request) => {
		savePartStoryItems(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	savePartStory: (request) => {
		savePartStory(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	addPartNpc: (request) => ({
		id: request.id,
		result: addPartNpc(getDb(), request.args[0])
	}),
	removePartNpc: (request) => {
		removePartNpc(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	createCampaign: (request) => {
		createCampaign(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	createAdventure: (request) => {
		createAdventure(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	syncAdventureParts: (request) => {
		syncAdventureParts(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	activateStoryNode: (request) => ({
		id: request.id,
		result: activateStoryNode(getDb(), request.args[0], request.args[1])
	}),
	toggleStoryNodeCompleted: (request) => ({
		id: request.id,
		result: toggleStoryNodeCompleted(getDb(), request.args[0], request.args[1])
	}),
	updateAdventurePromote: (request) => {
		updateAdventurePromote(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	updateUserTheme: (request) => {
		updateUserTheme(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	updateUserUsername: (request) => {
		updateUserUsername(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	softDeletePlayer: (request) => ({
		id: request.id,
		result: softDeletePlayer(getDb(), request.args[0])
	}),
	softDeleteNpc: (request) => ({
		id: request.id,
		result: softDeleteNpc(getDb(), request.args[0])
	}),
	softDeleteCampaign: (request) => ({
		id: request.id,
		result: softDeleteCampaign(getDb(), request.args[0])
	}),
	updateCampaignTheme: (request) => {
		updateCampaignTheme(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	updateCampaignDetails: (request) => ({
		id: request.id,
		result: updateCampaignDetails(getDb(), request.args[0])
	}),
	updateAdventureShorthand: (request) => ({
		id: request.id,
		result: updateAdventureShorthand(getDb(), request.args[0])
	}),
	updateSessionZeroAnswers: (request) => ({
		id: request.id,
		result: updateSessionZeroAnswers(getDb(), request.args[0])
	}),
	touchCampaign: (request) => {
		touchCampaign(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	exportDatabase: (request) => ({
		id: request.id,
		result: null,
		buffer: exportDatabase(getDb(), getSqlite3())
	}),
	importDatabase: async (request) => {
		await importDatabase(getSqlite3(), request.args[0]);
		return { id: request.id, result: null };
	},
	createCampaignMap: (request) => ({
		id: request.id,
		result: createCampaignMap(getDb(), request.args[0], request.args[1], request.args[2])
	}),
	deleteCampaignMap: (request) => {
		deleteCampaignMap(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	loadCampaignMapBlob: (request) => {
		const buffer = loadCampaignMapBlob(getDb(), request.args[0], request.args[1]);
		if (!buffer) {
			return { id: request.id, result: null };
		}

		return { id: request.id, result: null, buffer };
	},
	createCampaignCharacter: (request) => ({
		id: request.id,
		result: createCampaignCharacter(getDb(), request.args[0])
	}),
	updateCampaignCharacter: (request) => ({
		id: request.id,
		result: updateCampaignCharacter(getDb(), request.args[0])
	}),
	loadCharacterStatEvents: (request) => ({
		id: request.id,
		result: loadCharacterStatEvents(getDb(), request.args[0], request.args[1])
	}),
	insertCharacterStatEvent: (request) => ({
		id: request.id,
		result: insertCharacterStatEvent(getDb(), request.args[0])
	}),
	insertCharacterStatEventAndUpdateCache: (request) => ({
		id: request.id,
		result: insertCharacterStatEventAndUpdateCache(getDb(), request.args[0], request.args[1])
	}),
	insertCharacterStatEvents: (request) => {
		insertCharacterStatEvents(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	insertEncounterResolution: (request) => ({
		id: request.id,
		result: insertEncounterResolution(getDb(), request.args[0])
	}),
	persistEncounterXpBatch: (request) => ({
		id: request.id,
		result: persistEncounterXpBatch(getDb(), request.args[0])
	}),
	persistStatChangesBatch: (request) => ({
		id: request.id,
		result: persistStatChangesBatch(getDb(), request.args[0])
	}),
	getEncounterResolutionByEventId: (request) => ({
		id: request.id,
		result: getEncounterResolutionByEventId(getDb(), request.args[0])
	}),
	getEncounterResolutionEventIds: (request) => ({
		id: request.id,
		result: getEncounterResolutionEventIds(getDb(), request.args[0])
	}),
	loadEncounterXpAwardsByEventIds: (request) => ({
		id: request.id,
		result: loadEncounterXpAwardsByEventIds(getDb(), request.args[0])
	}),
	updateCharacterStatCache: (request) => ({
		id: request.id,
		result: updateCharacterStatCache(getDb(), request.args[0])
	}),
	loadCharacterLoadout: (request) => ({
		id: request.id,
		result: loadCharacterLoadout(getDb(), request.args[0])
	}),
	updateCharacterPortrait: (request) => ({
		id: request.id,
		result: updateCharacterPortrait(
			getDb(),
			request.args[0],
			request.args[1],
			request.args[2],
			request.args[3]
		)
	}),
	updateCharacterPortraitSource: (request) => ({
		id: request.id,
		result: updateCharacterPortraitSource(getDb(), request.args[0], request.args[1])
	}),
	loadCharacterPortraitBlob: (request) => {
		const buffer = loadCharacterPortraitBlob(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: buffer, buffer: buffer ?? undefined };
	},
	updateCharacterPresentation: (request) => ({
		id: request.id,
		result: updateCharacterPresentation(
			getDb(),
			request.args[0],
			request.args[1],
			request.args[2],
			request.args[3]
		)
	}),
	updateCharacterPresentationSource: (request) => ({
		id: request.id,
		result: updateCharacterPresentationSource(getDb(), request.args[0], request.args[1])
	}),
	loadCharacterPresentationBlob: (request) => {
		const buffer = loadCharacterPresentationBlob(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: buffer, buffer: buffer ?? undefined };
	},
	addCampaignPlayer: (request) => ({
		id: request.id,
		result: addCampaignPlayer(getDb(), request.args[0])
	}),
	removeCampaignPlayer: (request) => {
		removeCampaignPlayer(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	addCampaignPcToCampaign: (request) => ({
		id: request.id,
		result: addCampaignPcToCampaign(getDb(), request.args[0])
	}),
	addCampaignNpcToCampaign: (request) => ({
		id: request.id,
		result: addCampaignNpcToCampaign(getDb(), request.args[0])
	}),
	removeCampaignNpcFromCampaign: (request) => {
		removeCampaignNpcFromCampaign(getDb(), request.args[0], request.args[1]);
		return { id: request.id, result: null };
	},
	promoteAdventureToCampaign: (request) => ({
		id: request.id,
		result: promoteAdventureToCampaign(getDb(), request.args[0])
	}),
	upsertSpell: (request) => {
		upsertSpell(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteSpell: (request) => {
		deleteSpell(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	upsertWeapon: (request) => {
		upsertWeapon(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteWeapon: (request) => {
		deleteWeapon(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	upsertArmor: (request) => {
		upsertArmor(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteArmor: (request) => {
		deleteArmor(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	upsertItem: (request) => {
		upsertItem(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteItem: (request) => {
		deleteItem(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	upsertCondition: (request) => {
		upsertCondition(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteCondition: (request) => {
		deleteCondition(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	upsertSpecies: (request) => {
		upsertSpecies(getDb(), request.args[0]);
		return { id: request.id, result: null };
	},
	deleteSpecies: (request) => {
		deleteSpecies(getDb(), request.args[0]);
		return { id: request.id, result: null };
	}
};

export async function handleRequest(request: WorkerRequest): Promise<WorkerResponse> {
	try {
		const handler = handlers[request.method] as HandlerFor<typeof request.method>;
		return await handler(request as Extract<WorkerRequest, { method: typeof request.method }>);
	} catch (error) {
		const message = formatErrorMessage(error, String(error));
		return { id: request.id, error: message };
	}
}
