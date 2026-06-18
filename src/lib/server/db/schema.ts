/**
 * Database schema (Drizzle / libSQL).
 *
 * Tables prefixed `auth_*` are managed by the @auth/drizzle-adapter. We extend
 * the `users` table with `baseCurrency`, `timezone`, and `createdAt`. All
 * other tables are app-domain tables.
 *
 * Conventions:
 *  - All monetary amounts are stored as integer cents (`amountCents`).
 *  - All dates that represent "what day" (not "when") are stored as
 *    `YYYY-MM-DD` strings (locale-agnostic, no timezone drift).
 *  - `isDeleted` / `archived` are 0/1 integer flags (libSQL has no bool).
 *  - Foreign keys cascade on user delete for GDPR account deletion.
 */
import { sql } from 'drizzle-orm';
import { relations, sql as drizzleSql } from 'drizzle-orm';
import {
	sqliteTable,
	text,
	integer,
	real,
	primaryKey,
	uniqueIndex,
	index,
} from 'drizzle-orm/sqlite-core';

// ──────────────────────────────────────────────────────────────────────────────
// Auth.js adapter tables
// ──────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
	image: text('image'),
	// App-domain extensions:
	baseCurrency: text('baseCurrency').notNull().default('USD'),
	timezone: text('timezone').notNull().default('UTC'),
	createdAt: integer('createdAt', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export const accounts = sqliteTable(
	'accounts',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(), // 'oauth' | 'oidc' | 'email'
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state'),
	},
	(account) => ({
		pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
	}),
);

export const sessions = sqliteTable('sessions', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
	'verificationToken',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
	},
	(vt) => ({
		pk: primaryKey({ columns: [vt.identifier, vt.token] }),
	}),
);

// ──────────────────────────────────────────────────────────────────────────────
// App-domain tables
// ──────────────────────────────────────────────────────────────────────────────

export const userAccounts = sqliteTable(
	'user_accounts',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		currency: text('currency').notNull().default('USD'),
		openingBalanceCents: integer('openingBalanceCents').notNull().default(0),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		lastReconciledAt: integer('lastReconciledAt', { mode: 'timestamp_ms' }),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('user_accounts_user_idx').on(t.userId),
	}),
);

export const categories = sqliteTable(
	'categories',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		type: text('type', { enum: ['income', 'expense'] }).notNull(),
		color: text('color').notNull().default('#FFEB3A'),
		icon: text('icon').notNull().default('tag'),
		isDefault: integer('isDefault', { mode: 'boolean' }).notNull().default(false),
		sortOrder: integer('sortOrder').notNull().default(0),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('categories_user_idx').on(t.userId),
	}),
);

export const transactions = sqliteTable(
	'transactions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accountId: text('accountId')
			.notNull()
			.references(() => userAccounts.id, { onDelete: 'cascade' }),
		categoryId: text('categoryId').references(() => categories.id, {
			onDelete: 'set null',
		}),
		amountCents: integer('amountCents').notNull(),
		currency: text('currency').notNull(),
		fxRateToBase: real('fxRateToBase').notNull().default(1),
		amountBaseCents: integer('amountBaseCents').notNull(),
		type: text('type', { enum: ['income', 'expense'] }).notNull(),
		occurredOn: text('occurredOn').notNull(), // YYYY-MM-DD
		note: text('note'),
		recurringRuleId: text('recurringRuleId').references(
			() => recurringRules.id,
			{ onDelete: 'set null' },
		),
		isDeleted: integer('isDeleted', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('transactions_user_idx').on(t.userId),
		occurredOnIdx: index('transactions_occurred_idx').on(t.userId, t.occurredOn),
		// Idempotency for materialized recurring transactions.
		recurringUniqueIdx: uniqueIndex('transactions_recurring_unique')
			.on(t.recurringRuleId, t.occurredOn)
			.where(drizzleSql`${t.recurringRuleId} IS NOT NULL AND ${t.isDeleted} = 0`),
	}),
);

export const recurringRules = sqliteTable(
	'recurring_rules',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accountId: text('accountId')
			.notNull()
			.references(() => userAccounts.id, { onDelete: 'cascade' }),
		categoryId: text('categoryId').references(() => categories.id, {
			onDelete: 'set null',
		}),
		type: text('type', { enum: ['income', 'expense'] }).notNull(),
		amountCents: integer('amountCents').notNull(),
		currency: text('currency').notNull(),
		cadence: text('cadence', {
			enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
		}).notNull(),
		intervalN: integer('intervalN').notNull().default(1),
		startDate: text('startDate').notNull(), // YYYY-MM-DD
		endDate: text('endDate'), // YYYY-MM-DD or null
		nextDueDate: text('nextDueDate').notNull(), // YYYY-MM-DD
		lastRunAt: integer('lastRunAt', { mode: 'timestamp_ms' }),
		isPaused: integer('isPaused', { mode: 'boolean' }).notNull().default(false),
		note: text('note'),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('recurring_user_idx').on(t.userId),
		dueIdx: index('recurring_due_idx').on(t.nextDueDate),
	}),
);

