<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
</script>

<svelte:head>
	<title>myfinance — money that makes you smile</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b-3 border-brutal bg-brutal-yellow">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
			<a href="/" class="inline-flex items-center gap-2">
				<span class="text-2xl">💰</span>
				<span class="font-display text-2xl font-bold uppercase tracking-tight">myfinance</span>
			</a>
			<nav class="flex items-center gap-2">
				<BrutalButton href="/login" tone="paper" size="sm">Sign in</BrutalButton>
			</nav>
		</div>
	</header>

	<main class="flex-1">
		<section class="border-b-3 border-brutal bg-brutal-pink">
			<div class="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
				<div>
					<span
						class="inline-block -rotate-2 border-3 border-brutal bg-brutal-paper px-3 py-1 font-display text-xs font-bold uppercase tracking-widest shadow-brutal"
					>
						Personal finance, but fun
					</span>
					<h1
						class="mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl"
					>
						Track your money<br />
						<span class="bg-brutal-ink px-2 text-brutal-yellow">without the doom.</span>
					</h1>
					<p class="mt-6 max-w-lg text-lg">
						Income, expenses, recurring bills, and budgets in one place. Get a friendly ping
						when something's due. Looks like a sticker album, runs like a proper database.
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<BrutalButton href="/login" tone="yellow" size="lg">Get started</BrutalButton>
						<BrutalButton href="https://github.com/ssfs1/myfinance" tone="paper" size="lg">
							View source
						</BrutalButton>
					</div>
				</div>
				<div class="relative">
					<div
						class="absolute -left-3 -top-3 h-full w-full border-3 border-brutal bg-brutal-lime shadow-brutal-xl"
					></div>
					<BrutalCard tone="paper" padding="lg" class="relative">
						{#snippet header()}
							<div class="flex items-center justify-between">
								<h2 class="font-display text-lg font-bold uppercase tracking-wide">
									This month
								</h2>
								<span class="border-3 border-brutal bg-brutal-yellow px-2 py-0.5 font-mono text-xs"
									>JUN 2026</span
								>
							</div>
						{/snippet}
						<dl class="grid grid-cols-2 gap-4">
							<div>
								<dt class="font-mono text-xs uppercase">Income</dt>
								<dd class="font-display text-3xl font-bold text-brutal-lime">+$4,250</dd>
							</div>
							<div>
								<dt class="font-mono text-xs uppercase">Expenses</dt>
								<dd class="font-display text-3xl font-bold text-brutal-coral">−$2,189</dd>
							</div>
							<div class="col-span-2 border-t-3 border-brutal pt-3">
								<dt class="font-mono text-xs uppercase">Net</dt>
								<dd class="font-display text-4xl font-bold">+$2,061</dd>
							</div>
						</dl>
					</BrutalCard>
				</div>
			</div>
		</section>

		<section class="mx-auto max-w-6xl px-4 py-16">
			<h2 class="font-display text-4xl font-bold uppercase">What's in the box</h2>
			<div class="mt-8 grid gap-6 md:grid-cols-3">
				{#each [{ title: 'Transactions', body: 'Log income and expenses across multiple accounts, with multi-currency support.', tone: 'yellow' }, { title: 'Recurring rules', body: 'Set up bills and paychecks once. They appear on time, every time.', tone: 'sky' }, { title: 'Budgets', body: 'Caps per category. Friendly pings before you blow them.', tone: 'lime' }, { title: 'Reports', body: 'Monthly bars, category pies, all in your base currency.', tone: 'pink' }, { title: 'Web Push', body: 'Reminders even when you closed the tab. No email required.', tone: 'violet' }, { title: 'CSV import / export', body: 'Bring data from elsewhere. Take it with you if you leave.', tone: 'cream' }] as f (f.title)}
					<BrutalCard tone={f.tone as 'yellow' | 'sky' | 'lime' | 'pink' | 'violet' | 'cream'}>
						<h3 class="font-display text-xl font-bold uppercase">{f.title}</h3>
						<p class="mt-2">{f.body}</p>
					</BrutalCard>
				{/each}
			</div>
		</section>
	</main>

	<footer class="border-t-3 border-brutal bg-brutal-cream">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between"
		>
			<p class="font-mono">MIT licensed · Made with stickers.</p>
			<a
				href="https://github.com/ssfs1/myfinance"
				class="font-mono underline decoration-3 underline-offset-4"
			>
				github.com/ssfs1/myfinance
			</a>
		</div>
	</footer>
</div>
