import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/migrations',
	dialect: 'sqlite',
	driver: 'turso',
	dbCredentials: {
		url,
		authToken,
	},
	verbose: true,
	strict: true,
});
