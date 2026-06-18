// See https://kit.svelte.dev/docs/types#app
import type { Session } from '@auth/sveltekit';

declare global {
	namespace App {
		interface Locals {
			auth(): Promise<Session | null>;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		// interface Error {}
	}
}

export {};
