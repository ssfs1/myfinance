<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	type Props = {
		open: boolean;
		title?: string;
		onClose: () => void;
		children?: Snippet;
		footer?: Snippet;
		size?: 'sm' | 'md' | 'lg';
	};

	let { open, title, onClose, children, footer, size = 'md' }: Props = $props();

	const widths = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-2xl',
	};

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-brutal-ink/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		onclick={handleBackdrop}
	>
		<div
			class={cn(
				'w-full border-3 border-brutal bg-brutal-paper shadow-brutal-xl',
				widths[size],
			)}
		>
			{#if title}
				<header class="border-b-3 border-brutal bg-brutal-yellow px-5 py-3">
					<h2 class="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
				</header>
			{/if}
			<div class="p-5">
				{@render children?.()}
			</div>
			{#if footer}
				<footer class="flex justify-end gap-3 border-t-3 border-brutal bg-brutal-cream px-5 py-3">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
