<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Tab = {
		id: string;
		label: string;
		icon?: string;
	};

	type Props = {
		tabs: Tab[];
		active: string;
		onChange: (id: string) => void;
	};

	let { tabs, active, onChange }: Props = $props();
</script>

<div role="tablist" class="flex flex-wrap gap-2">
	{#each tabs as t (t.id)}
		<button
			role="tab"
			aria-selected={active === t.id}
			class={cn(
				'border-3 border-brutal px-4 py-2 font-display text-sm font-bold uppercase tracking-wide',
				'transition-transform duration-75 ease-brutal',
				active === t.id
					? 'bg-brutal-yellow shadow-brutal'
					: 'bg-brutal-paper shadow-brutal-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none',
			)}
			onclick={() => onChange(t.id)}
			type="button"
		>
			{t.label}
		</button>
	{/each}
</div>
