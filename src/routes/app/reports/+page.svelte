<script lang="ts">
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import { formatMoney } from '$lib/utils/format';

	let { data } = $props();

	const max = $derived(
		Math.max(1, ...data.months.flatMap((m) => [m.incomeCents, m.expenseCents])),
	);

	const totalExpense = $derived(data.slices.reduce((s, c) => s + c.totalBaseCents, 0));
</script>

<svelte:head>
	<title>Reports · myfinance</title>
</svelte:head>

<header class="mb-6">
	<h1 class="font-display text-4xl font-bold uppercase leading-none">Reports</h1>
	<p class="mt-1 font-mono text-xs uppercase tracking-widest">Last 12 months · in {data.baseCurrency}</p>
</header>

<div class="grid gap-6 lg:grid-cols-2">
	<BrutalCard tone="paper" padding="lg">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">Income vs expense</h2>
		{/snippet}

		<div class="flex h-64 items-end gap-2 border-b-3 border-brutal">
			{#each data.months as m (m.month)}
				{@const incomeH = (m.incomeCents / max) * 100}
				{@const expenseH = (m.expenseCents / max) * 100}
				<div class="flex flex-1 flex-col items-center justify-end gap-0.5">
					<div class="flex h-full w-full items-end justify-center gap-0.5">
						<div
							class="w-1/2 border-3 border-brutal bg-brutal-lime"
							style="height: {incomeH}%"
							title="Income {formatMoney(m.incomeCents, data.baseCurrency)}"
						></div>
						<div
							class="w-1/2 border-3 border-brutal bg-brutal-coral"
							style="height: {expenseH}%"
							title="Expense {formatMoney(m.expenseCents, data.baseCurrency)}"
						></div>
					</div>
					<span class="font-mono text-xs">{m.label}</span>
				</div>
			{/each}
		</div>
		<div class="mt-3 flex gap-4 font-mono text-xs uppercase">
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block size-3 border-2 border-brutal bg-brutal-lime"></span>
				Income
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="inline-block size-3 border-2 border-brutal bg-brutal-coral"></span>
				Expense
			</span>
		</div>
	</BrutalCard>

	<BrutalCard tone="paper" padding="lg">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">This month · by category</h2>
		{/snippet}
		{#if totalExpense === 0}
			<p class="font-mono text-sm">No expenses yet this month.</p>
		{:else}
			<ul class="space-y-3">
				{#each data.slices as s (s.categoryId ?? 'none')}
					{@const pct = s.totalBaseCents / totalExpense}
					<li>
						<div class="flex items-baseline justify-between gap-2">
							<span class="inline-flex items-center gap-2 font-display text-sm font-bold uppercase">
								<span
									class="size-3 border-2 border-brutal"
									style="background-color: {s.categoryColor}"
									aria-hidden="true"
								></span>
								{s.categoryName}
							</span>
							<span class="font-mono text-xs">{Math.round(pct * 100)}%</span>
						</div>
						<div class="mt-1 flex items-center gap-2">
							<div class="h-3 flex-1 border-3 border-brutal bg-brutal-paper">
								<div class="h-full" style="width: {pct * 100}%; background-color: {s.categoryColor}"></div>
							</div>
							<span class="font-mono text-xs">{formatMoney(s.totalBaseCents, data.baseCurrency)}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</BrutalCard>
</div>
