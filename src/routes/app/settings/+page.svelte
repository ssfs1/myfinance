<script lang="ts">
	import BrutalButton from '$lib/components/brutal/BrutalButton.svelte';
	import BrutalCard from '$lib/components/brutal/BrutalCard.svelte';
	import BrutalInput from '$lib/components/brutal/BrutalInput.svelte';
	import BrutalSelect from '$lib/components/brutal/BrutalSelect.svelte';
	import BrutalModal from '$lib/components/brutal/BrutalModal.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let baseCurrency = $state(data.user?.baseCurrency ?? 'USD');
	let timezone = $state(data.user?.timezone ?? 'UTC');

	let showCreateAccount = $state(false);
	let showDelete = $state(false);
	let confirmText = $state('');

	let newAccountName = $state('');
	let newAccountCurrency = $state(data.user?.baseCurrency ?? 'USD');
	let newAccountOpening = $state('0');

	let pushBusy = $state(false);
	let pushState = $state<'unknown' | 'subscribed' | 'unsupported' | 'denied'>(
		data.pushEnabled ? 'subscribed' : 'unknown',
	);

	onMount(async () => {
		if (typeof window === 'undefined') return;
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			pushState = 'unsupported';
			return;
		}
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) pushState = 'subscribed';
		} catch (err) {
			console.warn('[push] status check failed', err);
		}
	});

	async function subscribePush() {
		if (!data.vapidPublicKey) {
			toast.error('Push not configured', 'Server is missing VAPID_PUBLIC_KEY');
			return;
		}
		pushBusy = true;
		try {
			const perm = await Notification.requestPermission();
			if (perm !== 'granted') {
				pushState = 'denied';
				toast.warning('Notifications blocked', 'Enable them in browser settings.');
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
			});
			const json = sub.toJSON();
			const res = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
			});
			if (!res.ok) throw new Error('subscribe failed');
			pushState = 'subscribed';
			toast.success('Notifications on');
		} catch (err) {
			console.error(err);
			toast.error('Could not enable notifications');
		} finally {
			pushBusy = false;
		}
	}

	async function unsubscribePush() {
		pushBusy = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await sub.unsubscribe();
				await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: sub.endpoint }),
				});
			}
			pushState = 'unknown';
			toast.success('Notifications off');
		} catch (err) {
			console.error(err);
			toast.error('Could not disable');
		} finally {
			pushBusy = false;
		}
	}

	function urlBase64ToUint8Array(base64String: string): Uint8Array {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		const out = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
		return out;
	}

	$effect(() => {
		if (form?.success) {
			toast.success('Saved');
			invalidateAll();
		}
		if (form?.accountDeleted) {
			toast.success('Account deleted');
			goto('/');
		}
		if (form?.error) toast.error('Could not save', form.error);
	});

	async function archiveAccount(id: string) {
		if (!confirm('Archive this account? Transactions remain.')) return;
		const fd = new FormData();
		fd.set('id', id);
		const res = await fetch('?/archiveAccount', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Archived');
			invalidateAll();
		}
	}

	async function deleteAccount() {
		if (confirmText !== 'delete my account') {
			toast.error('Type the confirmation phrase exactly.');
			return;
		}
		const fd = new FormData();
		fd.set('confirm', confirmText);
		const res = await fetch('?/deleteAccount', { method: 'POST', body: fd });
		if (res.ok) {
			toast.success('Account deleted');
			goto('/');
		} else {
			const j = await res.json().catch(() => ({}));
			toast.error(j.error ?? 'Failed');
		}
	}
</script>

<svelte:head>
	<title>Settings · myfinance</title>
</svelte:head>

<header class="mb-6">
	<h1 class="font-display text-4xl font-bold uppercase leading-none">Settings</h1>
</header>

