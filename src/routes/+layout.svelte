<script lang="ts">
	import '../app.css';
	import BrutalToast from '$lib/components/brutal/BrutalToast.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Register service worker only on pages that need push.
	onMount(async () => {
		if (typeof window === 'undefined') return;
		if (!('serviceWorker' in navigator)) return;
		// Defer registration to pages that opt-in via data attribute.
		if (document.body.dataset.pushEnabled === 'true') {
			try {
				await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
			} catch (err) {
				console.error('[sw] registration failed', err);
			}
		}
	});

	const showChrome = $derived(page.url.pathname !== '/' && !page.url.pathname.startsWith('/login'));
</script>

<div class="flex min-h-screen flex-col">
	{@render children()}
</div>

<BrutalToast />
