<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		label?: string;
		hint?: string;
		error?: string;
		prefix?: string;
		suffix?: string;
		class?: string;
	};

	let {
		label,
		hint,
		error,
		prefix,
		suffix,
		class: klass = '',
		id,
		...rest
	}: Props = $props();

	const inputId = $derived(id ?? `in-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={inputId} class="font-display text-sm font-bold uppercase tracking-wide">
			{label}
		</label>
	{/if}
	<div
		class={cn(
			'flex items-stretch border-3 border-brutal bg-brutal-paper',
			'focus-within:shadow-brutal-sm',
			error && 'border-brutal-coral',
		)}
	>
		{#if prefix}
			<span
				class="flex items-center border-r-3 border-brutal bg-brutal-cream px-3 font-mono text-sm font-bold"
			>
				{prefix}
			</span>
		{/if}
		<input
			id={inputId}
			class={cn(
				'w-full bg-transparent px-3 py-2.5 font-body text-brutal-ink',
				'placeholder:text-brutal-ink/40 placeholder:italic',
				'focus:outline-none',
				klass,
			)}
			{...rest}
		/>
		{#if suffix}
			<span
				class="flex items-center border-l-3 border-brutal bg-brutal-cream px-3 font-mono text-sm font-bold"
			>
				{suffix}
			</span>
		{/if}
	</div>
	{#if error}
		<p class="font-mono text-sm font-bold text-brutal-coral">{error}</p>
	{:else if hint}
		<p class="font-mono text-xs text-brutal-ink/60">{hint}</p>
	{/if}
</div>
