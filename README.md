# myfinance

A modern, fun personal-finance web app.

> Track income, expenses, recurring bills, and budgets in one place. Get
> a friendly ping before something's due. Looks like a sticker album,
> runs like a proper database.

## Stack

| Layer        | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Framework    | **SvelteKit 2** + TypeScript (strict) + Svelte 5 (runes)   |
| Styling      | **Tailwind v3** + hand-rolled neobrutalist components      |
| DB           | **Turso** (libSQL / SQLite at the edge) via `@libsql/client` |
| ORM          | **Drizzle** + drizzle-kit for migrations                   |
| Auth         | **Auth.js** (`@auth/sveltekit`) — GitHub + optional Google |
| Notifications| **Web Push** (VAPID + service worker)                      |
| FX rates     | **Frankfurter.app** (ECB, no key, cached in DB)            |
| Charts       | Hand-rolled SVG (no chart lib dep)                         |
| Hosting      | **Vercel** (primary). Cloudflare Pages + Netlify supported |

## Features

- **Transactions** — log income & expenses across multiple accounts and currencies
- **Recurring rules** — bills and paychecks, auto-materialized on load
- **Categories** — defaults seeded on signup; full CRUD
- **Budgets** — per-category caps with threshold-friendly meters
- **Multi-currency** — every transaction stores the FX rate as-of the day
- **Reports** — 12-month income vs expense bars + this-month category breakdown
- **Web Push** — reminders for upcoming bills and budget alerts
- **In-app toasts** — non-blocking feedback everywhere
- **CSV / JSON export** — streaming, rate-limited, idempotent
- **CSV import** — preview → commit with file-hash idempotency
- **Account deletion** — full GDPR cascade (FK ON DELETE CASCADE)
- **Service worker** — caches the app shell + handles `push` events
- **Health endpoint** — `GET /api/health` pings the DB

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, VAPID_*

# 3. Generate DB schema (creates local SQLite at ./local.db)
npm run db:generate
DATABASE_URL=file:./local.db npx drizzle-kit migrate

# 4. Generate VAPID keys for Web Push
npm run vapid:gen
# put the output in .env

# 5. Run
npm run dev    # http://localhost:5173
```

## Production environment

### Required

| Var                      | Notes                                              |
| ------------------------ | -------------------------------------------------- |
| `DATABASE_URL`           | `libsql://…` from Turso dashboard                  |
| `DATABASE_AUTH_TOKEN`    | Turso token                                        |
| `AUTH_SECRET`            | `openssl rand -base64 32`                          |
| `AUTH_GITHUB_ID`         | OAuth app — callback `https://<host>/auth/callback/github` |
| `AUTH_GITHUB_SECRET`     | OAuth app                                          |
| `VAPID_PUBLIC_KEY`       | `npm run vapid:gen`                                |
| `VAPID_PRIVATE_KEY`      | `npm run vapid:gen`                                |
| `VAPID_SUBJECT`          | `mailto:you@example.com`                           |
| `CRON_SECRET`            | `openssl rand -base64 32`                          |

### Optional

| Var                       | Notes                                          |
| ------------------------- | ---------------------------------------------- |
| `AUTH_GOOGLE_ID/SECRET`   | Enable Google sign-in                          |
| `SENTRY_DSN`              | Server-side error tracking                     |
| `PUBLIC_SENTRY_DSN`       | Client-side error tracking                     |

## Migrations

This project commits Drizzle migrations to `src/lib/server/db/migrations/`.
For production, **do not** use `drizzle-kit push`. Instead:

```bash
npm run db:generate              # writes SQL files
turso db shell myfinance-prod < src/lib/server/db/migrations/0001_init.sql
```

## Deploying to Vercel

```bash
# First time
vercel link
vercel env add DATABASE_URL production
# … add the rest

# Deploy
vercel --prod
```

Vercel cron is configured via `vercel.json`:

| Path                       | Cadence           |
| -------------------------- | ----------------- |
| `/api/cron/reminders`      | hourly            |
| `/api/cron/push`           | every 15 min      |

The cron handlers check `Authorization: Bearer ${CRON_SECRET}`.

## Deploying to Cloudflare Pages

1. `npm i -D @sveltejs/adapter-cloudflare`
2. In `svelte.config.js`, swap `adapter-vercel` for `adapter-cloudflare`.
3. In `src/lib/server/db/index.ts`, swap imports to:
   ```ts
   import { createClient } from '@libsql/client/web';
   import { drizzle } from 'drizzle-orm/libsql/web';
   ```
4. Local dev requires a Turso HTTP server, not `file:./local.db`. Use
   `turso dev` or `libsql-server` to expose a local HTTP endpoint.
5. Set the same env vars in the Pages dashboard. Cron moves to
   `wrangler.toml` Cron Triggers.

## Deploying to Netlify

1. `npm i -D @sveltejs/adapter-netlify`
2. Swap the adapter (same pattern as above).
3. Move cron to `netlify.toml` `[functions."api/cron/*"]` with a schedule.

## Architecture notes

### Why a per-user lock for recurring materialization?

When two requests fire concurrently (two tabs open, a load racing an API
call, two Vercel warm instances), they'd both try to materialize the same
recurring transactions. The `(recurringRuleId, occurredOn)` unique index
on `transactions` makes the inserts idempotent — but without a
per-user lock, two `nextDueDate` updates race and produce inconsistent
state. `materialization_locks` (PK = userId) with `INSERT … ON CONFLICT
DO NOTHING` ensures only one materialization runs per user at a time.

### Why store `fxRateToBase` per transaction?

Converting at report time would re-apply today's rate to historical
transactions and silently lie to the user. By capturing the rate
as-of `occurredOn` and denormalizing `amountBaseCents`, reports stay
correct forever even if ECB changes the rate retroactively.

### Why dates as `YYYY-MM-DD` strings (not UTC timestamps)?

"Monthly on the 15th" + DST = silent bugs if you store UTC timestamps.
String comparisons work, day-clamping in `cadence.ts` is explicit, and
every TZ-sensitive query joins against `users.timezone`.

## Development

```bash
npm run dev               # dev server with HMR
npm run check             # svelte-check
npm run lint              # eslint + prettier --check
npm run format            # prettier --write
npm run test:unit         # vitest
npm run test:e2e          # playwright (boots build + preview)
npm run db:studio         # browse local DB
```

## License

MIT — see [LICENSE](./LICENSE).
