import { and, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { budgets, categories } from '$lib/server/db/schema';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const [allBudgets, allCategories] = await Promise.all([
		db.select().from(budgets).where(eq(budgets.userId, userId)),
		db.select().from(categories).where(eq(categories.userId, userId)),
	]);

	const spent = await db
		.select({
			categoryId: budgets.categoryId,
			amountCents: budgets.amountCents,
			currency: budgets.currency,
		})
		.from(budgets)
		.where(eq(budgets.userId, userId));

	// For each budget, compute spent-this-period against expense transactions.
	const enriched = await Promise.all(
		allBudgets.map(async (b) => {
			const where = and(
				eq(budgets.userId, userId),
				eq(budgets.categoryId, b.categoryId ?? b.categoryId),
			);
			// Simple ratio: amountCents / amountCents, no actual spend math yet (v1).
			const ratio = 0;
			return { ...b, spentBaseCents: 0, ratio };
		}),
	);

	return {
		budgets: enriched,
		categories: allCategories.filter((c) => !c.archived && c.type === 'expense'),
	};
};

const schema = z.object({
	categoryId: z.string().optional().nullable(),
	amount: z.coerce.number().positive(),
	currency: z.string().length(3),
	period: z.enum(['weekly', 'monthly', 'yearly']),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = schema.safeParse({
			categoryId: form.get('categoryId') || null,
			amount: form.get('amount'),
			currency: (form.get('currency') as string | null)?.toUpperCase(),
			period: form.get('period'),
			startDate: form.get('startDate'),
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		const userId = locals.session.user.id;
		const amountCents = Math.round(parsed.data.amount * 100);
		const inserted = await db
			.insert(budgets)
			.values({
				userId,
				categoryId: parsed.data.categoryId ?? null,
				amountCents,
				currency: parsed.data.currency,
				period: parsed.data.period,
				startDate: parsed.data.startDate,
			})
			.returning({ id: budgets.id });
		await audit({
			userId,
			action: 'budget.create',
			entityType: 'budget',
			entityId: inserted[0]?.id ?? '',
			after: parsed.data,
		});
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);
		const userId = locals.session.user.id;
		await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
		await audit({
			userId,
			action: 'budget.delete',
			entityType: 'budget',
			entityId: id,
		});
		return { success: true };
	},
};
