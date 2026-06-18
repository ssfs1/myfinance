<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import BrutalInput from '$lib/components/brutal/BrutalInput.svelte';
	import BrutalSelect from '$lib/components/brutal/BrutalSelect.svelte';
	import { todayISO } from '$lib/utils/format';

	let { data, form } = $props();

	let type = $state<'income' | 'expense'>('expense');
	let amount = $state('');
	let currency = $state(data.baseCurrency);
	let accountId = $state(data.accounts[0]?.id ?? '');
	let categoryId = $state<string>('');
	let occurredOn = $state(todayISO(data.timezone));
	let note = $state('');

	const categoriesForType = $derived(data.categories.filter((c) => c.type === type));
</script>

<svelte:head>
	<title>New transaction · myfinance</title>
</svelte:head>

<header class="mb-6">
	<a href="/app/transactions" class="font-mono text-xs uppercase underline">← Back</a>
	<h1 class="mt-2 font-display text-4xl font-bold uppercase leading-none">New transaction</h1>
</header>

<form method="POST" class="grid gap-6 lg:grid-cols-3">
	<BrutalCard tone="paper" padding="lg" class="lg:col-span-2">
		<div class="grid gap-4 md:grid-cols-2">
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
			<BrutalSelect label="Currency" name="currency" bind:value={currency}>
				{#each data.currencies as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</BrutalSelect>

			<BrutalInput label="Date" name="occurredOn" type="date" bind:value={occurredOn} required />
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
			<BrutalInput label="Note (optional)" name="note" bind:value={note} maxlength="280" />
		</div>

		{#if form?.error}
			<p class="mt-4 border-3 border-brutal bg-brutal-coral p-3 text-sm font-bold text-brutal-paper">
				{form.error}
			</p>
		{/if}
	</BrutalCard>

	<aside>
		<BrutalCard tone="cream">
			<h2 class="font-display text-lg font-bold uppercase">Heads up</h2>
			<ul class="mt-2 list-disc pl-5 text-sm">
				<li>
					Amounts in non-base currencies are converted at the rate on the
					<strong>transaction date</strong>, not today.
				</li>
				<li>FX rates come from ECB via Frankfurter (no key needed).</li>
				<li>Base currency is set in Settings.</li>
			</ul>
			<div class="mt-6 flex gap-2">
				<BrutalButton href="/app/transactions" tone="paper">Cancel</BrutalButton>
				<BrutalButton type="submit" tone="yellow">Save</BrutalButton>
			</div>
		</BrutalCard>
	</aside>
</form>
