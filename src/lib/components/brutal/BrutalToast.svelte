<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { cn } from '$lib/utils/cn';

	const toneStyles = {
		info: 'bg-brutal-sky',
		success: 'bg-brutal-lime',
		warning: 'bg-brutal-yellow',
		error: 'bg-brutal-coral text-brutal-paper',
	} as const;
</script>

<div
	class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3"
	aria-live="polite"
>
	{#each $toast as t (t.id)}
		<div
			class={cn(
				'pointer-events-auto border-3 border-brutal p-3 shadow-brutal animate-pop',
				toneStyles[t.tone],
			)}
			role="status"
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="font-display text-sm font-bold uppercase tracking-wide">{t.title}</p>
					{#if t.body}
						<p class="mt-1 text-sm">{t.body}</p>
					{/if}
				</div>
				<button
					class="border-3 border-brutal bg-brutal-paper px-2 py-0.5 text-xs font-bold"
					aria-label="Dismiss notification"
					onclick={() => toast.dismiss(t.id)}
					type="button"
				>
					✕
				</button>
			</div>
		</div>
	{/each}
</div>
