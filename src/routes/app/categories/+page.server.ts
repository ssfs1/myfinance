import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const rows = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(asc(categories.type), asc(categories.sortOrder), asc(categories.name));
	return { categories: rows };
};

const createSchema = z.object({
	name: z.string().min(1).max(40),
	type: z.enum(['income', 'expense']),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const updateSchema = createSchema.extend({ id: z.string().min(1) });

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = createSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });

		const userId = locals.session.user.id;
		const inserted = await db
			.insert(categories)
			.values({ ...parsed.data, userId, isDefault: false })
			.returning({ id: categories.id });
		await audit({
			userId,
			action: 'category.create',
			entityType: 'category',
			entityId: inserted[0]?.id ?? '',
			after: parsed.data,
		});
		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const parsed = updateSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });

		const userId = locals.session.user.id;
		const before = await db
			.select()
			.from(categories)
			.where(and(eq(categories.id, parsed.data.id), eq(categories.userId, userId)))
			.limit(1);
		if (!before[0]) return fail(404);

		await db
			.update(categories)
			.set({
				name: parsed.data.name,
				type: parsed.data.type,
				color: parsed.data.color,
			})
			.where(and(eq(categories.id, parsed.data.id), eq(categories.userId, userId)));
		await audit({
			userId,
			action: 'category.update',
			entityType: 'category',
			entityId: parsed.data.id,
			before: before[0],
			after: parsed.data,
		});
		return { success: true };
	},

	archive: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);

		const userId = locals.session.user.id;
		await db
			.update(categories)
			.set({ archived: true })
			.where(and(eq(categories.id, id), eq(categories.userId, userId)));
		await audit({
			userId,
			action: 'category.archive',
			entityType: 'category',
			entityId: id,
		});
		return { success: true };
	},

	restore: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const form = await request.formData();
		const id = form.get('id');
		if (typeof id !== 'string') return fail(400);

		const userId = locals.session.user.id;
		await db
			.update(categories)
			.set({ archived: false })
			.where(and(eq(categories.id, id), eq(categories.userId, userId)));
		await audit({
			userId,
			action: 'category.restore',
			entityType: 'category',
			entityId: id,
		});
		return { success: true };
	},
};
