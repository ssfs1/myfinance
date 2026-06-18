import { init as initSentry } from '@sentry/sveltekit';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;
if (dsn) {
	initSentry({
		dsn,
		tracesSampleRate: 0.1,
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1.0,
	});
}
