<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import BrutalInput from '$lib/components/brutal/BrutalInput.svelte';
	import BrutalSelect from '$lib/components/brutal/BrutalSelect.svelte';
	import BrutalModal from '$lib/components/brutal/BrutalModal.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatMoney, formatPercent, todayISO } from '$lib/utils/format';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let showCreate = $state(false);
	let amount = $state('');
	let currency = $state(data.baseCurrency);
	let categoryId = $state<string>('');
	let period = $state<'weekly' | 'monthly' | 'yearly'>('monthly');
	let startDate = $state(todayISO());

	$effect(() => {
		if (form?.success) {
			toast.success('Saved');
			showCreate = false;
			invalidateAll();
		} else if (form?.error) toast.error('Could not save', form.error);
	});

	async function deleteBudget(id: string) {
		if (!confirm('Delete this budget?')) return;
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch('?/delete', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Deleted');
			await invalidateAll();
		} else toast.error('Failed');
	}

	function toneForRatio(r: number): 'lime' | 'yellow' | 'coral' {
		if (r < 0.8) return 'lime';
		if (r < 1) return 'yellow';
		return 'coral';
	}
</script>

<svelte:head>
	<title>Budgets · myfinance</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">Budgets</h1>
		<p class="mt-1 font-mono text-xs uppercase tracking-widest">
			{data.budgets.length} budget{data.budgets.length === 1 ? '' : 's'}
		</p>
	</div>
	<BrutalButton onclick={() => (showCreate = true)} tone="yellow">+ New budget</BrutalButton>
</header>

{#if data.budgets.length === 0}
	<EmptyState
		title="No budgets"
		body="Set a cap per category. We'll ping you when you're getting close."
		illustration="piggy"
	>
		{#snippet action()}
			<BrutalButton onclick={() => (showCreate = true)} tone="yellow">+ New budget</BrutalButton>
		{/snippet}
	</EmptyState>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each data.budgets as b (b.id)}
			{@const tone = toneForRatio(b.ratio)}
			<BrutalCard tone={tone}>
				<div class="flex items-baseline justify-between gap-2">
					<h2 class="font-display text-lg font-bold uppercase">
						{b.categoryId
							? data.categories.find((c) => c.id === b.categoryId)?.name ?? 'Budget'
							: 'Total'}
					</h2>
					<span class="border-3 border-brutal bg-brutal-paper px-2 py-0.5 font-mono text-xs uppercase">
						{b.period}
					</span>
				</div>
				<p class="mt-1 font-display text-2xl font-bold">
					{formatMoney(b.spentBaseCents, data.baseCurrency)}
					<span class="text-base text-brutal-ink/50">
						/ {formatMoney(b.amountCents, b.currency)}
					</span>
				</p>
				<div class="mt-2 h-4 border-3 border-brutal bg-brutal-paper">
					<div class="h-full bg-brutal-ink" style="width: {Math.min(100, b.ratio * 100)}%"></div>
				</div>
				<p class="mt-1 font-mono text-xs uppercase">{formatPercent(b.ratio)} used</p>
				<div class="mt-3 flex justify-end">
					<button
						type="button"
						onclick={() => deleteBudget(b.id)}
						class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
					>
						Delete
					</button>
				</div>
			</BrutalCard>
		{/each}
	</div>
{/if}

<BrutalModal open={showCreate} title="New budget" onClose={() => (showCreate = false)}>
	<form method="POST" action="?/create" class="flex flex-col gap-3">
		<BrutalSelect label="Category" name="categoryId" bind:value={categoryId}>
			<option value="">— All expenses (total) —</option>
			{#each data.categories as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</BrutalSelect>
		<BrutalInput label="Amount" name="amount" type="number" step="0.01" min="0" bind:value={amount} required />
		<BrutalInput label="Currency" name="currency" bind:value={currency} maxlength="3" required />
		<BrutalSelect label="Period" name="period" bind:value={period}>
			<option value="weekly">Weekly</option>
			<option value="monthly">Monthly</option>
			<option value="yearly">Yearly</option>
		</BrutalSelect>
		<BrutalInput label="Start date" name="startDate" type="date" bind:value={startDate} required />
	</form>
	{#snippet footer()}
		<BrutalButton onclick={() => (showCreate = false)} tone="paper">Cancel</BrutalButton>
		<BrutalButton type="submit" tone="yellow" formaction="?/create">Create</BrutalButton>
	{/snippet}
</BrutalModal>
