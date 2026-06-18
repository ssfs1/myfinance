/**
 * Date / money formatting helpers. Keep locale-aware formatting centralized.
 */
import { format, parseISO } from 'date-fns';

export function todayISO(timezone = 'UTC'): string {
	// Returns YYYY-MM-DD for the user's local "today".
	const now = new Date();
	try {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(now);
	} catch {
		return now.toISOString().slice(0, 10);
	}
}

export function isoFromDate(date: Date): string {
	return format(date, 'yyyy-MM-dd');
}

export function parseISODate(value: string): Date {
	return parseISO(value);
}

export function formatHumanDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
	const date = typeof value === 'string' ? parseISO(value) : value;
	return format(date, pattern);
}

export function formatMoney(
	cents: number,
	currency: string,
	locale = 'en-US',
	options: Intl.NumberFormatOptions = {},
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		...options,
	}).format(cents / 100);
}

export function formatSignedMoney(
	cents: number,
	currency: string,
	locale = 'en-US',
): string {
	const sign = cents < 0 ? '−' : '+';
	return `${sign}${formatMoney(Math.abs(cents), currency, locale)}`;
}

export function formatPercent(ratio: number, fractionDigits = 0): string {
	return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
