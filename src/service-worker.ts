/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker for myfinance.
 *
 * - Receives Web Push messages from the server.
 * - Caches static assets to make the app shell work offline after first load.
 * - Cleans up old caches on activate.
 */
import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const sw = self as unknown as ServiceWorkerGlobalScope;

const APP_CACHE = `myfinance-app-${version}`;
const STATIC_CACHE = `myfinance-static-${version}`;
const APP_SHELL = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(APP_CACHE);
			await cache.addAll(APP_SHELL);
			await sw.skipWaiting();
		})(),
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((k) => k !== APP_CACHE && k !== STATIC_CACHE)
					.map((k) => caches.delete(k)),
			);
			await sw.clients.claim();
		})(),
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(APP_CACHE);
			const cached = await cache.match(req);
			if (cached) {
				event.waitUntil(
					fetch(req)
						.then((res) => {
							if (res.ok) cache.put(req, res.clone());
						})
						.catch(() => {}),
				);
				return cached;
			}
			try {
				const res = await fetch(req);
				if (res.ok && (url.pathname.startsWith('/_app/') || url.pathname === '/')) {
					cache.put(req, res.clone());
				}
				return res;
			} catch {
				const fallback = await cache.match('/');
				if (fallback) return fallback;
				throw new Error('offline');
			}
		})(),
	);
});

interface PushPayload {
	title: string;
	body?: string;
	url?: string;
	tag?: string;
}

sw.addEventListener('push', (event) => {
	let payload: PushPayload = { title: 'myfinance' };
	try {
		const text = event.data?.text();
		if (text) payload = JSON.parse(text) as PushPayload;
	} catch {
		// ignore
	}
	const title = payload.title ?? 'myfinance';
	event.waitUntil(
		sw.registration.showNotification(title, {
			body: payload.body,
			icon: '/icons/empty.svg',
			badge: '/favicon.svg',
			tag: payload.tag,
			data: { url: payload.url ?? '/app' },
		}),
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data?.url as string | undefined) ?? '/app';
	event.waitUntil(
		(async () => {
			const all = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of all) {
				if ('focus' in client) {
					try {
						await client.focus();
						if ('navigate' in client) {
							await (client as WindowClient).navigate(targetUrl);
						}
						return;
					} catch {
						// continue
					}
				}
			}
			await sw.clients.openWindow(targetUrl);
		})(),
	);
});
