import { json, error } from '@sveltejs/kit';
import { and, eq, lte } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { reminderLog } from '$lib/server/db/schema';
import { sendToUser, markSent } from '$lib/server/push';
import type { RequestHandler } from './$types';

function authorized(headers: Headers): boolean {
	const expected = env.CRON_SECRET;
	if (!expected) return false;
	const got = headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
	return got === expected;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request.headers)) {
		throw error(401, 'Unauthorized');
	}

	const due = await db
		.select()
		.from(reminderLog)
		.where(and(eq(reminderLog.status, 'queued'), lte(reminderLog.scheduledFor, new Date())))
		.limit(100);

	const results: { id: string; sent: number; failed: number; dead: number }[] = [];

	for (let i = 0; i < due.length; i += 10) {
		const batch = due.slice(i, i + 10);
		const batchResults = await Promise.allSettled(
			batch.map(async (r) => {
				let payload: { title: string; body?: string; url?: string; tag?: string } = {
					title: 'myfinance',
				};
				try {
					payload = JSON.parse(r.payloadJson);
				} catch {
					/* ignore */
				}
				const res = await sendToUser(r.userId, payload);
				await markSent(r.id, res.failed > 0 ? 'failed' : 'sent');
				return { id: r.id, ...res };
			}),
		);
		for (const r of batchResults) {
			if (r.status === 'fulfilled') results.push(r.value);
			else console.error('[cron/push]', r.reason);
		}
		if (i + 10 < due.length) {
			await new Promise((r) => setTimeout(r, 100));
		}
	}

	return json({ processed: results.length });
};

export const GET = POST;
