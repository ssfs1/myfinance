<script lang="ts">
	import { page } from '$app/state';
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import { formatMoney, formatHumanDate } from '$lib/utils/format';

	let { data } = $props();

	const categoryById = $derived(Object.fromEntries(data.categories.map((c) => [c.id, c])));
	const accountById = $derived(Object.fromEntries(data.accounts.map((a) => [a.id, a])));

	function spentOnBudget(budget: { categoryId: string | null; amountCents: number; period: string }) {
		// Simple YAGNI: show raw budget value; report pages compute actual spend.
		return budget.amountCents;
	}
</script>

<svelte:head>
	<title>Dashboard · myfinance</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="font-mono text-xs uppercase tracking-widest">{data.summary.monthLabel}</p>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">Dashboard</h1>
	</div>
	<BrutalButton href="/app/transactions/new" tone="yellow" size="lg">+ New transaction</BrutalButton>
</header>

<section class="grid gap-4 md:grid-cols-3">
	<BrutalCard tone="lime">
		<p class="font-mono text-xs uppercase tracking-wide">Income</p>
		<p class="font-display text-4xl font-bold">+{formatMoney(data.summary.incomeCents, 'USD')}</p>
	</BrutalCard>
	<BrutalCard tone="coral">
		<p class="font-mono text-xs uppercase tracking-wide">Expenses</p>
		<p class="font-display text-4xl font-bold">−{formatMoney(data.summary.expenseCents, 'USD')}</p>
	</BrutalCard>
	<BrutalCard tone={data.summary.netCents >= 0 ? 'sky' : 'pink'}>
		<p class="font-mono text-xs uppercase tracking-wide">Net</p>
		<p class="font-display text-4xl font-bold">
			{data.summary.netCents >= 0 ? '+' : '−'}{formatMoney(Math.abs(data.summary.netCents), 'USD')}
		</p>
	</BrutalCard>
</section>

<section class="mt-6 grid gap-6 lg:grid-cols-3">
	<div class="lg:col-span-2">
		<h2 class="mb-3 font-display text-xl font-bold uppercase">Recent transactions</h2>
		{#if data.recent.length === 0}
			<EmptyState
				title="No transactions yet"
				body="Log your first one and the dashboard lights up."
			>
				{#snippet action()}
					<BrutalButton href="/app/transactions/new" tone="yellow">Add a transaction</BrutalButton>
				{/snippet}
			</EmptyState>
		{:else}
			<BrutalCard tone="paper" padding="none">
				<ul class="divide-y-3 divide-brutal">
					{#each data.recent as t (t.id)}
						<li class="flex items-center gap-3 px-4 py-3">
							<span
								class="size-8 shrink-0 border-3 border-brutal"
								style="background-color: {categoryById[t.categoryId ?? '']?.color ?? '#FFF8E1'}"
								aria-hidden="true"
							></span>
							<div class="min-w-0 flex-1">
								<p class="truncate font-display text-sm font-bold uppercase">
									{categoryById[t.categoryId ?? '']?.name ?? 'Uncategorized'}
								</p>
								<p class="font-mono text-xs">
									{formatHumanDate(t.occurredOn)}
									{#if accountById[t.accountId]?.name}· {accountById[t.accountId].name}{/if}
								</p>
							</div>
							<p
								class="font-display text-base font-bold {t.type === 'income'
									? 'text-brutal-lime'
									: 'text-brutal-coral'}"
							>
								{t.type === 'income' ? '+' : '−'}{formatMoney(t.amountCents, t.currency)}
							</p>
						</li>
					{/each}
				</ul>
			</BrutalCard>
		{/if}
	</div>

	<aside>
		<h2 class="mb-3 font-display text-xl font-bold uppercase">Coming up</h2>
		{#if data.upcoming.length === 0}
			<BrutalCard tone="cream">
				<p class="text-sm">No recurring rules in the next 7 days.</p>
			</BrutalCard>
		{:else}
			<ul class="space-y-3">
				{#each data.upcoming as r (r.id)}
					<BrutalCard tone="violet" padding="sm">
						<div class="flex items-baseline justify-between gap-2">
							<span class="font-display text-sm font-bold uppercase">
								{categoryById[r.categoryId ?? '']?.name ?? 'Recurring'}
							</span>
							<span class="font-mono text-xs">{formatHumanDate(r.nextDueDate)}</span>
						</div>
						<p class="font-display text-lg font-bold">
							{r.type === 'income' ? '+' : '−'}{formatMoney(r.amountCents, r.currency)}
						</p>
					</BrutalCard>
				{/each}
			</ul>
		{/if}

		<h2 class="mt-6 mb-3 font-display text-xl font-bold uppercase">Budgets</h2>
		{#if data.budgets.length === 0}
			<BrutalCard tone="cream">
				<p class="text-sm">No budgets yet.</p>
				<a href="/app/budgets" class="mt-2 inline-block font-mono text-xs underline"
					>Create one →</a
				>
			</BrutalCard>
		{:else}
			<ul class="space-y-3">
				{#each data.budgets as b (b.id)}
					<BrutalCard tone="sky" padding="sm">
						<div class="flex items-baseline justify-between gap-2">
							<span class="font-display text-sm font-bold uppercase">
								{b.categoryId ? categoryById[b.categoryId]?.name ?? 'Total' : 'Total'}
							</span>
							<span class="font-mono text-xs">{b.period}</span>
						</div>
						<p class="font-display text-lg font-bold">{formatMoney(spentOnBudget(b), b.currency)}</p>
					</BrutalCard>
				{/each}
			</ul>
		{/if}
	</aside>
</section>
