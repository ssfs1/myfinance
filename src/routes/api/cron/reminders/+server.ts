import { json, error } from '@sveltejs/kit';
import { and, eq, gte, lte } from 'drizzle-orm';
import { format, addDays, parseISO } from 'date-fns';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { recurringRules, transactions, users } from '$lib/server/db/schema';
import { logReminder } from '$lib/server/push';
import { todayISO } from '$lib/utils/format';
import type { RequestHandler } from './$types';

function authorized(headers: Headers): boolean {
	const expected = env.CRON_SECRET;
	if (!expected) return false;
	const got = headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
	return got === expected;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request.headers)) throw error(401);

	const today = todayISO();
	const tomorrow = format(addDays(parseISO(today + 'T00:00:00Z'), 1), 'yyyy-MM-dd');

	const dueSoon = await db
		.select({
			id: recurringRules.id,
			userId: recurringRules.userId,
			nextDueDate: recurringRules.nextDueDate,
			amountCents: recurringRules.amountCents,
			currency: recurringRules.currency,
			type: recurringRules.type,
		})
		.from(recurringRules)
		.where(
			and(
				eq(recurringRules.isPaused, false),
				gte(recurringRules.nextDueDate, today),
				lte(recurringRules.nextDueDate, tomorrow),
			),
		);

	let enqueued = 0;
	for (const r of dueSoon) {
		await logReminder({
			userId: r.userId,
			kind: 'recurring_due',
			payload: {
				title: r.type === 'income' ? 'Income arriving' : 'Upcoming bill',
				body: `${r.amountCents / 100} ${r.currency} on ${r.nextDueDate}`,
				url: '/app/recurring',
				tag: `recurring-${r.id}`,
			},
			scheduledFor: new Date(),
		});
		enqueued += 1;
	}

	const dayOfWeek = new Date().getUTCDay();
	if (dayOfWeek === 0) {
		const allUsers = await db
			.select({ id: users.id, baseCurrency: users.baseCurrency })
			.from(users);
		for (const u of allUsers) {
			const recent = await db
				.select({ id: transactions.id })
				.from(transactions)
				.where(
					and(
						eq(transactions.userId, u.id),
						gte(
							transactions.occurredOn,
							format(addDays(parseISO(today + 'T00:00:00Z'), -7), 'yyyy-MM-dd'),
						),
					),
				)
				.limit(1);
			if (!recent[0]) continue;
			await logReminder({
				userId: u.id,
				kind: 'weekly_summary',
				payload: {
					title: 'Weekly summary',
					body: `Your week in ${u.baseCurrency}. Tap to see.`,
					url: '/app/reports',
					tag: `weekly-${u.id}-${today}`,
				},
				scheduledFor: new Date(),
			});
			enqueued += 1;
		}
	}

	return json({ enqueued });
};

export const GET = POST;
