import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { transactions, categories, userAccounts, recurringRules, budgets } from '$lib/server/db/schema';
import { rateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}
	const userId = locals.session.user.id;
	if (!rateLimit(userId, 'transactions:export')) {
		return new Response('Rate limit exceeded', { status: 429 });
	}

	const [txns, cats, accts, recs, buds] = await Promise.all([
		db.select().from(transactions).where(eq(transactions.userId, userId)),
		db.select().from(categories).where(eq(categories.userId, userId)),
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
		db.select().from(recurringRules).where(eq(recurringRules.userId, userId)),
		db.select().from(budgets).where(eq(budgets.userId, userId)),
	]);

	const today = new Date().toISOString().slice(0, 10);
	return new Response(
		JSON.stringify(
			{
				exportedAt: today,
				transactions: txns,
				categories: cats,
				accounts: accts,
				recurringRules: recs,
				budgets: buds,
			},
			null,
			2,
		),
		{
			headers: {
				'content-type': 'application/json',
				'content-disposition': `attachment; filename="myfinance-backup-${today}.json"`,
				'cache-control': 'no-store',
			},
		},
	);
};
