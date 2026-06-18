<script lang="ts">
	import { page } from '$app/state';
	import { signOut } from '@auth/sveltekit/client';

	const items = [
		{ href: '/app', label: 'Dashboard', icon: '🏠' },
		{ href: '/app/transactions', label: 'Transactions', icon: '💸' },
		{ href: '/app/recurring', label: 'Recurring', icon: '🔁' },
		{ href: '/app/categories', label: 'Categories', icon: '🏷️' },
		{ href: '/app/budgets', label: 'Budgets', icon: '📊' },
		{ href: '/app/reports', label: 'Reports', icon: '📈' },
		{ href: '/app/import', label: 'Import', icon: '⬆️' },
		{ href: '/app/settings', label: 'Settings', icon: '⚙️' },
	];

	function isActive(href: string): boolean {
		if (href === '/app') return page.url.pathname === '/app' || page.url.pathname === '/app/';
		return page.url.pathname.startsWith(href);
	}

	function handleSignOut(event: Event) {
		event.preventDefault();
		signOut({ callbackUrl: '/' });
	}
</script>

<nav class="border-b-3 border-brutal bg-brutal-yellow">
	<div class="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3">
		<a
			href="/app"
			class="mr-3 inline-flex items-center gap-2 border-3 border-brutal bg-brutal-paper px-3 py-2 shadow-brutal-sm"
		>
			<span class="text-lg">💰</span>
			<span class="font-display text-base font-bold uppercase tracking-wide">myfinance</span>
		</a>
		{#each items as item (item.href)}
			<a
				href={item.href}
				class="inline-flex shrink-0 items-center gap-1.5 border-3 border-brutal px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-transform duration-75 ease-brutal hover:translate-x-[1px] hover:translate-y-[1px] {isActive(
					item.href,
				)
					? 'bg-brutal-paper shadow-brutal'
					: 'bg-brutal-cream shadow-brutal-sm'}"
			>
				<span aria-hidden="true">{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
		<div class="ml-auto flex items-center gap-2">
			<button
				type="button"
				onclick={handleSignOut}
				class="border-3 border-brutal bg-brutal-paper px-3 py-2 font-display text-sm font-bold uppercase tracking-wide shadow-brutal-sm transition-transform duration-75 ease-brutal hover:translate-x-[1px] hover:translate-y-[1px]"
			>
				Sign out
			</button>
		</div>
	</div>
</nav>
