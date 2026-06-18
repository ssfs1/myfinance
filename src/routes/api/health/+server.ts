import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	let dbOk = false;
	let dbError: string | undefined;
	const started = Date.now();
	try {
		await db.run(sql`SELECT 1`);
		dbOk = true;
	} catch (err) {
		dbError = err instanceof Error ? err.message : 'unknown';
	}

	return json({
		ok: dbOk,
		db: dbOk ? 'up' : 'down',
		dbError,
		latencyMs: Date.now() - started,
		version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
		now: new Date().toISOString(),
	});
};
