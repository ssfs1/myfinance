/**
 * Web Push delivery. Wraps `web-push` with sensible defaults for
 * serverless: timeouts, dead-subscription cleanup, and structured logging.
 */
import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { pushSubscriptions, reminderLog } from '$lib/server/db/schema';

interface PushConfig {
	publicKey: string;
	privateKey: string;
	subject: string;
}

let configured = false;

function configure(): void {
	if (configured) return;
	const publicKey = env.VAPID_PUBLIC_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;
	const subject = env.VAPID_SUBJECT ?? 'mailto:hello@example.com';
	if (publicKey && privateKey) {
		webpush.setVapidDetails(subject, publicKey, privateKey);
		configured = true;
	}
}

export interface PushPayload {
	title: string;
	body: string;
	url?: string;
	tag?: string;
}

const TIMEOUT_MS = 5_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error('Push timed out')), ms),
		),
	]);
}

export async function sendToUser(
	userId: string,
	payload: PushPayload,
): Promise<{ sent: number; failed: number; dead: number }> {
	configure();

	const subs = await db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId));

	if (subs.length === 0) return { sent: 0, failed: 0, dead: 0 };

	const json = JSON.stringify(payload);
	const results = await Promise.allSettled(
		subs.map((sub) =>
			withTimeout(
				webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: { p256dh: sub.p256dh, auth: sub.auth },
					},
					json,
					{ TTL: 60 * 60 * 24 },
				),
				TIMEOUT_MS,
			).then(async (res) => {
				const statusCode = (res as { statusCode?: number } | undefined)?.statusCode ?? 200;
				if (statusCode === 404 || statusCode === 410) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
					return 'dead' as const;
				}
				return 'sent' as const;
			}),
		),
	);

	let sent = 0;
	let failed = 0;
	let dead = 0;
	for (const r of results) {
		if (r.status === 'fulfilled') {
			if (r.value === 'dead') dead += 1;
			else sent += 1;
		} else {
			failed += 1;
			console.error('[push] send failed', r.reason);
		}
	}

	return { sent, failed, dead };
}

export async function logReminder(opts: {
	userId: string;
	kind: 'recurring_due' | 'budget_alert' | 'weekly_summary';
	payload: PushPayload;
	scheduledFor: Date;
}): Promise<void> {
	await db.insert(reminderLog).values({
		userId: opts.userId,
		kind: opts.kind,
		payloadJson: JSON.stringify(opts.payload),
		scheduledFor: opts.scheduledFor,
	});
}

export async function markSent(id: string, status: 'sent' | 'failed' | 'dead'): Promise<void> {
	await db.update(reminderLog).set({ sentAt: new Date(), status }).where(eq(reminderLog.id, id));
}

export function isPushConfigured(): boolean {
	const publicKey = env.VAPID_PUBLIC_KEY;
	const privateKey = env.VAPID_PRIVATE_KEY;
	return Boolean(publicKey && privateKey);
}
