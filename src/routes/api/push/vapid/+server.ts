import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const publicKey = env.PUBLIC_VAPID_KEY;
	if (!publicKey) {
		throw error(503, 'Push is not configured on the server.');
	}
	return json({ publicKey });
};