<div class="grid gap-6 lg:grid-cols-2">
	<BrutalCard tone="paper" padding="lg">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">Profile</h2>
		{/snippet}
		<form method="POST" action="?/profile" class="flex flex-col gap-3">
			<BrutalSelect label="Base currency" name="baseCurrency" bind:value={baseCurrency}>
				{#each data.currencies as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</BrutalSelect>
			<BrutalSelect label="Timezone" name="timezone" bind:value={timezone}>
				{#each data.timezones as tz (tz)}
					<option value={tz}>{tz}</option>
				{/each}
			</BrutalSelect>
			<div class="mt-2 flex justify-end">
				<BrutalButton type="submit" tone="yellow">Save profile</BrutalButton>
			</div>
		</form>
	</BrutalCard>

	<BrutalCard tone={pushState === 'subscribed' ? 'lime' : 'cream'} padding="lg">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase">Notifications</h2>
		{/snippet}
		{#if pushState === 'unsupported'}
			<p class="font-mono text-sm">Your browser doesn't support Web Push.</p>
		{:else if pushState === 'denied'}
			<p class="font-mono text-sm">Notifications are blocked in your browser settings.</p>
		{:else if pushState === 'subscribed'}
			<p class="font-mono text-sm">✓ You'll get reminders for upcoming bills and budget alerts.</p>
			<div class="mt-3 flex justify-end">
				<BrutalButton onclick={unsubscribePush} tone="paper" loading={pushBusy}>Turn off</BrutalButton>
			</div>
		{:else}
			<p class="font-mono text-sm">Get a friendly ping before bills are due and when budgets get tight.</p>
			<div class="mt-3 flex justify-end">
				<BrutalButton
					onclick={subscribePush}
					tone="yellow"
					loading={pushBusy}
					disabled={!data.vapidPublicKey}
				>
					Enable notifications
				</BrutalButton>
			</div>
			{#if !data.vapidPublicKey}
				<p class="mt-2 font-mono text-xs text-brutal-coral">
					Server has no VAPID key. Set <code>VAPID_PUBLIC_KEY</code> and
					<code>VAPID_PRIVATE_KEY</code> in env.
				</p>
			{/if}
		{/if}
	</BrutalCard>

	<BrutalCard tone="paper" padding="lg" class="lg:col-span-2">
		{#snippet header()}
			<div class="flex items-center justify-between">
				<h2 class="font-display text-xl font-bold uppercase">Accounts</h2>
				<button
					type="button"
					onclick={() => (showCreateAccount = true)}
					class="brutal-press border-3 border-brutal bg-brutal-yellow px-3 py-1.5 text-xs font-bold uppercase"
				>
					+ New account
				</button>
			</div>
		{/snippet}
		<ul class="space-y-2">
			{#each data.accounts as a (a.id)}
				<li class="flex items-center gap-2 border-3 border-brutal bg-brutal-paper p-2">
					<span class="size-6 border-3 border-brutal bg-brutal-yellow" aria-hidden="true"></span>
					<div class="flex-1">
						<p class="font-display text-sm font-bold uppercase {a.archived ? 'opacity-50' : ''}">
							{a.name}{#if a.archived}<span class="font-mono text-xs"> (archived)</span>{/if}
						</p>
						<p class="font-mono text-xs">{a.currency} · opening {(a.openingBalanceCents / 100).toFixed(2)}</p>
					</div>
					{#if !a.archived}
						<button
							type="button"
							onclick={() => archiveAccount(a.id)}
							class="border-3 border-brutal bg-brutal-paper px-2 py-1 text-xs font-bold hover:bg-brutal-coral hover:text-brutal-paper"
						>
							Archive
						</button>
					{/if}
				</li>
			{:else}
				<li class="border-3 border-dashed border-brutal p-4 text-center font-mono text-sm">
					No accounts yet.
				</li>
			{/each}
		</ul>
	</BrutalCard>

	<BrutalCard tone="coral" padding="lg" class="lg:col-span-2">
		{#snippet header()}
			<h2 class="font-display text-xl font-bold uppercase text-brutal-paper">Danger zone</h2>
		{/snippet}
		<p class="font-mono text-sm">
			Deleting your account permanently removes every transaction, category, budget, recurring
			rule, account, push subscription, and audit log entry tied to your user. Auth.js accounts
			are removed too. This cannot be undone.
		</p>
		<div class="mt-4 flex justify-end">
			<BrutalButton onclick={() => (showDelete = true)} tone="paper">Delete account…</BrutalButton>
		</div>
	</BrutalCard>
</div>

<BrutalModal open={showCreateAccount} title="New account" onClose={() => (showCreateAccount = false)}>
	<form method="POST" action="?/createAccount" class="flex flex-col gap-3">
		<BrutalInput label="Name" name="name" bind:value={newAccountName} placeholder="e.g. Checking" required />
		<BrutalInput label="Currency" name="currency" bind:value={newAccountCurrency} maxlength="3" required />
		<BrutalInput
			label="Opening balance"
			name="openingBalance"
			type="number"
			step="0.01"
			bind:value={newAccountOpening}
			hint="For reference only — doesn't create a transaction."
		/>
	</form>
	{#snippet footer()}
		<BrutalButton onclick={() => (showCreateAccount = false)} tone="paper">Cancel</BrutalButton>
		<BrutalButton type="submit" tone="yellow" formaction="?/createAccount">Create</BrutalButton>
	{/snippet}
</BrutalModal>

<BrutalModal open={showDelete} title="Delete account" onClose={() => (showDelete = false)} size="md">
	<p class="font-mono text-sm">
		Type <code>delete my account</code> below to confirm. This is irreversible.
	</p>
	<input
		type="text"
		bind:value={confirmText}
		class="mt-3 w-full border-3 border-brutal bg-brutal-paper px-3 py-2 font-mono"
		placeholder="delete my account"
	/>
	{#snippet footer()}
		<BrutalButton onclick={() => (showDelete = false)} tone="paper">Cancel</BrutalButton>
		<BrutalButton onclick={deleteAccount} tone="coral" disabled={confirmText !== 'delete my account'}>
			Delete forever
		</BrutalButton>
	{/snippet}
</BrutalModal>
