/**
 * Cadence math for recurring transactions.
 *
 * Stored/computed dates are always `YYYY-MM-DD` strings (no timezone).
 * Day-of-month clamping handles month-end edge cases (e.g. monthly on the
 * 31st → Feb 28/29). DST/leap-year handled by `date-fns`.
 */
import { addDays, addMonths, addYears, format, parseISO, isAfter } from 'date-fns';

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface AdvanceOptions {
	cadence: Cadence;
	intervalN: number;
	startDate: string; // YYYY-MM-DD
	endDate: string | null; // YYYY-MM-DD or null
}

function clampDay(year: number, monthIndex: number, day: number): number {
	// monthIndex is 0-based. Returns the last valid day of that month.
	const lastDay = new Date(year, monthIndex + 1, 0).getDate();
	return Math.min(day, lastDay);
}

/**
 * Advance a date by the given cadence/interval. For monthly/yearly, clamps
 * the day to the last day of the target month to handle Jan 31 → Feb 28.
 */
export function advanceDate(currentIso: string, opts: AdvanceOptions): string {
	const current = parseISO(currentIso);
	const interval = Math.max(1, opts.intervalN);
	let next: Date;

	switch (opts.cadence) {
		case 'daily':
			next = addDays(current, interval);
			break;
		case 'weekly':
			next = addDays(current, interval * 7);
			break;
		case 'biweekly':
			next = addDays(current, interval * 14);
			break;
		case 'monthly': {
			const day = current.getUTCDate();
			const target = addMonths(current, interval);
			const clamped = clampDay(target.getUTCFullYear(), target.getUTCMonth(), day);
			next = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), clamped));
			break;
		}
		case 'yearly': {
			const day = current.getUTCDate();
			const target = addYears(current, interval);
			const clamped = clampDay(target.getUTCFullYear(), target.getUTCMonth(), day);
			next = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), clamped));
			break;
		}
	}

	return format(next, 'yyyy-MM-dd');
}

/**
 * Returns true if `currentIso` is strictly after `compareIso` (string-compare
 * works for `YYYY-MM-DD`).
 */
export function isAfterIso(currentIso: string, compareIso: string): boolean {
	return currentIso > compareIso;
}

/**
 * Generate every due date from `fromIso` forward up to (and including the
 * first one after) `untilIso`. Stops at `endDate` if provided.
 */
export function expandDueDates(
	fromIso: string,
	untilIso: string,
	opts: AdvanceOptions,
): string[] {
	const out: string[] = [];
	let cursor = fromIso;
	const hardStop = opts.endDate ?? untilIso;

	while (cursor <= hardStop && cursor <= untilIso) {
		out.push(cursor);
		cursor = advanceDate(cursor, opts);
	}

	return out;
}

export { isAfter };
