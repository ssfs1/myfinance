import { and, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import {
	users,
	userAccounts,
	pushSubscriptions,
	categories,
	recurringRules,
	budgets,
	transactions,
} from '$lib/server/db/schema';
import { audit } from '$lib/server/audit';
import { rateLimit } from '$lib/server/ratelimit';
import { env } from '$env/dynamic/public';
import type { Actions, PageServerLoad } from './$types';

const CURRENCIES = [
	'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
	'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
];

const TIMEZONES = [
	'UTC', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
	'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
	'Europe/Istanbul', 'Europe/Moscow', 'Africa/Lagos', 'Africa/Cairo', 'Asia/Dubai',
	'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
	'Asia/Tokyo', 'Asia/Seoul', 'Australia/Perth', 'Australia/Sydney', 'Pacific/Auckland',
];

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const [user, accounts, pushCount] = await Promise.all([
		db.select().from(users).where(eq(users.id, userId)).limit(1),
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
		db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
	]);

	return {
		user: user[0],
		accounts,
		pushEnabled: pushCount.length > 0,
		vapidPublicKey: env.PUBLIC_VAPID_KEY ?? '',
		currencies: CURRENCIES,
		timezones: TIMEZONES,
	};
};

const profileSchema = z.object({
	baseCurrency: z.string().length(3),
	timezone: z.string().min(1),
});

const accountSchema = z.object({
	name: z.string().min(1).max(40),
	currency: z.string().length(3),
	openingBalance: z.coerce.number().default(0),
});

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = profileSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		const userId = locals.session.user.id;
		await db
			.update(users)
			.set({ baseCurrency: parsed.data.baseCurrency.toUpperCase(), timezone: parsed.data.timezone })
			.where(eq(users.id, userId));
		await audit({
			userId,
			action: 'user.update',
			entityType: 'user',
			entityId: userId,
			after: parsed.data,
		});
		return { success: true };
	},

	createAccount: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = accountSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		const userId = locals.session.user.id;
		const inserted = await db
			.insert(userAccounts)
			.values({
				userId,
				name: parsed.data.name,
				currency: parsed.data.currency.toUpperCase(),
				openingBalanceCents: Math.round(parsed.data.openingBalance * 100),
			})
			.returning({ id: userAccounts.id });
		await audit({
			userId,
			action: 'account.create',
			entityType: 'account',
			entityId: inserted[0]?.id ?? '',
			after: parsed.data,
		});
		return { success: true };
	},

	archiveAccount: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db
			.update(userAccounts)
			.set({ archived: true })
			.where(and(eq(userAccounts.id, id), eq(userAccounts.userId, userId)));
		await audit({
			userId,
			action: 'account.archive',
			entityType: 'account',
			entityId: id,
		});
		return { success: true };
	},

	deleteAccount: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		if (!rateLimit(locals.session.user.id, 'account:delete'))
			return fail(429, { error: 'Too many attempts' });

		const form = await request.formData();
		const confirmation = form.get('confirm');
		if (confirmation !== 'delete my account') {
			return fail(400, { error: 'Type "delete my account" to confirm.' });
		}
		const userId = locals.session.user.id;

		// Defensive deletion in correct order so FK oddities are avoided.
		await db.delete(transactions).where(eq(transactions.userId, userId));
		await db.delete(recurringRules).where(eq(recurringRules.userId, userId));
		await db.delete(budgets).where(eq(budgets.userId, userId));
		await db.delete(categories).where(eq(categories.userId, userId));
		await db.delete(userAccounts).where(eq(userAccounts.userId, userId));
		await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
		return { success: true, accountDeleted: true };
	},
};