export const budgets = sqliteTable(
	'budgets',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		categoryId: text('categoryId').references(() => categories.id, {
			onDelete: 'set null',
		}),
		amountCents: integer('amountCents').notNull(),
		currency: text('currency').notNull(),
		period: text('period', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
		startDate: text('startDate').notNull(), // YYYY-MM-DD
		endDate: text('endDate'), // YYYY-MM-DD or null
		notifiedAt: integer('notifiedAt', { mode: 'timestamp_ms' }),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('budgets_user_idx').on(t.userId),
	}),
);

export const fxRates = sqliteTable(
	'fx_rates',
	{
		base: text('base').notNull(),
		quote: text('quote').notNull(),
		date: text('date').notNull(), // YYYY-MM-DD
		rate: real('rate').notNull(), // 1 base = rate quote
	},
	(t) => ({
		pk: primaryKey({ columns: [t.base, t.quote, t.date] }),
		pairIdx: index('fx_rates_pair_idx').on(t.base, t.quote),
	}),
);

export const pushSubscriptions = sqliteTable(
	'push_subscriptions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull().unique(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('push_subscriptions_user_idx').on(t.userId),
	}),
);

export const materializationLocks = sqliteTable('materialization_locks', {
	userId: text('userId')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	acquiredAt: integer('acquiredAt', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
});

export const reminderLog = sqliteTable(
	'reminder_log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind', {
			enum: ['recurring_due', 'budget_alert', 'weekly_summary'],
		}).notNull(),
		payloadJson: text('payloadJson').notNull(),
		scheduledFor: integer('scheduledFor', { mode: 'timestamp_ms' }).notNull(),
		sentAt: integer('sentAt', { mode: 'timestamp_ms' }),
		status: text('status', { enum: ['queued', 'sent', 'failed', 'dead'] })
			.notNull()
			.default('queued'),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		queueIdx: index('reminder_log_queue_idx').on(t.status, t.scheduledFor),
	}),
);

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		entityType: text('entityType').notNull(),
		entityId: text('entityId').notNull(),
		beforeJson: text('beforeJson'),
		afterJson: text('afterJson'),
		at: integer('at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('audit_log_user_idx').on(t.userId, t.at),
	}),
);

export const idempotencyKeys = sqliteTable(
	'idempotency_keys',
	{
		key: text('key').primaryKey(),
		userId: text('userId').notNull(),
		route: text('route').notNull(),
		responseHash: text('responseHash'),
		createdAt: integer('createdAt', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => ({
		userIdx: index('idempotency_keys_user_idx').on(t.userId, t.createdAt),
	}),
);

// ──────────────────────────────────────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	userAccounts: many(userAccounts),
	categories: many(categories),
	transactions: many(transactions),
	recurringRules: many(recurringRules),
	budgets: many(budgets),
	pushSubscriptions: many(pushSubscriptions),
	reminderLog: many(reminderLog),
	auditLog: many(auditLog),
}));

export const userAccountsRelations = relations(userAccounts, ({ one, many }) => ({
	user: one(users, { fields: [userAccounts.userId], references: [users.id] }),
	transactions: many(transactions),
	recurringRules: many(recurringRules),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	user: one(users, { fields: [categories.userId], references: [users.id] }),
	transactions: many(transactions),
	recurringRules: many(recurringRules),
	budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
	user: one(users, { fields: [transactions.userId], references: [users.id] }),
	account: one(userAccounts, {
		fields: [transactions.accountId],
		references: [userAccounts.id],
	}),
	category: one(categories, {
		fields: [transactions.categoryId],
		references: [categories.id],
	}),
	recurringRule: one(recurringRules, {
		fields: [transactions.recurringRuleId],
		references: [recurringRules.id],
	}),
}));

export const recurringRulesRelations = relations(recurringRules, ({ one }) => ({
	user: one(users, { fields: [recurringRules.userId], references: [users.id] }),
	account: one(userAccounts, {
		fields: [recurringRules.accountId],
		references: [userAccounts.id],
	}),
	category: one(categories, {
		fields: [recurringRules.categoryId],
		references: [categories.id],
	}),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
	user: one(users, { fields: [budgets.userId], references: [users.id] }),
	category: one(categories, {
		fields: [budgets.categoryId],
		references: [categories.id],
	}),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserAccount = typeof userAccounts.$inferSelect;
export type NewUserAccount = typeof userAccounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type FxRate = typeof fxRates.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type ReminderLog = typeof reminderLog.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
