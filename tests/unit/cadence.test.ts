import { describe, it, expect } from 'vitest';
import { advanceDate, expandDueDates, type Cadence } from '../../src/lib/utils/cadence';

describe('cadence.advanceDate', () => {
	it('advances daily by N', () => {
		expect(advanceDate('2026-06-15', { cadence: 'daily', intervalN: 1, startDate: '2026-06-15', endDate: null })).toBe('2026-06-16');
		expect(advanceDate('2026-06-15', { cadence: 'daily', intervalN: 7, startDate: '2026-06-15', endDate: null })).toBe('2026-06-22');
	});

	it('advances weekly by N', () => {
		expect(advanceDate('2026-06-15', { cadence: 'weekly', intervalN: 2, startDate: '2026-06-15', endDate: null })).toBe('2026-06-29');
	});

	it('advances biweekly by N', () => {
		expect(advanceDate('2026-06-15', { cadence: 'biweekly', intervalN: 1, startDate: '2026-06-15', endDate: null })).toBe('2026-06-29');
		expect(advanceDate('2026-06-15', { cadence: 'biweekly', intervalN: 2, startDate: '2026-06-15', endDate: null })).toBe('2026-07-13');
	});

	it('clamps monthly day-of-month (Jan 31 → Feb 28)', () => {
		expect(advanceDate('2026-01-31', { cadence: 'monthly', intervalN: 1, startDate: '2026-01-31', endDate: null })).toBe('2026-02-28');
	});

	it('clamps monthly for non-leap year (Jan 31, 2027 → Feb 28, 2027)', () => {
		expect(advanceDate('2027-01-31', { cadence: 'monthly', intervalN: 1, startDate: '2027-01-31', endDate: null })).toBe('2027-02-28');
	});

	it('handles Feb 29 leap year correctly (Mar 31 after Feb 29 in 2028)', () => {
		expect(advanceDate('2028-02-29', { cadence: 'monthly', intervalN: 1, startDate: '2028-02-29', endDate: null })).toBe('2028-03-29');
	});

	it('clamps monthly for N>1 across year boundary', () => {
		expect(advanceDate('2026-11-30', { cadence: 'monthly', intervalN: 3, startDate: '2026-11-30', endDate: null })).toBe('2027-02-28');
	});

	it('clamps yearly Feb 29 across non-leap year', () => {
		expect(advanceDate('2024-02-29', { cadence: 'yearly', intervalN: 1, startDate: '2024-02-29', endDate: null })).toBe('2025-02-28');
	});

	it('intervalN=0 falls back to 1', () => {
		expect(advanceDate('2026-06-15', { cadence: 'daily', intervalN: 0, startDate: '2026-06-15', endDate: null })).toBe('2026-06-16');
	});
});

describe('cadence.expandDueDates', () => {
	it('produces every due date up to and including first after today', () => {
		const opts = { cadence: 'monthly' as Cadence, intervalN: 1, startDate: '2026-04-10', endDate: null };
		const dates = expandDueDates('2026-04-10', '2026-07-04', opts);
		expect(dates).toEqual(['2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10']);
	});

	it('stops at endDate', () => {
		const opts = { cadence: 'monthly' as Cadence, intervalN: 1, startDate: '2026-04-10', endDate: '2026-06-10' };
		const dates = expandDueDates('2026-04-10', '2027-01-01', opts);
		expect(dates).toEqual(['2026-04-10', '2026-05-10', '2026-06-10']);
	});

	it('returns empty when from > until', () => {
		const opts = { cadence: 'weekly' as Cadence, intervalN: 1, startDate: '2026-06-15', endDate: null };
		expect(expandDueDates('2026-06-22', '2026-06-15', opts)).toEqual([]);
	});

	it('handles weekly across years', () => {
		const opts = { cadence: 'weekly' as Cadence, intervalN: 1, startDate: '2026-12-28', endDate: null };
		const dates = expandDueDates('2026-12-28', '2027-01-04', opts);
		expect(dates).toEqual(['2026-12-28', '2027-01-04']);
	});
});
