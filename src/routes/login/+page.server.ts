import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session?.user) {
		throw redirect(302, '/app');
	}
	return {
		githubEnabled: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
		googleEnabled: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
	};
};
