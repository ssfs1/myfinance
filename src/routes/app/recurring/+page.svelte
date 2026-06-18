<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import BrutalModal from '$lib/components/brutal/BrutalModal.svelte';
	import BrutalInput from '$lib/components/brutal/BrutalInput.svelte';
	import BrutalSelect from '$lib/components/brutal/BrutalSelect.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatMoney, formatHumanDate, todayISO } from '$lib/utils/format';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let showCreate = $state(false);
	let type = $state<'income' | 'expense'>('expense');
	let amount = $state('');
	let currency = $state('USD');
	let accountId = $state(data.accounts[0]?.id ?? '');
	let categoryId = $state<string>('');
	let cadence = $state<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('monthly');
	let intervalN = $state('1');
	let startDate = $state(todayISO());
	let endDate = $state('');
	let note = $state('');

	const categoriesForType = $derived(data.categories.filter((c) => c.type === type));

	$effect(() => {
		if (form?.success) {
			toast.success('Saved');
			showCreate = false;
			invalidateAll();
		} else if (form?.error) {
			toast.error('Could not save', form.error);
		}
	});

	async function postAction(action: string, id: string) {
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Updated');
			await invalidateAll();
		} else toast.error('Failed');
	}
</script>

<svelte:head>
	<title>Recurring · myfinance</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">Recurring</h1>
		<p class="mt-1 font-mono text-xs uppercase tracking-widest">
			{data.rules.filter((r) => !r.isPaused).length} active · {data.rules.filter((r) => r.isPaused).length} paused
		</p>
	</div>
	<BrutalButton onclick={() => (showCreate = true)} tone="yellow">+ New rule</BrutalButton>
</header>

{#if data.rules.length === 0}
	<EmptyState
		title="No recurring rules"
		body="Bills and paychecks land on the right day automatically."
		illustration="piggy"
	>
		{#snippet action()}
			<BrutalButton onclick={() => (showCreate = true)} tone="yellow">+ Create your first rule</BrutalButton>
		{/snippet}
	</EmptyState>
{:else}
	<div class="grid gap-3 md:grid-cols-2">
		{#each data.rules as r (r.id)}
			<BrutalCard tone={r.isPaused ? 'cream' : r.type === 'income' ? 'lime' : 'coral'}>
				<div class="flex items-baseline justify-between gap-2">
					<h3 class="font-display text-lg font-bold uppercase">
						{data.categories.find((c) => c.id === r.categoryId)?.name ?? 'Recurring'}
					</h3>
					<span class="border-3 border-brutal bg-brutal-paper px-2 py-0.5 font-mono text-xs uppercase">
						{r.cadence}
					</span>
				</div>
				<p class="mt-1 font-display text-2xl font-bold">
					{r.type === 'income' ? '+' : '−'}{formatMoney(r.amountCents, r.currency)}
				</p>
				<p class="mt-1 font-mono text-xs">
					Next: {formatHumanDate(r.nextDueDate)}{#if r.endDate}· until {formatHumanDate(r.endDate)}{/if}
				</p>
				{#if r.note}<p class="mt-2 text-sm">{r.note}</p>{/if}
				<div class="mt-3 flex flex-wrap gap-2">
					{#if r.isPaused}
						<button
							type="button"
							onclick={() => postAction('resume', r.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-lime"
						>
							Resume
						</button>
					{:else}
						<button
							type="button"
							onclick={() => postAction('pause', r.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-yellow"
						>
							Pause
						</button>
						<button
							type="button"
							onclick={() => postAction('skip', r.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-sky"
						>
							Skip next
						</button>
					{/if}
					<button
						type="button"
						onclick={() => {
							if (confirm('Delete this rule? Past transactions stay.')) postAction('delete', r.id);
						}}
						class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
					>
						Delete
					</button>
				</div>
			</BrutalCard>
		{/each}
	</div>
{/if}

<BrutalModal open={showCreate} title="New recurring rule" onClose={() => (showCreate = false)} size="lg">
	<form method="POST" action="?/create" class="grid gap-4 md:grid-cols-2">
		<div class="md:col-span-2">
			<p class="mb-2 font-display text-sm font-bold uppercase tracking-wide">Type</p>
			<div class="flex gap-2">
				<label
					class="flex-1 cursor-pointer border-3 border-brutal px-3 py-2 text-center font-display text-sm font-bold uppercase {type ===
					'expense'
						? 'bg-brutal-coral text-brutal-paper shadow-brutal'
						: 'bg-brutal-paper shadow-brutal-sm'}"
				>
					<input type="radio" name="type" value="expense" bind:group={type} class="sr-only" />
					Expense
				</label>
				<label
					class="flex-1 cursor-pointer border-3 border-brutal px-3 py-2 text-center font-display text-sm font-bold uppercase {type ===
					'income'
						? 'bg-brutal-lime shadow-brutal'
						: 'bg-brutal-paper shadow-brutal-sm'}"
				>
					<input type="radio" name="type" value="income" bind:group={type} class="sr-only" />
					Income
				</label>
			</div>
		</div>
		<BrutalInput label="Amount" name="amount" type="number" step="0.01" min="0" bind:value={amount} required />
		<BrutalInput label="Currency" name="currency" bind:value={currency} maxlength="3" required />
		<BrutalSelect label="Account" name="accountId" bind:value={accountId} required>
			{#each data.accounts as a (a.id)}
				<option value={a.id}>{a.name} ({a.currency})</option>
			{/each}
		</BrutalSelect>
		<BrutalSelect label="Category" name="categoryId" bind:value={categoryId}>
			<option value="">— Uncategorized —</option>
			{#each categoriesForType as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</BrutalSelect>
		<BrutalSelect label="Cadence" name="cadence" bind:value={cadence}>
			<option value="daily">Daily</option>
			<option value="weekly">Weekly</option>
			<option value="biweekly">Every 2 weeks</option>
			<option value="monthly">Monthly</option>
			<option value="yearly">Yearly</option>
		</BrutalSelect>
		<BrutalInput label="Interval (N)" name="intervalN" type="number" min="1" max="365" bind:value={intervalN} hint="Every N cadence units. e.g. 2 months = bi-monthly" />
		<BrutalInput label="Start date" name="startDate" type="date" bind:value={startDate} required />
		<BrutalInput label="End date (optional)" name="endDate" type="date" bind:value={endDate} />
		<BrutalInput label="Note (optional)" name="note" bind:value={note} maxlength="280" class="md:col-span-2" />
	</form>
	{#snippet footer()}
		<BrutalButton onclick={() => (showCreate = false)} tone="paper">Cancel</BrutalButton>
		<BrutalButton type="submit" tone="yellow" formaction="?/create">Create</BrutalButton>
	{/snippet}
</BrutalModal>
