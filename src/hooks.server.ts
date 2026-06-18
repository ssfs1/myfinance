import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { handle as authHandle } from '$lib/server/auth';
import { ensureMaterialization } from '$lib/server/recurring';

const recurrencyTrigger: Handle = async ({ event, resolve }) => {
	if (!building && event.locals.session?.user?.id) {
		// Run in the background so it never blocks the response.
		const userId = event.locals.session.user.id;
		queueMicrotask(() => {
			ensureMaterialization(userId).catch((err) => {
				console.error('[recurring] materialization failed for user', userId, err);
			});
		});
	}
	return resolve(event);
};

export const handle = sequence(authHandle, recurrencyTrigger);
