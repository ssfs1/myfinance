/**
 * Request pipeline:
 *   1. authHandle populates `event.locals.auth()` (provided by @auth/sveltekit).
 *   2. sessionLoader resolves the session once and stores it on
 *      `event.locals.session` so downstream code doesn't refetch.
 *   3. recurringTrigger fires background materialization for the logged-in
 *      user; never blocks the response.
 */
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { handle as authHandle } from '$lib/server/auth';
import { ensureMaterialization } from '$lib/server/recurring';

const sessionLoader: Handle = async ({ event, resolve }) => {
	event.locals.session = await event.locals.auth();
	return resolve(event);
};

const recurringTrigger: Handle = async ({ event, resolve }) => {
	if (!building && event.locals.session?.user?.id) {
		const userId = event.locals.session.user.id;
		queueMicrotask(() => {
			ensureMaterialization(userId).catch((err) => {
				console.error('[recurring] materialization failed for user', userId, err);
			});
		});
	}
	return resolve(event);
};

export const handle = sequence(authHandle, sessionLoader, recurringTrigger);
