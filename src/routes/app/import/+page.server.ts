import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	transactions,
	categories,
	userAccounts,
	users,
	idempotencyKeys,
} from '$lib/server/db/schema';
import { getRate } from '$lib/server/fx';
import { rateLimit } from '$lib/server/ratelimit';
import { audit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.session!.user.id;
	const [accounts, categories_] = await Promise.all([
		db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
		db.select().from(categories).where(eq(categories.userId, userId)),
	]);
	return {
		accounts: accounts.filter((a) => !a.archived),
		categories: categories_.filter((c) => !c.archived),
	};
};

const rowSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	type: z.enum(['income', 'expense']),
	amount: z.coerce.number().positive(),
	currency: z.string().length(3),
	account: z.string().min(1),
	category: z.string().optional().nullable(),
	note: z.string().max(280).optional().nullable(),
});

export const actions: Actions = {
	preview: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const userId = locals.session.user.id;
		if (!rateLimit(userId, 'import'))
			return fail(429, { error: 'Too many imports. Try again later.' });

		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return fail(400, { error: 'No file uploaded.' });
		const text = await file.text();

		let records: unknown[];
		try {
			records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
		} catch (err) {
			return fail(400, {
				error: `Could not parse CSV: ${err instanceof Error ? err.message : 'unknown error'}`,
			});
		}

		const parsed: {
			valid: number;
			errors: { row: number; reason: string }[];
			rows: z.infer<typeof rowSchema>[];
		} = { valid: 0, errors: [], rows: [] };
		records.forEach((r, i) => {
			const obj: Record<string, string> = {};
			if (r && typeof r === 'object') {
				for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
					obj[k] = typeof v === 'string' ? v : v == null ? '' : String(v);
				}
			}
			const result = rowSchema.safeParse({
				date: obj.date ?? obj.occurred_on ?? obj.occurredOn,
				type: (obj.type ?? '').toLowerCase(),
				amount: obj.amount ?? obj.amount_base,
				currency: (obj.currency ?? 'USD').toUpperCase(),
				account: obj.account ?? obj.account_name,
				category: obj.category ?? obj.category_name ?? null,
				note: obj.note ?? obj.description ?? null,
			});
			if (result.success) {
				parsed.rows.push(result.data);
				parsed.valid += 1;
			} else {
				parsed.errors.push({ row: i + 2, reason: result.error.issues[0]?.message ?? 'invalid' });
			}
		});

		const hash = createHash('sha256').update(text).digest('hex');
		await db
			.insert(idempotencyKeys)
			.values({ key: hash, userId, route: 'import:preview' })
			.onConflictDoNothing();

		return {
			preview: {
				fileHash: hash,
				valid: parsed.valid,
				errors: parsed.errors,
				rows: parsed.rows.slice(0, 200),
				filename: file.name,
			},
		};
	},

	commit: async ({ request, locals }) => {
		if (!locals.session?.user) return fail(401);
		const userId = locals.session.user.id;
		if (!rateLimit(userId, 'import')) return fail(429, { error: 'Too many imports.' });

		const form = await request.formData();
		const hash = form.get('fileHash');
		const csv = form.get('csv');
		if (typeof hash !== 'string' || typeof csv !== 'string') return fail(400);

		const seen = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, hash)).limit(1);
		if (seen[0] && seen[0].route === 'import:commit') {
			return { success: true, imported: 0, duplicate: true };
		}

		const user = await db
			.select({ baseCurrency: users.baseCurrency })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		const baseCurrency = user[0]?.baseCurrency ?? 'USD';

		const [allAccounts, allCategories] = await Promise.all([
			db.select().from(userAccounts).where(eq(userAccounts.userId, userId)),
			db.select().from(categories).where(eq(categories.userId, userId)),
		]);
		const acctByName = new Map(allAccounts.map((a) => [a.name.toLowerCase(), a]));
		const catByName = new Map(allCategories.map((c) => [c.name.toLowerCase(), c]));

		let records: unknown[];
		try {
			records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
		} catch {
			return fail(400, { error: 'Could not parse CSV.' });
		}

		let imported = 0;
		for (const r of records) {
			const obj = r as Record<string, string>;
			const parsed = rowSchema.safeParse({
				date: obj.date,
				type: obj.type?.toLowerCase(),
				amount: obj.amount,
				currency: obj.currency?.toUpperCase(),
				account: obj.account,
				category: obj.category || null,
				note: obj.note || null,
			});
			if (!parsed.success) continue;

			const acct = acctByName.get(parsed.data.account.toLowerCase());
			if (!acct) continue;
			const cat = parsed.data.category ? catByName.get(parsed.data.category.toLowerCase()) : null;

			let rate = 1;
			try {
				rate =
					parsed.data.currency === baseCurrency
						? 1
						: await getRate(parsed.data.currency, baseCurrency, parsed.data.date);
			} catch {
				continue;
			}
			const amountCents = Math.round(parsed.data.amount * 100);
			const amountBaseCents = Math.round(amountCents * rate);

			try {
				await db.insert(transactions).values({
					userId,
					accountId: acct.id,
					categoryId: cat?.id ?? null,
					amountCents,
					currency: parsed.data.currency,
					fxRateToBase: rate,
					amountBaseCents,
					type: parsed.data.type,
					occurredOn: parsed.data.date,
					note: parsed.data.note ?? null,
				});
				imported += 1;
			} catch (err) {
				console.error('[import] insert failed', err);
			}
		}

		await db
			.insert(idempotencyKeys)
			.values({ key: hash, userId, route: 'import:commit' })
			.onConflictDoNothing();

		await audit({
			userId,
			action: 'import.commit',
			entityType: 'import',
			entityId: hash.slice(0, 16),
			after: { imported },
		});

		throw redirect(303, '/app/transactions');
	},
};
