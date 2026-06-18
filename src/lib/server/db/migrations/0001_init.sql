-- Initial schema for myfinance. Generated to match src/lib/server/db/schema.ts.
-- Apply via: turso db shell myfinance < 0001_init.sql

-- Auth.js adapter tables ---------------------------------------------------

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text,
	`baseCurrency` text DEFAULT 'USD' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint

CREATE TABLE `accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY (`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `sessions` (
	`sessionToken` text PRIMARY KEY,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY (`identifier`, `token`)
);
--> statement-breakpoint

-- App-domain tables ---------------------------------------------------------

CREATE TABLE `user_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`openingBalanceCents` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`lastReconciledAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_accounts_user_idx` ON `user_accounts` (`userId`);
--> statement-breakpoint

CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`color` text DEFAULT '#FFEB3A' NOT NULL,
	`icon` text DEFAULT 'tag' NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `categories_user_idx` ON `categories` (`userId`);
--> statement-breakpoint

CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryId` text,
	`amountCents` integer NOT NULL,
	`currency` text NOT NULL,
	`fxRateToBase` real DEFAULT 1 NOT NULL,
	`amountBaseCents` integer NOT NULL,
	`type` text NOT NULL,
	`occurredOn` text NOT NULL,
	`note` text,
	`recurringRuleId` text,
	`isDeleted` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recurringRuleId`) REFERENCES `recurring_rules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`userId`);
--> statement-breakpoint
CREATE INDEX `transactions_occurred_idx` ON `transactions` (`userId`, `occurredOn`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_unique` ON `transactions` (`recurringRuleId`, `occurredOn`) WHERE `recurringRuleId` IS NOT NULL AND `isDeleted` = 0;
--> statement-breakpoint

CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryId` text,
	`type` text NOT NULL,
	`amountCents` integer NOT NULL,
	`currency` text NOT NULL,
	`cadence` text NOT NULL,
	`intervalN` integer DEFAULT 1 NOT NULL,
	`startDate` text NOT NULL,
	`endDate` text,
	`nextDueDate` text NOT NULL,
	`lastRunAt` integer,
	`isPaused` integer DEFAULT false NOT NULL,
	`note` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `user_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `recurring_user_idx` ON `recurring_rules` (`userId`);
--> statement-breakpoint
CREATE INDEX `recurring_due_idx` ON `recurring_rules` (`nextDueDate`);
--> statement-breakpoint

CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`categoryId` text,
	`amountCents` integer NOT NULL,
	`currency` text NOT NULL,
	`period` text NOT NULL,
	`startDate` text NOT NULL,
	`endDate` text,
	`notifiedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `budgets_user_idx` ON `budgets` (`userId`);
--> statement-breakpoint

CREATE TABLE `fx_rates` (
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	PRIMARY KEY (`base`, `quote`, `date`)
);
--> statement-breakpoint
CREATE INDEX `fx_rates_pair_idx` ON `fx_rates` (`base`, `quote`);
--> statement-breakpoint

CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`userId`);
--> statement-breakpoint

CREATE TABLE `materialization_locks` (
	`userId` text PRIMARY KEY,
	`acquiredAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE `reminder_log` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`kind` text NOT NULL,
	`payloadJson` text NOT NULL,
	`scheduledFor` integer NOT NULL,
	`sentAt` integer,
	`status` text DEFAULT 'queued' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminder_log_queue_idx` ON `reminder_log` (`status`, `scheduledFor`);
--> statement-breakpoint

CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`beforeJson` text,
	`afterJson` text,
	`at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_log_user_idx` ON `audit_log` (`userId`, `at`);
--> statement-breakpoint

CREATE TABLE `idempotency_keys` (
	`key` text PRIMARY KEY,
	`userId` text NOT NULL,
	`route` text NOT NULL,
	`responseHash` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idempotency_keys_user_idx` ON `idempotency_keys` (`userId`, `createdAt`);
