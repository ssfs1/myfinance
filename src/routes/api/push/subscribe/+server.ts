import { json, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

const schema = z.object({
	endpoint: z.string().url(),
	keys: z.object({
		p256dh: z.string().min(1),
		auth: z.string().min(1),
	}),
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session?.user) return fail(401);
	const userId = locals.session.user.id;
	if (!rateLimit(userId, 'push:subscribe')) {
		return fail(429, { error: 'Too many subscription attempts' });
	}

	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) return fail(400, { error: 'Invalid subscription' });

	await db
		.insert(pushSubscriptions)
		.values({
			userId,
			endpoint: parsed.data.endpoint,
			p256dh: parsed.data.keys.p256dh,
			auth: parsed.data.keys.auth,
		})
		.onConflictDoNothing({ target: pushSubscriptions.endpoint });

	return json({ success: true });
};
