import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session?.user) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(302, `/login?next=${next}`);
	}
	return {
		user: locals.session.user,
	};
};
