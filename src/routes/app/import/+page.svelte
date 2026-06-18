<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';

	let { data, form } = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
</script>

<svelte:head>
	<title>Import · myfinance</title>
</svelte:head>

<header class="mb-6">
	<h1 class="font-display text-4xl font-bold uppercase leading-none">Import</h1>
	<p class="mt-1 font-mono text-xs uppercase tracking-widest">
		Bring transactions in from a CSV. Re-imports of the same file are no-ops.
	</p>
</header>

<BrutalCard tone="paper" padding="lg">
	{#snippet header()}
		<h2 class="font-display text-xl font-bold uppercase">Expected columns</h2>
	{/snippet}
	<p class="font-mono text-sm">
		<code>date,type,account,category,amount,currency,note</code> — type is <code>income</code> or
		<code>expense</code>. Amount is a decimal in your currency. Account and category names must
		already exist (or be created in advance).
	</p>
	<form method="POST" action="?/preview" enctype="multipart/form-data" class="mt-6 flex flex-col gap-3">
		<input
			bind:this={fileInput}
			type="file"
			name="file"
			accept=".csv,text/csv"
			required
			class="border-3 border-brutal bg-brutal-paper p-3 font-mono text-sm file:mr-3 file:border-0 file:bg-brutal-yellow file:px-3 file:py-1.5 file:font-display file:font-bold file:uppercase"
		/>
		<div>
			<BrutalButton type="submit" tone="yellow">Preview import</BrutalButton>
		</div>
	</form>
</BrutalCard>

{#if form?.preview}
	<section class="mt-6">
		<BrutalCard tone={form.preview.errors.length > 0 ? 'yellow' : 'lime'}>
			{#snippet header()}
				<div class="flex items-center justify-between">
					<h2 class="font-display text-xl font-bold uppercase">Preview</h2>
					<span class="border-3 border-brutal bg-brutal-paper px-2 py-0.5 font-mono text-xs">
						{form.preview.valid} valid · {form.preview.errors.length} errors
					</span>
				</div>
			{/snippet}
			{#if form.preview.errors.length > 0}
				<details class="mb-4">
					<summary class="cursor-pointer font-display text-sm font-bold uppercase">Show errors</summary>
					<ul
						class="mt-2 max-h-48 overflow-y-auto border-3 border-brutal bg-brutal-paper p-2 font-mono text-xs"
					>
						{#each form.preview.errors.slice(0, 50) as e (e.row)}
							<li>Row {e.row}: {e.reason}</li>
						{/each}
						{#if form.preview.errors.length > 50}
							<li>… and {form.preview.errors.length - 50} more</li>
						{/if}
					</ul>
				</details>
			{/if}
			{#if form.preview.rows.length > 0}
				<form method="POST" action="?/commit" class="flex flex-col gap-3">
					<input type="hidden" name="fileHash" value={form.preview.fileHash} />
					<input
						type="hidden"
						name="csv"
						value={form.preview.rows
							.map((r) =>
								[r.date, r.type, r.account, r.category ?? '', r.amount, r.currency, r.note ?? '']
									.map((v) => `"${String(v).replace(/"/g, '""')}"`)
									.join(','),
							)
							.join('\n')}
					/>
					<p class="font-mono text-xs">Showing first {form.preview.rows.length} valid rows.</p>
					<details>
						<summary class="cursor-pointer font-display text-sm font-bold uppercase">Show preview</summary>
						<div class="mt-2 max-h-64 overflow-auto border-3 border-brutal bg-brutal-paper">
							<table class="w-full text-xs">
								<thead class="bg-brutal-cream">
									<tr>
										<th class="p-1 text-left">Date</th>
										<th class="p-1 text-left">Type</th>
										<th class="p-1 text-left">Account</th>
										<th class="p-1 text-left">Category</th>
										<th class="p-1 text-right">Amount</th>
										<th class="p-1 text-left">Currency</th>
									</tr>
								</thead>
								<tbody class="divide-y-2 divide-brutal">
									{#each form.preview.rows as r, i (i)}
										<tr>
											<td class="p-1 font-mono">{r.date}</td>
											<td class="p-1">{r.type}</td>
											<td class="p-1">{r.account}</td>
											<td class="p-1">{r.category ?? '—'}</td>
											<td class="p-1 text-right font-mono">{r.amount.toFixed(2)}</td>
											<td class="p-1">{r.currency}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</details>
					<div>
						<BrutalButton type="submit" tone="yellow">Commit {form.preview.valid} transaction(s)</BrutalButton>
					</div>
				</form>
			{:else}
				<p class="font-mono text-sm">Nothing valid to import.</p>
			{/if}
		</BrutalCard>
	</section>
{:else if form?.error}
	<section class="mt-6">
		<BrutalCard tone="coral">
			<p class="font-bold">{form.error}</p>
		</BrutalCard>
	</section>
{/if}
