import { db } from '$lib/server/db';
import { transactions, categories, budgets, recurringRules, userAccounts } from '$lib/server/db/schema';
import { and, eq, gte, lte, isNull, desc, and as andOp } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { todayISO } from '$lib/utils/format';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const today = todayISO();
	const monthStart = format(startOfMonth(parseISO(today + 'T00:00:00Z')), 'yyyy-MM-dd');
	const monthEnd = format(endOfMonth(parseISO(today + 'T00:00:00Z')), 'yyyy-MM-dd');

	const [recent, monthTxns, allCategories, allBudgets, upcoming, accounts] = await Promise.all([
		db
			.select()
			.from(transactions)
			.where(and(eq(transactions.userId, userId), eq(transactions.isDeleted, false)))
			.orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
			.limit(8),
		db
			.select({
				amountBaseCents: transactions.amountBaseCents,
				type: transactions.type,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.isDeleted, false),
					gte(transactions.occurredOn, monthStart),
					lte(transactions.occurredOn, monthEnd),
				),
			),
		db
			.select()
			.from(categories)
			.where(eq(categories.userId, userId)),
		db
			.select()
			.from(budgets)
			.where(eq(budgets.userId, userId)),
		db
			.select()
			.from(recurringRules)
			.where(
				and(
					eq(recurringRules.userId, userId),
					eq(recurringRules.isPaused, false),
					lte(recurringRules.nextDueDate, addDays(today, 7)),
				),
			)
			.orderBy(recurringRules.nextDueDate)
			.limit(5),
		db
			.select()
			.from(userAccounts)
			.where(and(eq(userAccounts.userId, userId), eq(userAccounts.archived, false))),
	]);

	let income = 0;
	let expense = 0;
	for (const t of monthTxns) {
		if (t.type === 'income') income += t.amountBaseCents;
		else expense += t.amountBaseCents;
	}

	return {
		summary: {
			incomeCents: income,
			expenseCents: expense,
			netCents: income - expense,
			monthLabel: format(parseISO(today + 'T00:00:00Z'), 'MMMM yyyy'),
		},
		recent,
		categories: allCategories,
		budgets: allBudgets,
		upcoming,
		accounts,
	};
};

function addDays(iso: string, days: number): string {
	const d = parseISO(iso + 'T00:00:00Z');
	d.setUTCDate(d.getUTCDate() + days);
	return format(d, 'yyyy-MM-dd');
}
