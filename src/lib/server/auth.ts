/**
 * Auth.js configuration for SvelteKit.
 *
 * - GitHub provider is required (we need it for sign-in).
 * - Google provider is enabled when AUTH_GOOGLE_ID/SECRET are set.
 * - JWT strategy: avoids a DB roundtrip on every request.
 * - Custom `users` columns (`baseCurrency`, `timezone`, `createdAt`) live in
 *   `$lib/server/db/schema` and the Drizzle adapter ignores them on read.
 * - On first sign-in we seed default categories idempotently.
 */
import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import Google from '@auth/sveltekit/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import {
	users,
	accounts,
	sessions,
	verificationTokens,
} from '$lib/server/db/schema';
import { seedDefaults } from '$lib/server/seed';

const providers = [
	GitHub({
		clientId: env.AUTH_GITHUB_ID,
		clientSecret: env.AUTH_GITHUB_SECRET,
	}),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
	providers.push(
		Google({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
		}),
	);
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	providers,
	secret: env.AUTH_SECRET,
	trustHost: true,
	session: { strategy: 'jwt' },
	pages: {
		signIn: '/login',
		error: '/login',
	},
	callbacks: {
		jwt({ token, user }) {
			if (user?.id) token.id = user.id;
			if (user?.email) token.email = user.email;
			return token;
		},
		session({ session, token }) {
			if (token.id && session.user) {
				session.user.id = token.id as string;
			}
			return session;
		},
	},
	events: {
		async signIn({ user }) {
			if (user?.id) {
				await seedDefaults(user.id);
			}
		},
	},
});

declare module '@auth/core/types' {
	interface Session {
		user: {
			id: string;
			email?: string | null;
			name?: string | null;
			image?: string | null;
		};
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		id?: string;
		email?: string;
	}
}
