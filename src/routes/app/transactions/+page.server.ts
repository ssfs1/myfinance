import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	transactions,
	categories,
	userAccounts,
} from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const SUPPORTED_CURRENCIES = [
	'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
	'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
	'PLN', 'DKK', 'CZK', 'HUF', 'RON', 'ILS',
];

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.session!.user.id;
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const typeFilter = url.searchParams.get('type') ?? '';
	const categoryFilter = url.searchParams.get('category') ?? '';
	const accountFilter = url.searchParams.get('account') ?? '';

	const conds = [eq(transactions.userId, userId), eq(transactions.isDeleted, false)];
	if (from) conds.push(gte(transactions.occurredOn, from));
	if (to) conds.push(lte(transactions.occurredOn, to));
	if (typeFilter === 'income' || typeFilter === 'expense') {
		const { sql } = await import('drizzle-orm');
		conds.push(sql`${transactions.type} = ${typeFilter}`);
	}
	if (categoryFilter) conds.push(eq(transactions.categoryId, categoryFilter));
	if (accountFilter) conds.push(eq(transactions.accountId, accountFilter));

	const [rows, allCategories, allAccounts] = await Promise.all([
		db
			.select()
			.from(transactions)
			.where(and(...conds))
			.orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
			.limit(500),
		db
			.select()
			.from(categories)
			.where(eq(categories.userId, userId))
			.orderBy(categories.sortOrder),
		db
			.select()
			.from(userAccounts)
			.where(eq(userAccounts.userId, userId)),
	]);

	return {
		transactions: rows,
		categories: allCategories,
		accounts: allAccounts,
		filters: { from, to, type: typeFilter, category: categoryFilter, account: accountFilter },
		currencies: SUPPORTED_CURRENCIES,
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db
			.update(transactions)
			.set({ isDeleted: true })
			.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
		await audit({
			userId,
			action: 'transaction.delete',
			entityType: 'transaction',
			entityId: id,
		});
		return { success: true };
	},
};
