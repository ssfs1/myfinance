import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import {
	transactions,
	categories,
	userAccounts,
	users,
} from '$lib/server/db/schema';
import { getRate } from '$lib/server/fx';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const SUPPORTED_CURRENCIES = new Set([
	'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
	'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
	'PLN', 'DKK', 'CZK', 'HUF', 'RON', 'ILS',
]);

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const [allCategories, allAccounts, user] = await Promise.all([
		db.select().from(categories).where(eq(categories.userId, userId)),
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
		db.select({ baseCurrency: users.baseCurrency, timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1),
	]);

	if (allAccounts.length === 0) {
		throw error(400, 'No accounts yet. Create one in Settings first.');
	}

	return {
		categories: allCategories.filter((c) => !c.archived),
		accounts: allAccounts.filter((a) => !a.archived),
		baseCurrency: user[0]?.baseCurrency ?? 'USD',
		timezone: user[0]?.timezone ?? 'UTC',
		currencies: [...SUPPORTED_CURRENCIES].sort(),
	};
};

const schema = z.object({
	accountId: z.string().min(1),
	categoryId: z.string().optional().nullable(),
	type: z.enum(['income', 'expense']),
	amount: z.coerce.number().positive(),
	currency: z.string().min(3).max(3),
	occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	note: z.string().max(280).optional().nullable(),
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const userId = locals.session.user.id;

		const form = await request.formData();
		const parsed = schema.safeParse({
			accountId: form.get('accountId'),
			categoryId: form.get('categoryId') || null,
			type: form.get('type'),
			amount: form.get('amount'),
			currency: (form.get('currency') as string | null)?.toUpperCase(),
			occurredOn: form.get('occurredOn'),
			note: form.get('note') || null,
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		const data = parsed.data;
		if (!SUPPORTED_CURRENCIES.has(data.currency)) {
			return fail(400, { error: `Unsupported currency: ${data.currency}` });
		}

		const user = await db
			.select({ baseCurrency: users.baseCurrency })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		const baseCurrency = user[0]?.baseCurrency ?? 'USD';

		let rate = 1;
		try {
			rate = data.currency === baseCurrency ? 1 : await getRate(data.currency, baseCurrency, data.occurredOn);
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not look up exchange rate',
			});
		}

		const amountCents = Math.round(data.amount * 100);
		const amountBaseCents = Math.round(amountCents * rate);

		const inserted = await db
			.insert(transactions)
			.values({
				userId,
				accountId: data.accountId,
				categoryId: data.categoryId ?? null,
				amountCents,
				currency: data.currency,
				fxRateToBase: rate,
				amountBaseCents,
				type: data.type,
				occurredOn: data.occurredOn,
				note: data.note ?? null,
			})
			.returning({ id: transactions.id });

		await audit({
			userId,
			action: 'transaction.create',
			entityType: 'transaction',
			entityId: inserted[0]?.id ?? '',
			after: data,
		});

		throw redirect(303, '/app/transactions');
	},
};
