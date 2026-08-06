import type { Handle } from '@sveltejs/kit';
import { crossOriginIsolationHeaders } from '../cross-origin-isolation-headers.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
		response.headers.set(name, value);
	}

	return response;
};
