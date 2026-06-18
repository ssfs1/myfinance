<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';

	type Tone = 'yellow' | 'pink' | 'lime' | 'sky' | 'coral' | 'violet' | 'paper' | 'cream';

	type Props = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
		tone?: Tone;
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		loading?: boolean;
		children?: Snippet;
		class?: string;
	};

	let {
		tone = 'yellow',
		size = 'md',
		href,
		loading = false,
		disabled,
		children,
		class: klass = '',
		...rest
	}: Props = $props();

	const tones: Record<Tone, string> = {
		yellow: 'bg-brutal-yellow',
		pink: 'bg-brutal-pink',
		lime: 'bg-brutal-lime',
		sky: 'bg-brutal-sky',
		coral: 'bg-brutal-coral',
		violet: 'bg-brutal-violet',
		paper: 'bg-brutal-paper',
		cream: 'bg-brutal-cream',
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2.5 text-base',
		lg: 'px-5 py-3.5 text-lg',
	};

	const baseClass = $derived(
		cn(
			'inline-flex items-center justify-center gap-2 font-display font-bold',
			'border-3 border-brutal shadow-brutal',
			'transition-transform duration-75 ease-brutal',
			'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm',
			'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
			'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-brutal',
			'focus-visible:outline-4 focus-visible:outline-brutal-ink focus-visible:outline-offset-2',
			tones[tone],
			sizes[size],
			klass,
		),
	);
</script>

{#if href}
	<a {href} class={baseClass} aria-disabled={disabled || loading || undefined}>
		{#if loading}
			<span class="inline-block size-4 animate-spin border-3 border-brutal-ink border-t-transparent"></span>
		{/if}
		{@render children?.()}
	</a>
{:else}
	<button
		class={baseClass}
		disabled={disabled || loading}
		{...rest as HTMLButtonAttributes}
	>
		{#if loading}
			<span class="inline-block size-4 animate-spin border-3 border-brutal-ink border-t-transparent"></span>
		{/if}
		{@render children?.()}
	</button>
{/if}
