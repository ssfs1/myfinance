<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatMoney, formatHumanDate } from '$lib/utils/format';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let { data } = $props();

	const categoryById = $derived(Object.fromEntries(data.categories.map((c) => [c.id, c])));
	const accountById = $derived(Object.fromEntries(data.accounts.map((a) => [a.id, a])));

	async function applyFilters(e: Event) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const params = new URLSearchParams();
		const fd = new FormData(form);
		for (const [k, v] of fd.entries()) {
			if (typeof v === 'string' && v) params.set(k, v);
		}
		await goto(`?${params.toString()}`, { keepFocus: true });
	}

	function exportCsv() {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) {
			if (v) params.set(k, v);
		}
		window.location.href = `/api/transactions/export.csv?${params.toString()}`;
	}

	async function deleteTx(id: string) {
		if (!confirm('Delete this transaction?')) return;
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch('?/delete', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Deleted');
			await invalidateAll();
		} else toast.error('Failed to delete');
	}
</script>

<svelte:head>
	<title>Transactions · myfinance</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">Transactions</h1>
		<p class="mt-1 font-mono text-xs uppercase tracking-widest">
			{data.transactions.length} shown (cap 500)
		</p>
	</div>
	<div class="flex gap-2">
		<BrutalButton onclick={exportCsv} tone="paper">Export CSV</BrutalButton>
		<BrutalButton href="/app/transactions/new" tone="yellow">+ Add</BrutalButton>
	</div>
</header>

<BrutalCard tone="cream" padding="md">
	<form method="GET" class="grid items-end gap-3 md:grid-cols-5" onsubmit={applyFilters}>
		<label class="flex flex-col gap-1 font-display text-xs font-bold uppercase">
			From
			<input
				type="date"
				name="from"
				value={data.filters.from}
				class="border-3 border-brutal bg-brutal-paper px-2 py-1.5 font-mono text-sm"
			/>
		</label>
		<label class="flex flex-col gap-1 font-display text-xs font-bold uppercase">
			To
			<input
				type="date"
				name="to"
				value={data.filters.to}
				class="border-3 border-brutal bg-brutal-paper px-2 py-1.5 font-mono text-sm"
			/>
		</label>
		<label class="flex flex-col gap-1 font-display text-xs font-bold uppercase">
			Type
			<select
				name="type"
				value={data.filters.type}
				class="border-3 border-brutal bg-brutal-paper px-2 py-1.5 font-mono text-sm"
			>
				<option value="">All</option>
				<option value="income">Income</option>
				<option value="expense">Expense</option>
			</select>
		</label>
		<label class="flex flex-col gap-1 font-display text-xs font-bold uppercase">
			Category
			<select
				name="category"
				value={data.filters.category}
				class="border-3 border-brutal bg-brutal-paper px-2 py-1.5 font-mono text-sm"
			>
				<option value="">All</option>
				{#each data.categories as c (c.id)}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</label>
		<button
			type="submit"
			class="brutal-press border-3 border-brutal bg-brutal-yellow px-3 py-1.5 font-display text-sm font-bold uppercase"
		>
			Filter
		</button>
	</form>
</BrutalCard>

{#if data.transactions.length === 0}
	<div class="mt-6">
		<EmptyState
			title="No transactions yet"
			body="Try adjusting your filters, or add the first one."
			illustration="piggy"
		>
			{#snippet action()}
				<BrutalButton href="/app/transactions/new" tone="yellow">+ Add transaction</BrutalButton>
			{/snippet}
		</EmptyState>
	</div>
{:else}
	<BrutalCard tone="paper" padding="none" class="mt-6">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="border-b-3 border-brutal bg-brutal-cream text-left font-display text-xs uppercase">
					<tr>
						<th class="p-3">Date</th>
						<th class="p-3">Category</th>
						<th class="p-3">Account</th>
						<th class="p-3 text-right">Amount</th>
						<th class="p-3 text-right">Base</th>
						<th class="p-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y-3 divide-brutal">
					{#each data.transactions as t (t.id)}
						<tr>
							<td class="p-3 font-mono">{formatHumanDate(t.occurredOn, 'MMM d')}</td>
							<td class="p-3">
								<span class="inline-flex items-center gap-2">
									<span
										class="size-3 border-2 border-brutal"
										style="background-color: {categoryById[t.categoryId ?? '']?.color ?? '#FFF8E1'}"
										aria-hidden="true"
									></span>
									<span class="font-display font-bold uppercase"
										>{categoryById[t.categoryId ?? '']?.name ?? '—'}</span
									>
								</span>
							</td>
							<td class="p-3">{accountById[t.accountId]?.name ?? '—'}</td>
							<td
								class="p-3 text-right font-mono {t.type === 'income'
									? 'text-brutal-lime'
									: 'text-brutal-coral'}"
							>
								{t.type === 'income' ? '+' : '−'}{formatMoney(t.amountCents, t.currency)}
							</td>
							<td class="p-3 text-right font-mono text-brutal-ink/70">
								{formatMoney(t.amountBaseCents, 'USD')}
							</td>
							<td class="p-3 text-right">
								<button
									type="button"
									onclick={() => deleteTx(t.id)}
									class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
									aria-label="Delete transaction"
								>
									Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</BrutalCard>
{/if}
