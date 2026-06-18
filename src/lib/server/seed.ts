/**
 * Default categories seeded on first sign-in. Idempotent: checks for
 * existing defaults before inserting.
 */
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';

interface DefaultCategory {
	name: string;
	type: 'income' | 'expense';
	color: string;
	icon: string;
	sortOrder: number;
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
	// Income
	{ name: 'Salary', type: 'income', color: '#B5E853', icon: 'briefcase', sortOrder: 10 },
	{ name: 'Freelance', type: 'income', color: '#5BC8FF', icon: 'laptop', sortOrder: 20 },
	{ name: 'Gifts', type: 'income', color: '#FF7AB6', icon: 'gift', sortOrder: 30 },
	{ name: 'Refunds', type: 'income', color: '#B69CFF', icon: 'rotate-ccw', sortOrder: 40 },
	{ name: 'Other income', type: 'income', color: '#FFF8E1', icon: 'plus-circle', sortOrder: 90 },

	// Expense
	{ name: 'Groceries', type: 'expense', color: '#FFEB3A', icon: 'shopping-cart', sortOrder: 10 },
	{ name: 'Rent', type: 'expense', color: '#FF6F61', icon: 'home', sortOrder: 20 },
	{ name: 'Utilities', type: 'expense', color: '#5BC8FF', icon: 'zap', sortOrder: 30 },
	{ name: 'Transport', type: 'expense', color: '#B69CFF', icon: 'car', sortOrder: 40 },
	{ name: 'Eating out', type: 'expense', color: '#FF7AB6', icon: 'utensils', sortOrder: 50 },
	{ name: 'Entertainment', type: 'expense', color: '#B5E853', icon: 'music', sortOrder: 60 },
	{ name: 'Health', type: 'expense', color: '#FF6F61', icon: 'heart', sortOrder: 70 },
	{ name: 'Shopping', type: 'expense', color: '#FFEB3A', icon: 'shopping-bag', sortOrder: 80 },
	{ name: 'Subscriptions', type: 'expense', color: '#5BC8FF', icon: 'repeat', sortOrder: 85 },
	{ name: 'Other expense', type: 'expense', color: '#FFF8E1', icon: 'minus-circle', sortOrder: 90 },
];

export async function seedDefaults(userId: string): Promise<void> {
	const existing = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.userId, userId), eq(categories.isDefault, true)))
		.limit(1);

	if (existing[0]) return;

	await db.insert(categories).values(
		DEFAULT_CATEGORIES.map((c) => ({
			userId,
			name: c.name,
			type: c.type,
			color: c.color,
			icon: c.icon,
			isDefault: true,
			sortOrder: c.sortOrder,
		})),
	);
}
