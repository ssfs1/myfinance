import { json, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const schema = z.object({ endpoint: z.string().url() });

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session?.user) return fail(401);
	const userId = locals.session.user.id;
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success) return fail(400);
	await db
		.delete(pushSubscriptions)
		.where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));
	return json({ success: true });
};
