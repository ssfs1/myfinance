<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		body?: string;
		illustration?: 'piggy' | 'empty';
		action?: Snippet;
		class?: string;
	};

	let { title, body, illustration = 'piggy', action, class: klass = '' }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-4 border-3 border-dashed border-brutal bg-brutal-paper p-10 text-center',
		klass,
	)}
>
	{#if illustration === 'piggy'}
		<svg viewBox="0 0 200 120" class="w-48 animate-wiggle" aria-hidden="true">
			<g stroke="#000" stroke-width="3" stroke-linejoin="round">
				<rect x="40" y="40" width="120" height="70" fill="#FFEB3A" />
				<rect x="60" y="20" width="80" height="40" fill="#FF7AB6" />
				<rect x="80" y="10" width="40" height="20" fill="#B5E853" />
				<circle cx="100" cy="75" r="8" fill="#000" />
				<path d="M85 90 Q100 100 115 90" fill="none" stroke-width="3" stroke-linecap="round" />
			</g>
		</svg>
	{:else}
		<svg viewBox="0 0 200 120" class="w-48" aria-hidden="true">
			<g stroke="#000" stroke-width="3" stroke-linejoin="round">
				<rect x="50" y="60" width="100" height="50" fill="#5BC8FF" />
				<path d="M50 60 L100 20 L150 60" fill="#FFEB3A" />
				<rect x="90" y="80" width="20" height="30" fill="#FFF" />
			</g>
		</svg>
	{/if}
	<h3 class="font-display text-2xl font-bold uppercase tracking-wide">{title}</h3>
	{#if body}
		<p class="max-w-md text-base">{body}</p>
	{/if}
	{#if action}
		{@render action()}
	{/if}
</div>
