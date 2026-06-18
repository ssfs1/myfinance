/**
 * Global toast store. Svelte 5 runes-friendly: a simple subscribe-only
 * pattern exposed as a function-based API so callers don't have to think
 * about store semantics.
 */
import { writable } from 'svelte/store';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: string;
	tone: ToastTone;
	title: string;
	body?: string;
	durationMs: number;
}

const store = writable<Toast[]>([]);

function push(t: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }): void {
	const toast: Toast = {
		id: crypto.randomUUID(),
		durationMs: t.durationMs ?? 4000,
		tone: t.tone,
		title: t.title,
		body: t.body,
	};
	store.update((arr) => [...arr, toast]);
	setTimeout(() => dismiss(toast.id), toast.durationMs);
}

function dismiss(id: string): void {
	store.update((arr) => arr.filter((t) => t.id !== id));
}

export const toast = {
	subscribe: store.subscribe,
	push,
	dismiss,
	success: (title: string, body?: string) => push({ tone: 'success', title, body }),
	error: (title: string, body?: string) => push({ tone: 'error', title, body }),
	warning: (title: string, body?: string) => push({ tone: 'warning', title, body }),
	info: (title: string, body?: string) => push({ tone: 'info', title, body }),
};
