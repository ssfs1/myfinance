<script lang="ts">
	import { page } from '$app/state';
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
</script>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="w-full max-w-xl border-3 border-brutal bg-brutal-paper p-8 shadow-brutal-xl">
		<div class="mb-6 inline-block border-3 border-brutal bg-brutal-coral px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-brutal-paper">
			Error {page.status}
		</div>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">
			{page.status === 404 ? 'Lost in the wallet' : 'Something popped out'}
		</h1>
		<p class="mt-4 text-lg">
			{page.error?.message ?? 'An unexpected error happened. Try again or head home.'}
		</p>
		<div class="mt-6 flex gap-3">
			<BrutalButton href="/app" tone="yellow">Back to dashboard</BrutalButton>
			<BrutalButton href="/" tone="paper">Home</BrutalButton>
		</div>
	</div>
</div>
