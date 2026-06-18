/**
 * Single module-level libSQL client + Drizzle instance.
 *
 * `import { createClient } from '@libsql/client/node'` so we get the Node
 * runtime (works on Vercel Functions and locally). For Cloudflare Workers /
 * edge runtimes, swap to `@libsql/client/web` — the rest of the code is
 * runtime-agnostic because we always go through this single instance.
 */
import { env } from '$env/dynamic/private';
import { createClient } from '@libsql/client/node';
import { drizzle } from 'drizzle-orm/libsql/node';
import * as schema from './schema';

const url = env.DATABASE_URL ?? 'file:./local.db';
const authToken = env.DATABASE_AUTH_TOKEN || undefined;

export const sqlite = createClient({ url, authToken });

export const db = drizzle(sqlite, { schema, casing: 'snake_case' });
export type DB = typeof db;
export { schema };
