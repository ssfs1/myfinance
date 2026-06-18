<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(async () => {
		if (typeof window === 'undefined') return;
		if (!('serviceWorker' in navigator)) return;
		try {
			await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
		} catch (err) {
			console.error('[sw] registration failed', err);
		}
	});
</script>

<div class="flex min-h-screen flex-col bg-brutal-cream">
	<Nav />
	<main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
		{@render children()}
	</main>
	<footer class="border-t-3 border-brutal bg-brutal-cream py-3 text-center font-mono text-xs">
		myfinance · numbers, but happier
	</footer>
</div>
