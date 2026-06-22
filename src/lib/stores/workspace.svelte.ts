import { LOCAL_USER_ID } from '$lib/constants/user';

const CURRENT_USER_STORAGE_KEY = 'dm-deputy:current-user-id';

function readStoredUserId(): string {
	if (typeof localStorage === 'undefined') return LOCAL_USER_ID;

	const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
	if (!stored || stored === 'usr-returning-gm' || stored === 'usr-new-gm') {
		return LOCAL_USER_ID;
	}

	return stored;
}

function persistUserId(userId: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId);
}

class WorkspaceState {
	currentUserId = $state(readStoredUserId());

	setCurrentUser(userId: string) {
		this.currentUserId = userId;
		persistUserId(userId);
	}
}

export const workspace = new WorkspaceState();
