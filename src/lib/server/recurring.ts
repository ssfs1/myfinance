/**
 * Recurring transaction materialization.
 *
 * Safety invariants:
 *   1. Per-user application lock (materialization_locks) ensures only one
 *      materialization runs per user at a time, even with concurrent
 *      requests/tabs.
 *   2. Unique index `transactions_recurring_unique` on
 *      (recurringRuleId, occurredOn) WHERE recurringRuleId IS NOT NULL AND
 *      isDeleted = 0 makes materialized transactions idempotent. A retry
 *      will conflict and do nothing.
 *
 * Cadence math lives in `$lib/utils/cadence`. FX lives in `$lib/server/fx`.
 */
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	recurringRules,
	transactions,
	materializationLocks,
} from '$lib/server/db/schema';
import { advanceDate, expandDueDates, type Cadence } from '$lib/utils/cadence';
import { getRate } from '$lib/server/fx';
import { todayISO } from '$lib/utils/format';

interface MaterializeResult {
	rulesProcessed: number;
	transactionsCreated: number;
}

async function tryAcquireLock(userId: string): Promise<boolean> {
	// ON CONFLICT DO NOTHING returns 0 rows when the lock is already held.
	const inserted = await db
		.insert(materializationLocks)
		.values({ userId })
		.onConflictDoNothing({ target: materializationLocks.userId })
		.returning({ userId: materializationLocks.userId });
	return inserted.length > 0;
}

async function releaseLock(userId: string): Promise<void> {
	await db.delete(materializationLocks).where(eq(materializationLocks.userId, userId));
}

export async function ensureMaterialization(userId: string): Promise<MaterializeResult | null> {
	if (!(await tryAcquireLock(userId))) {
		// Another request holds the lock — skip.
		return null;
	}

	try {
		const today = todayISO();
		const now = Date.now();

		const due = await db
			.select()
			.from(recurringRules)
			.where(
				and(
					eq(recurringRules.userId, userId),
					eq(recurringRules.isPaused, false),
					lte(recurringRules.nextDueDate, today),
					or(
						isNull(recurringRules.endDate),
						sql`${recurringRules.endDate} >= ${today}`,
					),
				),
			);

		let created = 0;

		for (const rule of due) {
			const dates = expandDueDates(rule.nextDueDate, today, {
				cadence: rule.cadence as Cadence,
				intervalN: rule.intervalN,
				startDate: rule.startDate,
				endDate: rule.endDate,
			});

			if (dates.length === 0) continue;

			// Fetch FX rate once per rule (all due dates share the same currency
			// pair and base — user.baseCurrency comes from auth.js callbacks).
			let rate = 1;
			let userBaseCurrency = 'USD';
			try {
				const userRow = await db
					.select({ base: sql<string>`(SELECT baseCurrency FROM users WHERE id = ${userId})` })
					.from(sql`users`)
					.where(sql`id = ${userId}`)
					.limit(1);
				userBaseCurrency = userRow[0]?.base ?? 'USD';
				if (rule.currency !== userBaseCurrency) {
					rate = await getRate(rule.currency, userBaseCurrency, rule.startDate);
				}
			} catch (err) {
				console.error('[recurring] FX lookup failed for rule', rule.id, err);
				continue;
			}

			const amountBaseCents = Math.round(rule.amountCents * rate);

			for (const occurredOn of dates) {
				const result = await db
					.insert(transactions)
					.values({
						userId,
						accountId: rule.accountId,
						categoryId: rule.categoryId,
						amountCents: rule.amountCents,
						currency: rule.currency,
						fxRateToBase: rate,
						amountBaseCents,
						type: rule.type,
						occurredOn,
						note: rule.note,
						recurringRuleId: rule.id,
					})
					.onConflictDoNothing({
						target: [transactions.recurringRuleId, transactions.occurredOn],
					})
					.returning({ id: transactions.id });

				if (result.length > 0) created += 1;
			}

			// Advance nextDueDate to the first occurrence strictly after today.
			let next = rule.nextDueDate;
			while (next <= today) {
				next = advanceDate(next, {
					cadence: rule.cadence as Cadence,
					intervalN: rule.intervalN,
					startDate: rule.startDate,
					endDate: rule.endDate,
				});
			}

			await db
				.update(recurringRules)
				.set({ nextDueDate: next, lastRunAt: new Date(now) })
				.where(eq(recurringRules.id, rule.id));
		}

		return { rulesProcessed: due.length, transactionsCreated: created };
	} finally {
		await releaseLock(userId);
	}
}
