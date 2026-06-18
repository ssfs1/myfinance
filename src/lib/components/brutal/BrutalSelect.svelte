<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Props = HTMLSelectAttributes & {
		label?: string;
		hint?: string;
		error?: string;
		children?: Snippet;
		class?: string;
	};

	let { label, hint, error, children, class: klass = '', id, ...rest }: Props = $props();
	const inputId = $derived(id ?? `sel-${Math.random().toString(36).slice(2, 9)}`);
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
		<select
			id={inputId}
			class={cn(
				'w-full appearance-none bg-transparent px-3 py-2.5 font-body text-brutal-ink',
				'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%23000%27%3E%3Cpath%20d%3D%27M5%208l5%205%205-5z%27%2F%3E%3C%2Fsvg%3E")] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10',
				'focus:outline-none',
				klass,
			)}
			{...rest}
		>
			{@render children?.()}
		</select>
	</div>
	{#if error}
		<p class="font-mono text-sm font-bold text-brutal-coral">{error}</p>
	{:else if hint}
		<p class="font-mono text-xs text-brutal-ink/60">{hint}</p>
	{/if}
</div>
