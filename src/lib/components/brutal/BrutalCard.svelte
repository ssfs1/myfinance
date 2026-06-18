<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Tone = 'paper' | 'cream' | 'yellow' | 'pink' | 'lime' | 'sky' | 'violet';

	type Props = {
		tone?: Tone;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		interactive?: boolean;
		children?: Snippet;
		header?: Snippet;
		footer?: Snippet;
		class?: string;
	};

	let {
		tone = 'paper',
		padding = 'md',
		interactive = false,
		children,
		header,
		footer,
		class: klass = '',
	}: Props = $props();

	const tones: Record<Tone, string> = {
		paper: 'bg-brutal-paper',
		cream: 'bg-brutal-cream',
		yellow: 'bg-brutal-yellow',
		pink: 'bg-brutal-pink',
		lime: 'bg-brutal-lime',
		sky: 'bg-brutal-sky',
		violet: 'bg-brutal-violet',
	};

	const pads = {
		none: '',
		sm: 'p-3',
		md: 'p-5',
		lg: 'p-7',
	};
</script>

<section
	class={cn(
		'border-3 border-brutal shadow-brutal',
		tones[tone],
		pads[padding],
		interactive &&
			'cursor-pointer transition-transform duration-75 ease-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm',
		klass,
	)}
>
	{#if header}
		<header class="mb-3 border-b-3 border-brutal pb-2">
			{@render header()}
		</header>
	{/if}
	{@render children?.()}
	{#if footer}
		<footer class="mt-4 border-t-3 border-brutal pt-3">
			{@render footer()}
		</footer>
	{/if}
</section>
