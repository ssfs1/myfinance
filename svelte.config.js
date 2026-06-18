import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x',
			split: true,
		}),
		alias: {
			$lib: 'src/lib',
		},
		serviceWorker: {
			register: true,
		},
		csrf: {
			checkOrigin: true,
		},
	},
};

export default config;
