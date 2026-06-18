import { and, eq, gte, lte, asc } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { db } from '$lib/server/db';
import {
	transactions,
	categories,
	userAccounts,
	users,
} from '$lib/server/db/schema';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}
	const userId = locals.session.user.id;
	if (!rateLimit(userId, 'transactions:export')) {
		return new Response('Rate limit exceeded', { status: 429 });
	}

	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	const type = url.searchParams.get('type');
	const categoryId = url.searchParams.get('category');
	const accountId = url.searchParams.get('account');

	const conds = [eq(transactions.userId, userId), eq(transactions.isDeleted, false)];
	if (from) conds.push(gte(transactions.occurredOn, from));
	if (to) conds.push(lte(transactions.occurredOn, to));
	if (type === 'income' || type === 'expense') {
		const { sql } = await import('drizzle-orm');
		conds.push(sql`${transactions.type} = ${type}`);
	}
	if (categoryId) conds.push(eq(transactions.categoryId, categoryId));
	if (accountId) conds.push(eq(transactions.accountId, accountId));

	const [rows, allCategories, allAccounts, user] = await Promise.all([
		db
			.select()
			.from(transactions)
			.where(and(...conds))
			.orderBy(asc(transactions.occurredOn)),
		db.select().from(categories).where(eq(categories.userId, userId)),
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
		db.select({ baseCurrency: users.baseCurrency }).from(users).where(eq(users.id, userId)).limit(1),
	]);

	const catMap = new Map(allCategories.map((c) => [c.id, c.name]));
	const acctMap = new Map(allAccounts.map((a) => [a.id, a.name]));
	const baseCurrency = user[0]?.baseCurrency ?? 'USD';

	const records = rows.map((r) => ({
		date: r.occurredOn,
		type: r.type,
		account: acctMap.get(r.accountId) ?? '',
		category: r.categoryId ? catMap.get(r.categoryId) ?? '' : '',
		amount: (r.amountCents / 100).toFixed(2),
		currency: r.currency,
		fx_rate: r.fxRateToBase,
		amount_base: (r.amountBaseCents / 100).toFixed(2),
		base_currency: baseCurrency,
		note: r.note ?? '',
		recurring_rule_id: r.recurringRuleId ?? '',
	}));

	const csv = stringify(records, {
		header: true,
		columns: [
			'date', 'type', 'account', 'category', 'amount', 'currency',
			'fx_rate', 'amount_base', 'base_currency', 'note', 'recurring_rule_id',
		],
	});

	const today = new Date().toISOString().slice(0, 10);
	return new Response(csv, {
		status: 200,
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="myfinance-transactions-${today}.csv"`,
			'cache-control': 'no-store',
		},
	});
};
