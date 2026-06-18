import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { transactions, categories, users } from '$lib/server/db/schema';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { PageServerLoad } from './$types';

interface MonthBucket {
	month: string;
	label: string;
	incomeCents: number;
	expenseCents: number;
}

interface CategorySlice {
	categoryId: string | null;
	categoryName: string;
	categoryColor: string;
	totalBaseCents: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const today = new Date();
	const monthsBack = 11;
	const firstMonth = startOfMonth(subMonths(today, monthsBack));
	const lastMonth = endOfMonth(today);

	const from = format(firstMonth, 'yyyy-MM-dd');
	const to = format(lastMonth, 'yyyy-MM-dd');

	const [txns, allCategories, user] = await Promise.all([
		db
			.select({
				occurredOn: transactions.occurredOn,
				amountBaseCents: transactions.amountBaseCents,
				type: transactions.type,
				categoryId: transactions.categoryId,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.isDeleted, false),
					gte(transactions.occurredOn, from),
					lte(transactions.occurredOn, to),
				),
			),
		db.select().from(categories).where(eq(categories.userId, userId)),
		db.select({ baseCurrency: users.baseCurrency }).from(users).where(eq(users.id, userId)).limit(1),
	]);

	const categoryById = new Map(allCategories.map((c) => [c.id, c]));

	const buckets: MonthBucket[] = [];
	for (let i = 0; i <= monthsBack; i++) {
		const d = subMonths(today, monthsBack - i);
		const month = format(d, 'yyyy-MM');
		buckets.push({ month, label: format(d, 'MMM'), incomeCents: 0, expenseCents: 0 });
	}
	const bucketByMonth = new Map(buckets.map((b) => [b.month, b]));

	const thisMonth = format(today, 'yyyy-MM');
	const sliceMap = new Map<string, CategorySlice>();

	for (const t of txns) {
		const month = t.occurredOn.slice(0, 7);
		const b = bucketByMonth.get(month);
		if (b) {
			if (t.type === 'income') b.incomeCents += t.amountBaseCents;
			else b.expenseCents += t.amountBaseCents;
		}
		if (t.type === 'expense' && month === thisMonth) {
			const key = t.categoryId ?? 'none';
			const cat = t.categoryId ? categoryById.get(t.categoryId) : undefined;
			const existing = sliceMap.get(key);
			if (existing) {
				existing.totalBaseCents += t.amountBaseCents;
			} else {
				sliceMap.set(key, {
					categoryId: t.categoryId,
					categoryName: cat?.name ?? 'Uncategorized',
					categoryColor: cat?.color ?? '#FFF8E1',
					totalBaseCents: t.amountBaseCents,
				});
			}
		}
	}

	const slices = [...sliceMap.values()].sort((a, b) => b.totalBaseCents - a.totalBaseCents);

	return {
		months: buckets,
		slices,
		baseCurrency: user[0]?.baseCurrency ?? 'USD',
	};
};
