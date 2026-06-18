<script lang="ts">
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Sign in · myfinance</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-brutal-yellow p-6">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<a href="/" class="inline-flex items-center gap-2">
				<span class="text-3xl">💰</span>
				<span class="font-display text-3xl font-bold uppercase">myfinance</span>
			</a>
		</div>
		<BrutalCard tone="paper" padding="lg">
			<h1 class="font-display text-3xl font-bold uppercase leading-none">Sign in</h1>
			<p class="mt-2">Pick a provider. We'll create your account on first login.</p>

			<div class="mt-6 flex flex-col gap-3">
				{#if data.githubEnabled}
					<form method="POST" action="/auth/signin/github">
						<button
							type="submit"
							class="brutal-press w-full border-3 border-brutal bg-brutal-ink px-4 py-3 font-display text-lg font-bold uppercase text-brutal-paper"
						>
							<span aria-hidden="true">🐙</span> Continue with GitHub
						</button>
					</form>
				{/if}

				{#if data.googleEnabled}
					<form method="POST" action="/auth/signin/google">
						<button
							type="submit"
							class="brutal-press w-full border-3 border-brutal bg-brutal-paper px-4 py-3 font-display text-lg font-bold uppercase"
						>
							<span aria-hidden="true">🔵</span> Continue with Google
						</button>
					</form>
				{/if}

				{#if !data.githubEnabled && !data.googleEnabled}
					<p class="border-3 border-brutal bg-brutal-coral p-3 text-sm font-bold text-brutal-paper">
						No OAuth providers are configured. Set <code>AUTH_GITHUB_ID</code> /
						<code>AUTH_GITHUB_SECRET</code> in your env to enable sign-in.
					</p>
				{/if}
			</div>
		</BrutalCard>
		<p class="mt-4 text-center font-mono text-xs">
			By signing in you accept that your financial data is stored in a SQLite database
			hosted on Turso.
		</p>
	</div>
</div>
