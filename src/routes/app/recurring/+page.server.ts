import { and, asc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import {
	recurringRules,
	categories,
	userAccounts,
} from '$lib/server/db/schema';
import { advanceDate, type Cadence } from '$lib/utils/cadence';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const [rules, allCategories, allAccounts] = await Promise.all([
		db
			.select()
			.from(recurringRules)
			.where(eq(recurringRules.userId, userId))
			.orderBy(asc(recurringRules.isPaused), asc(recurringRules.nextDueDate)),
		db.select().from(categories).where(eq(categories.userId, userId)),
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
	]);
	return {
		rules,
		categories: allCategories.filter((c) => !c.archived),
		accounts: allAccounts.filter((a) => !a.archived),
	};
};

const createSchema = z.object({
	accountId: z.string().min(1),
	categoryId: z.string().optional().nullable(),
	type: z.enum(['income', 'expense']),
	amount: z.coerce.number().positive(),
	currency: z.string().length(3),
	cadence: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
	intervalN: z.coerce.number().int().min(1).max(365).default(1),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
	note: z.string().max(280).optional().nullable(),
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = createSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });

		const userId = locals.session.user.id;
		const amountCents = Math.round(parsed.data.amount * 100);
		const inserted = await db
			.insert(recurringRules)
			.values({
				userId,
				accountId: parsed.data.accountId,
				categoryId: parsed.data.categoryId ?? null,
				type: parsed.data.type,
				amountCents,
				currency: parsed.data.currency.toUpperCase(),
				cadence: parsed.data.cadence,
				intervalN: parsed.data.intervalN,
				startDate: parsed.data.startDate,
				endDate: parsed.data.endDate ?? null,
				nextDueDate: parsed.data.startDate,
				note: parsed.data.note ?? null,
			})
			.returning({ id: recurringRules.id });
		await audit({
			userId,
			action: 'recurring.create',
			entityType: 'recurringRule',
			entityId: inserted[0]?.id ?? '',
			after: parsed.data,
		});
		return { success: true };
	},

	pause: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db
			.update(recurringRules)
			.set({ isPaused: true })
			.where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
		return { success: true };
	},

	resume: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db
			.update(recurringRules)
			.set({ isPaused: false })
			.where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db
			.delete(recurringRules)
			.where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
		await audit({
			userId,
			action: 'recurring.delete',
			entityType: 'recurringRule',
			entityId: id,
		});
		return { success: true };
	},

	skip: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		const row = await db
			.select()
			.from(recurringRules)
			.where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
			.limit(1);
		if (!row[0]) return fail(404);
		const next = advanceDate(row[0].nextDueDate, {
			cadence: row[0].cadence as Cadence,
			intervalN: row[0].intervalN,
			startDate: row[0].startDate,
			endDate: row[0].endDate,
		});
		await db
			.update(recurringRules)
			.set({ nextDueDate: next })
			.where(eq(recurringRules.id, id));
		return { success: true };
	},
};
