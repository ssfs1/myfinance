import { describe, it, expect } from 'vitest';
import { formatMoney, formatPercent, todayISO } from '../../src/lib/utils/format';

describe('format', () => {
	it('formats USD', () => {
		expect(formatMoney(12345, 'USD')).toBe('$123.45');
	});

	it('formats EUR with symbol', () => {
		const out = formatMoney(100000, 'EUR', 'en-US');
		expect(out.replace(/ /g, ' ').replace(/,/g, '')).toContain('1000');
		expect(out).toContain('€');
	});

	it('formats percent', () => {
		expect(formatPercent(0.123)).toBe('12%');
		expect(formatPercent(0.5, 1)).toBe('50.0%');
	});

	it('todayISO returns YYYY-MM-DD', () => {
		expect(todayISO('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
