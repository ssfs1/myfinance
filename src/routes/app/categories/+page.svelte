<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import BrutalInput from '$lib/components/brutal/BrutalInput.svelte';
	import BrutalSelect from '$lib/components/brutal/BrutalSelect.svelte';
	import BrutalModal from '$lib/components/brutal/BrutalModal.svelte';
	import { toast } from '$lib/stores/toast';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let showCreate = $state(false);
	let editing = $state<(typeof data.categories)[number] | null>(null);

	const COLORS = ['#FFEB3A', '#FF7AB6', '#B5E853', '#5BC8FF', '#FF6F61', '#B69CFF', '#FFF8E1', '#111111'];

	const income = $derived(data.categories.filter((c) => c.type === 'income' && !c.archived));
	const expense = $derived(data.categories.filter((c) => c.type === 'expense' && !c.archived));
	const archived = $derived(data.categories.filter((c) => c.archived));

	let createType = $state<'income' | 'expense'>('expense');
	let createName = $state('');
	let createColor = $state('#FFEB3A');

	let editName = $state('');
	let editType = $state<'income' | 'expense'>('expense');
	let editColor = $state('#FFEB3A');

	$effect(() => {
		if (editing) {
			editName = editing.name;
			editType = editing.type;
			editColor = editing.color;
		}
	});

	$effect(() => {
		if (form?.success) {
			toast.success('Saved');
			showCreate = false;
			editing = null;
			invalidateAll();
		} else if (form?.error) {
			toast.error('Could not save', form.error);
		}
	});

	async function archive(id: string) {
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch('?/archive', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Archived');
			await invalidateAll();
		} else toast.error('Failed');
	}

	async function restore(id: string) {
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch('?/restore', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Restored');
			await invalidateAll();
		} else toast.error('Failed');
	}
</script>

<svelte:head>
	<title>Categories · myfinance</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-4xl font-bold uppercase leading-none">Categories</h1>
		<p class="mt-1 font-mono text-xs uppercase tracking-widest">
			{data.categories.length} total · {archived.length} archived
		</p>
	</div>
	<BrutalButton onclick={() => (showCreate = true)} tone="yellow" size="md">+ New category</BrutalButton>
</header>

<div class="grid gap-6 lg:grid-cols-2">
	<BrutalCard tone="lime">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">Income</h2>
		{/snippet}
		<ul class="flex flex-col gap-2">
			{#each income as c (c.id)}
				<li class="flex items-center gap-2 border-3 border-brutal bg-brutal-paper p-2">
					<span
						class="size-6 shrink-0 border-3 border-brutal"
						style="background-color: {c.color}"
						aria-hidden="true"
					></span>
					<span class="flex-1 font-display text-sm font-bold uppercase">{c.name}</span>
					{#if c.isDefault}
						<span class="border-3 border-brutal bg-brutal-cream px-2 py-0.5 font-mono text-xs">default</span>
					{/if}
					<button
						type="button"
						onclick={() => (editing = c)}
						class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-cream"
						aria-label="Edit {c.name}"
					>
						Edit
					</button>
					{#if !c.isDefault}
						<button
							type="button"
							onclick={() => archive(c.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
							aria-label="Archive {c.name}"
						>
							Archive
						</button>
					{/if}
				</li>
			{:else}
				<li class="border-3 border-dashed border-brutal p-4 text-center font-mono text-sm">
					No income categories.
				</li>
			{/each}
		</ul>
	</BrutalCard>

	<BrutalCard tone="coral">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">Expense</h2>
		{/snippet}
		<ul class="flex flex-col gap-2">
			{#each expense as c (c.id)}
				<li class="flex items-center gap-2 border-3 border-brutal bg-brutal-paper p-2">
					<span
						class="size-6 shrink-0 border-3 border-brutal"
						style="background-color: {c.color}"
						aria-hidden="true"
					></span>
					<span class="flex-1 font-display text-sm font-bold uppercase">{c.name}</span>
					{#if c.isDefault}
						<span class="border-3 border-brutal bg-brutal-cream px-2 py-0.5 font-mono text-xs">default</span>
					{/if}
					<button
						type="button"
						onclick={() => (editing = c)}
						class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-cream"
						aria-label="Edit {c.name}"
					>
						Edit
					</button>
					{#if !c.isDefault}
						<button
							type="button"
							onclick={() => archive(c.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
							aria-label="Archive {c.name}"
						>
							Archive
						</button>
					{/if}
				</li>
			{:else}
				<li class="border-3 border-dashed border-brutal p-4 text-center font-mono text-sm">
					No expense categories.
				</li>
			{/each}
		</ul>
	</BrutalCard>
</div>

{#if archived.length}
	<section class="mt-8">
		<h2 class="mb-3 font-display text-xl font-bold uppercase">Archived</h2>
		<ul class="flex flex-wrap gap-2">
			{#each archived as c (c.id)}
				<li class="flex items-center gap-2 border-3 border-brutal bg-brutal-cream p-2">
					<span
						class="size-5 shrink-0 border-3 border-brutal opacity-50"
						style="background-color: {c.color}"
						aria-hidden="true"
					></span>
					<span class="font-display text-sm font-bold uppercase opacity-70">{c.name}</span>
					<button
						type="button"
						onclick={() => restore(c.id)}
						class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-lime"
					>
						Restore
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
